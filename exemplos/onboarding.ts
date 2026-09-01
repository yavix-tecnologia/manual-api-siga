/**
 * Onboarding completo no SIGA, com os tipos das respostas.
 *
 * Node 18+ · `npx tsx exemplos/onboarding.ts`
 *
 * Os tipos abaixo cobrem só os campos usados neste fluxo. Para os contratos
 * completos, gere a partir do spec:
 *
 *   npx openapi-typescript https://api-sst.yavix.app/openapi.json -o siga.d.ts
 *
 * O que este exemplo NÃO faz de propósito: criar setor ou cargo. Eles são o
 * endereço da matriz de riscos no SIGA — cargo criado pela integração aceita
 * vínculo mas nasce sem grade de exames, e o problema só aparece no ASO.
 */

const BASE = process.env.SIGA_API_BASE ?? 'https://api-sst.yavix.app';
const API_KEY = process.env.SIGA_API_KEY;

if (!API_KEY) {
  console.error('Defina SIGA_API_KEY. A chave nunca fica no código.');
  process.exit(1);
}

// --- Contratos usados neste fluxo ---

interface Pagina<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  hasNextPage: boolean;
}

interface Organizacao {
  id: string;
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
}

interface Setor {
  id: string;
  nome: string;
  organizacaoId: string | null;
  ativo: boolean;
}

interface Cargo {
  id: string;
  nome: string;
  ativo: boolean;
}

interface Pessoa {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
}

/** Lista de tipos de exame VAZIA significa "aceita todos" — não "nenhum". */
interface Agenda {
  id: string;
  nome: string;
  clinicaId: string;
  clinicaNome: string;
  tiposExameIds: string[];
  ativo: boolean;
}

interface Atendimento {
  id: string;
  statusAtendimento: 'PENDENTE' | 'AGENDADO' | 'REALIZADO' | 'NAO_COMPARECEU';
  dataAgendamento: string | null;
  horaAgendamento: string | null;
}

interface ErroSiga {
  error: string;
  message: string;
  timestamp: string;
}

class SigaError extends Error {
  constructor(
    readonly status: number,
    readonly body: Partial<ErroSiga>,
    readonly retryAfter: string | null,
  ) {
    super(body.message ?? `HTTP ${status}`);
  }
}

async function siga<T>(
  caminho: string,
  opcoes: { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  const url = new URL(`${BASE}/api/v1${caminho}`);
  for (const [k, v] of Object.entries(opcoes.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    method: opcoes.method ?? 'GET',
    headers: {
      'X-API-Key': API_KEY!,
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });

  if (!res.ok) {
    const texto = await res.text();
    let corpo: Partial<ErroSiga>;
    try {
      corpo = JSON.parse(texto) as ErroSiga;
    } catch {
      corpo = { message: texto.slice(0, 200) };
    }
    throw new SigaError(res.status, corpo, res.headers.get('Retry-After'));
  }

  return res.json() as Promise<T>;
}

/** Retry só para 429, respeitando o `Retry-After`. 4xx restante pede correção. */
async function comRetry<T>(fn: () => Promise<T>, tentativas = 3): Promise<T> {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof SigaError && e.status === 429 && i < tentativas - 1) {
        const espera = Number(e.retryAfter ?? 5) * 1000;
        console.warn(`  429 — aguardando ${espera / 1000}s (Retry-After)`);
        await new Promise((r) => setTimeout(r, espera));
        continue;
      }
      throw e;
    }
  }
  throw new Error('inalcançável');
}

function proximoDiaUtil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const orgs = await comRetry(() =>
    siga<Pagina<Organizacao>>('/organizacoes', { query: { search: 'Panifica', size: 5 } }),
  );
  const org = orgs.content[0];
  if (!org) throw new Error('Empresa não encontrada — ajuste a busca.');
  console.log(`1. Empresa: ${org.nome} (${org.id})`);

  const setores = await siga<Setor[]>('/setores', { query: { organizacaoId: org.id, ativo: true } });
  const setor = setores[0];
  if (!setor) throw new Error('Nenhum setor cadastrado. Peça o cadastro ao time de SST.');

  const cargos = await siga<Cargo[]>(`/setores/${setor.id}/cargos`);
  const cargo = cargos.find((c) => c.ativo);
  if (!cargo) throw new Error(`Setor "${setor.nome}" sem cargos. Peça o cadastro ao time de SST.`);
  console.log(`2. Setor ${setor.nome} · Cargo ${cargo.nome}`);

  const pessoa = await comRetry(() =>
    siga<Pessoa>('/pessoas', {
      method: 'POST',
      body: {
        nomeCompleto: 'Maria de Souza',
        cpf: '52998224725',
        dataNascimento: '1990-01-31',
        sexo: 'F',
        organizacaoId: org.id,
        codigoIntegracao: `RH-${Date.now()}`,
        vinculo: { setorId: setor.id, cargoId: cargo.id },
      },
    }),
  );
  console.log(`3. Colaborador: ${pessoa.nomeCompleto} (${pessoa.id})`);

  const agendas = await siga<Agenda[]>('/agendas/disponiveis', { query: { organizacaoId: org.id } });
  const agenda = agendas[0];
  if (!agenda) throw new Error('Nenhuma agenda liberada para esta empresa.');
  console.log(`4. Agenda: ${agenda.nome} — ${agenda.clinicaNome}`);

  let atendimento: Atendimento;
  try {
    atendimento = await comRetry(() =>
      siga<Atendimento>('/atendimentos', {
        method: 'POST',
        body: { organizacaoId: org.id, pessoaId: pessoa.id, tipoExame: 'ADMISSIONAL' },
      }),
    );
  } catch (e) {
    if (e instanceof SigaError && e.status === 422) {
      console.error(`Cadastro incompleto: ${e.body.message}`);
      process.exit(1);
    }
    throw e;
  }
  console.log(`5. Atendimento: ${atendimento.id} (${atendimento.statusAtendimento})`);

  const agendado = await comRetry(() =>
    siga<Atendimento>(`/atendimentos/${atendimento.id}/agendar`, {
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

main().catch((e: unknown) => {
  if (e instanceof SigaError) {
    console.error(`\nFalhou (${e.status}): ${e.message}`);
  } else {
    console.error(`\n${(e as Error).message}`);
  }
  process.exit(1);
});
