/**
 * Onboarding completo no SIGA — cadastro do colaborador, solicitação do exame,
 * agendamento e download da guia.
 *
 * Node 18+ (fetch nativo, sem dependência).
 *
 *   export SIGA_API_KEY="yvx_..."
 *   node exemplos/onboarding.js
 *
 * O que este exemplo NÃO faz de propósito: criar setor ou cargo. Eles são o
 * endereço da matriz de riscos no SIGA — cargo criado pela integração aceita
 * vínculo mas nasce sem grade de exames, e o problema só aparece no ASO. Cargo
 * novo é pedido ao time de SST.
 */

const BASE = process.env.SIGA_API_BASE || 'https://api-sst.yavix.app';
const API_KEY = process.env.SIGA_API_KEY;

if (!API_KEY) {
  console.error('Defina SIGA_API_KEY. A chave nunca fica no código.');
  process.exit(1);
}

class SigaError extends Error {
  constructor(status, body, retryAfter) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }
}

async function siga(caminho, { method = 'GET', body, query } = {}) {
  const url = new URL(`${BASE}/api/v1${caminho}`);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    method,
    headers: {
      'X-API-Key': API_KEY,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const texto = await res.text();
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      /* resposta não-JSON: o texto cru já é a melhor pista */
    }
    throw new SigaError(res.status, json ?? { message: texto.slice(0, 200) }, res.headers.get('Retry-After'));
  }

  return res.status === 204 ? null : res.json();
}

/**
 * Retry só para 429, e esperando o que o servidor mandou esperar. 400, 403 e 422
 * não melhoram com repetição — pedem correção, e insistir só gasta cota.
 */
async function comRetry(fn, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof SigaError && e.status === 429 && i < tentativas - 1) {
        const espera = Number(e.retryAfter || 5) * 1000;
        console.warn(`  429 — aguardando ${espera / 1000}s (Retry-After)`);
        await new Promise((r) => setTimeout(r, espera));
        continue;
      }
      throw e;
    }
  }
}

async function main() {
  // 1. Empresa
  const orgs = await comRetry(() => siga('/organizacoes', { query: { search: 'Panifica', size: 5 } }));
  const org = orgs.content[0];
  if (!org) throw new Error('Empresa não encontrada — ajuste a busca.');
  console.log(`1. Empresa: ${org.nome} (${org.id})`);

  // 2. Setor e cargo — LEITURA. Se não existir o que você precisa, pare e peça
  //    ao time de SST; não crie.
  const setores = await siga('/setores', { query: { organizacaoId: org.id, ativo: true } });
  const setor = setores[0];
  if (!setor) throw new Error('Nenhum setor cadastrado nesta empresa. Peça o cadastro ao time de SST.');

  const cargos = await siga(`/setores/${setor.id}/cargos`);
  const cargo = cargos.find((c) => c.ativo);
  if (!cargo) throw new Error(`Setor "${setor.nome}" sem cargos. Peça o cadastro ao time de SST.`);
  console.log(`2. Setor ${setor.nome} · Cargo ${cargo.nome}`);

  // 3. Colaborador. Os seis campos abaixo são os que o atendimento exige depois.
  const matricula = `RH-${Date.now()}`;
  const pessoa = await comRetry(() =>
    siga('/pessoas', {
      method: 'POST',
      body: {
        nomeCompleto: 'Maria de Souza',
        cpf: '52998224725',
        dataNascimento: '1990-01-31',
        sexo: 'F',
        organizacaoId: org.id,
        codigoIntegracao: matricula,
        vinculo: { setorId: setor.id, cargoId: cargo.id },
      },
    }),
  );
  console.log(`3. Colaborador: ${pessoa.nomeCompleto} (${pessoa.id})`);

  // 4. Agendas que servem ESTE colaborador, já com a cobertura da grade dele.
  //    Esta rota aplica os mesmos recortes que o agendamento confere depois — o
  //    que aparece aqui é o que o passo 6 aceita — e ordena as de cobertura
  //    completa primeiro.
  const opcoes = await siga('/agendas/para-colaborador', { query: { pessoaId: pessoa.id } });
  const agenda = opcoes.agendas[0];
  if (!agenda) throw new Error('Nenhuma agenda liberada para esta empresa. Fale com o time de SST.');
  // Parar aqui é deliberado: uma clínica que atende só parte dos exames faz a
  // origem recusar o atendimento inteiro, e sobra um registro com erro para
  // limpar. Quase sempre é o exame que não está vinculado a clínica nenhuma.
  if (opcoes.nenhumaCompleta) {
    const falta = agenda.cobertura.faltantes.map((p) => p.nome).join(', ');
    throw new Error(`Nenhuma agenda cobre a grade inteira — falta: ${falta}. Fale com o time de SST.`);
  }
  console.log(`4. Agenda: ${agenda.nome} — ${agenda.clinicaNome}`);

  // 5. Atendimento. Sem `exames`, vale a grade recomendada pelo PCMSO para o
  //    setor e o cargo — que é o que se quer na maioria dos casos.
  let atendimento;
  try {
    atendimento = await comRetry(() =>
      siga('/atendimentos', {
        method: 'POST',
        body: { organizacaoId: org.id, pessoaId: pessoa.id, tipoExame: 'ADMISSIONAL' },
      }),
    );
  } catch (e) {
    if (e instanceof SigaError && e.status === 422) {
      // O 422 lista o que falta no CADASTRO — corrigir a pessoa, não o payload.
      console.error(`Cadastro incompleto: ${e.body.message}`);
      process.exit(1);
    }
    throw e;
  }
  console.log(`5. Atendimento: ${atendimento.id} (${atendimento.statusAtendimento})`);

  // 6. Agendamento. Com `agendaId` a clínica sai da agenda e o servidor confere
  //    liberação e abrangência.
  const agendado = await comRetry(() =>
    siga(`/atendimentos/${atendimento.id}/agendar`, {
      method: 'PATCH',
      body: {
        agendaId: agenda.id,
        clinicaNome: agenda.clinicaNome,
        dataAgendamento: proximoDiaUtil(),
        horaAgendamento: '08:00',
      },
    }),
  );
  console.log(`6. Agendado para ${agendado.dataAgendamento} ${agendado.horaAgendamento}`);

  console.log(`\nGuia: ${BASE}/api/v1/atendimentos/${atendimento.id}/documento`);
}

function proximoDiaUtil() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

main().catch((e) => {
  if (e instanceof SigaError) {
    console.error(`\nFalhou (${e.status}): ${e.message}`);
    if (e.status === 403) console.error('O perfil da chave não tem a permissão desta rota.');
    if (e.status === 401) console.error('Chave ausente, inválida ou revogada.');
  } else {
    console.error(`\n${e.message}`);
  }
  process.exit(1);
});
