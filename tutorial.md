---
title: Tutorial de 10 minutos
layout: default
nav_order: 3
---

# Onboarding completo em 10 minutos
{: .no_toc }

Do primeiro `curl` até a guia do exame em PDF. Sete chamadas, na ordem em que o
servidor as exige.
{: .fs-5 .fw-300 }

1. TOC
{:toc}

---

## Antes de começar

```bash
export SIGA_API_KEY="yvx_..."                    # ver Autenticação
export SIGA_API_BASE="https://api-sst.yavix.app"
```

O fluxo inteiro:

```
1. autenticar          GET  /tipos-exame
2. achar a empresa     GET  /organizacoes
3. ler setor e cargo   GET  /setores  ·  GET /setores/{id}/cargos
4. cadastrar pessoa    POST /pessoas
5. ver agendas         GET  /agendas/disponiveis
6. abrir atendimento   POST /atendimentos
7. agendar + guia      PATCH /atendimentos/{id}/agendar  ·  GET /atendimentos/{id}/documento
```

A ordem não é didática — é imposta pelo servidor. O passo 4 precisa do que o 3
devolve, e o passo 6 recusa se o 4 tiver ficado incompleto. Cada passo abaixo diz
o porquê.

---

## Passo 1 — Autenticar

Qualquer `GET` serve de teste. `tipos-exame` é o mais barato e ainda devolve algo
que você vai usar no passo 6.

```bash
curl -s -H "X-API-Key: $SIGA_API_KEY" \
  "$SIGA_API_BASE/api/v1/tipos-exame"
```

```json
[
  { "id": "tpe_0QNQBJRD9JKVW", "codigo": "ADMISSIONAL", "nome": "Admissional", "ordem": 1 },
  { "id": "tpe_0QNQBJRD9JKVX", "codigo": "PERIODICO",   "nome": "Periódico",   "ordem": 2 },
  { "id": "tpe_0QNQBJRD9JKVY", "codigo": "DEMISSIONAL", "nome": "Demissional", "ordem": 3 }
]
```

O catálogo é do seu tenant: se a sua conta tem um tipo próprio, ele aparece aqui.
Por isso o passo 6 valida contra **este catálogo**, e não contra uma lista fixa.

---

## Passo 2 — Achar a empresa

Colaborador pertence a uma empresa (organização). Busque pelo nome ou pelo CNPJ:

```bash
curl -s -H "X-API-Key: $SIGA_API_KEY" \
  "$SIGA_API_BASE/api/v1/organizacoes?search=Panifica&size=5"
```

```json
{
  "content": [
    {
      "id": "org_0QNQBJRD9JKVW",
      "nome": "Padaria do Zé",
      "razaoSocial": "Zé Panificação e Comércio LTDA",
      "cnpj": "11222333000144",
      "ativo": true
    }
  ],
  "page": 0, "size": 5, "totalElements": 1, "totalPages": 1,
  "hasNextPage": false, "hasPreviousPage": false
}
```

Guarde o `id` — ele aparece em quase todos os passos seguintes.

<div class="aviso aviso-ok" markdown="1">
**Dica de integração:** guarde o `org_…` no seu lado, associado ao CNPJ. Buscar
por nome a cada execução é frágil (nome muda); o id não muda.
</div>

---

## Passo 3 — Ler setor e cargo (e por que **não** criar)
{: #passo-3 }

O cadastro do colaborador precisa de um setor e de um cargo **que já existam**:

```bash
# setores da empresa
curl -s -H "X-API-Key: $SIGA_API_KEY" \
  "$SIGA_API_BASE/api/v1/setores?organizacaoId=org_0QNQBJRD9JKVW&ativo=true"

# cargos daquele setor
curl -s -H "X-API-Key: $SIGA_API_KEY" \
  "$SIGA_API_BASE/api/v1/setores/set_0QNQBJRD9JKVW/cargos"
```

```json
[
  { "id": "car_0QNQBJRD9JKVW", "nome": "Operador de Máquina", "codigoCbo": "8481-05", "ativo": true },
  { "id": "car_0QNQBJRD9JKVX", "nome": "Auxiliar de Produção", "codigoCbo": "7841-05", "ativo": true }
]
```

<div class="aviso aviso-erro" markdown="1">
**Não crie setores e cargos pela integração.**

Não é burocracia: no SIGA, setor e cargo são o **endereço da matriz de riscos** e
da **recomendação de exames**. É a partir deles que o sistema sabe quais exames o
PCMSO exige para aquela função.

Um cargo criado pela API existe, aceita vínculo e deixa o atendimento ser aberto
— só que **sem grade de exames**, porque ninguém parametrizou risco nenhum para
ele. O resultado é um colaborador indo à clínica sem os exames que deveria fazer,
e o erro só aparece no ASO, depois da consulta.

**Cargo ou setor novo é pedido ao time de SST**, que cadastra e parametriza a
matriz de riscos. Depois disso ele aparece nesta listagem e a integração segue
sozinha.
</div>

Se o cargo que você precisa não está na lista, **pare aqui** e trate como
pendência de cadastro — não contorne criando.

---

## Passo 4 — Cadastrar o colaborador

Seis campos são obrigatórios para que este colaborador possa ter exame:
**nome, CPF, data de nascimento, sexo, setor e cargo**. O RG é opcional.

<div class="abas" markdown="1">
<div class="abas-painel" data-lang="curl" markdown="1">
```bash
curl -s -X POST -H "X-API-Key: $SIGA_API_KEY" \
  -H "Content-Type: application/json" \
  "$SIGA_API_BASE/api/v1/pessoas" \
  -d '{
    "nomeCompleto": "Maria de Souza",
    "cpf": "52998224725",
    "dataNascimento": "1990-01-31",
    "sexo": "F",
    "numeroDocumentoAux": "12.345.678-9",
    "organizacaoId": "org_0QNQBJRD9JKVW",
    "codigoIntegracao": "RH-4471",
    "vinculo": {
      "setorId": "set_0QNQBJRD9JKVW",
      "cargoId": "car_0QNQBJRD9JKVW",
      "dataAdmissao": "2026-09-01"
    }
  }'
```
</div>
<div class="abas-painel" data-lang="JavaScript" markdown="1">
```js
const pessoa = await siga('/pessoas', {
  method: 'POST',
  body: {
    nomeCompleto: 'Maria de Souza',
    cpf: '52998224725',
    dataNascimento: '1990-01-31',
    sexo: 'F',
    numeroDocumentoAux: '12.345.678-9',
    organizacaoId: ORG_ID,
    codigoIntegracao: 'RH-4471',
    vinculo: { setorId: SETOR_ID, cargoId: CARGO_ID, dataAdmissao: '2026-09-01' },
  },
});
```
</div>
<div class="abas-painel" data-lang="Python" markdown="1">
```python
pessoa = siga("/pessoas", method="POST", body={
    "nomeCompleto": "Maria de Souza",
    "cpf": "52998224725",
    "dataNascimento": "1990-01-31",
    "sexo": "F",
    "numeroDocumentoAux": "12.345.678-9",
    "organizacaoId": ORG_ID,
    "codigoIntegracao": "RH-4471",
    "vinculo": {"setorId": SETOR_ID, "cargoId": CARGO_ID, "dataAdmissao": "2026-09-01"},
})
```
</div>
</div>

```json
{
  "id": "pes_0QNQBJRD9JKVW",
  "nomeCompleto": "Maria de Souza",
  "cpf": "52998224725",
  "organizacaoId": "org_0QNQBJRD9JKVW",
  "vinculo": { "setorId": "set_0QNQBJRD9JKVW", "cargoId": "car_0QNQBJRD9JKVW" },
  "ativo": true
}
```

**`codigoIntegracao` é seu amigo:** guarde ali a matrícula do seu sistema. É por
ele que você reencontra a pessoa depois sem depender do CPF.

<div class="aviso" markdown="1">
**CPF duplicado?** O CPF é único por empresa. Se o colaborador já existe, o
cadastro é recusado — antes de criar, procure:
`GET /pessoas?organizacaoId=org_…&search=52998224725`.
</div>

---

## Passo 5 — Ver onde o exame pode ser marcado

Não escolha clínica por texto. Pergunte quais **agendas** estão liberadas para a
empresa — a clínica vem junto, já validada:

```bash
curl -s -H "X-API-Key: $SIGA_API_KEY" \
  "$SIGA_API_BASE/api/v1/agendas/disponiveis?organizacaoId=org_0QNQBJRD9JKVW&tipoExameId=tpe_0QNQBJRD9JKVW"
```

```json
[
  {
    "id": "agd_0QNQBJRD9JKVW",
    "nome": "Unidade Centro — manhã",
    "clinicaId": "cln_0QNQBJRD9JKVW",
    "clinicaNome": "Clínica Exemplo — Unidade Centro",
    "duracaoPadraoMinutos": 30,
    "horarios": { "seg": [{ "inicio": "08:00", "fim": "12:00" }] },
    "tiposExameIds": [],
    "ativo": true
  }
]
```

Duas leituras importantes:

- **`tiposExameIds` vazio = a agenda aceita todos os tipos de exame.** Lista vazia
  não é "nenhum".
- Esta rota já aplica os dois recortes que o agendamento vai conferir depois: a
  agenda estar liberada para a empresa **e** a clínica atender aquela empresa.
  O que aparece aqui é o que o passo 7 aceita.

---

## Passo 6 — Abrir o atendimento

```bash
curl -s -X POST -H "X-API-Key: $SIGA_API_KEY" \
  -H "Content-Type: application/json" \
  "$SIGA_API_BASE/api/v1/atendimentos" \
  -d '{
    "organizacaoId": "org_0QNQBJRD9JKVW",
    "pessoaId": "pes_0QNQBJRD9JKVW",
    "tipoExame": "ADMISSIONAL"
  }'
```

```json
{
  "id": "atd_0QNQBJRD9JKVW",
  "statusAtendimento": "PENDENTE",
  "tipoExame": "ADMISSIONAL",
  "pessoaNomeCompleto": "Maria de Souza",
  "exames": ["[RECOMENDADOS]"],
  "criadoEm": "2026-09-01T12:00:00.000Z"
}
```

Sem a lista `exames`, o SIGA usa a **grade recomendada pelo PCMSO** para o
setor e o cargo do colaborador — que é o que você quer na maioria dos casos, e é
por isso que o passo 3 importa tanto.

### O erro que você vai encontrar

Se o cadastro do colaborador estiver incompleto, o atendimento é recusado — com a
lista do que falta:

```json
{
  "error": "Unprocessable Entity",
  "message": "Cadastro do colaborador incompleto para gerar o ASO — falta: CPF, cargo.",
  "timestamp": "2026-09-01T12:00:00.000Z"
}
```

**422 `COLABORADOR_INCOMPLETO`.** A recusa é proposital e vem cedo: sem CPF o
envio à clínica quebraria depois do exame já criado, e sem setor/cargo/sexo/data
de nascimento a grade de exames sai vazia ou sem o recorte por sexo e idade.
Corrija a pessoa (`PUT /pessoas/{id}`) e repita.

---

## Passo 7 — Agendar e baixar a guia

```bash
curl -s -X PATCH -H "X-API-Key: $SIGA_API_KEY" \
  -H "Content-Type: application/json" \
  "$SIGA_API_BASE/api/v1/atendimentos/atd_0QNQBJRD9JKVW/agendar" \
  -d '{
    "agendaId": "agd_0QNQBJRD9JKVW",
    "clinicaNome": "Clínica Exemplo — Unidade Centro",
    "dataAgendamento": "2026-09-08",
    "horaAgendamento": "08:00"
  }'
```

```json
{
  "id": "atd_0QNQBJRD9JKVW",
  "statusAtendimento": "AGENDADO",
  "agendaId": "agd_0QNQBJRD9JKVW",
  "clinicaAgendadaNome": "Clínica Exemplo — Unidade Centro",
  "dataAgendamento": "2026-09-08",
  "horaAgendamento": "08:00"
}
```

Mandando `agendaId`, **a clínica sai da agenda** — você não precisa acertar o id
dela — e o servidor confere as regras de liberação. As recusas possíveis estão em
[Erros]({{ '/erros' | relative_url }}), cada uma com onde se resolve.

A guia (Guia + Ficha Clínica + ASO) sai em HTML pronto para impressão:

```bash
curl -s -H "X-API-Key: $SIGA_API_KEY" \
  "$SIGA_API_BASE/api/v1/atendimentos/atd_0QNQBJRD9JKVW/documento" \
  -o guia.html
```

Pronto. Colaborador cadastrado, exame solicitado, data marcada e documento em
mãos — sem ninguém abrir o SIGA.

---

## O fluxo inteiro, em código

Arquivos completos, rodáveis, com tratamento de 422 e 429:

- [`exemplos/onboarding.js`](https://github.com/yavix-tecnologia/manual-api-siga/blob/main/exemplos/onboarding.js) — Node 18+, sem dependência
- [`exemplos/onboarding.ts`](https://github.com/yavix-tecnologia/manual-api-siga/blob/main/exemplos/onboarding.ts) — TypeScript, com os tipos das respostas
- [`exemplos/onboarding.py`](https://github.com/yavix-tecnologia/manual-api-siga/blob/main/exemplos/onboarding.py) — Python 3.9+, `requests`

```bash
export SIGA_API_KEY="yvx_..."
node exemplos/onboarding.js        # ou: python exemplos/onboarding.py
```

## Próximos passos

- [Erros e como resolver cada um]({{ '/erros' | relative_url }})
- [Referência completa da API]({{ '/referencia' | relative_url }})
