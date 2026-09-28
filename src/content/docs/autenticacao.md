---
title: Autenticação
description: Como a X-API-Key funciona, quais permissões o perfil precisa ter, e o que acontece quando a cota estoura.
sidebar:
  order: 1
---

## Um header, e só

Toda chamada leva a chave no header `X-API-Key`:

```http
POST /api/v1/pessoas HTTP/1.1
Host: api-siga.yavix.app
X-API-Key: yvx_0QNQBJRD9JKVWXYZ_exemplo_nao_use_esta_chave
Content-Type: application/json
```

Não há troca de token, nem refresh, nem OAuth. A chave vale em **qualquer
endpoint** da API — não existe rota reservada ao login por usuário e senha.

## A chave herda o perfil da pessoa

Este é o ponto que mais gera surpresa, então vai antes de tudo:

:::caution[A chave não tem escopo próprio]
Ela executa com **exatamente as permissões do perfil de acesso da pessoa** dona
da chave. Uma chave emitida para alguém `admin` faz tudo o que um admin faz.
:::

## A chave tem um responsável, e isso é de propósito

A chave é emitida no nome de **uma pessoa real do seu quadro** — com CPF no
cadastro. Não usamos "usuário de serviço" sem dono: conta sem responsável vira
órfã, e um dia alguém olha a lista de acessos, não sabe o que aquilo é e desliga
— junto com a sua integração.

Com uma pessoa no nome, toda chamada da integração é rastreável até quem responde
por ela, e a auditoria (`chamadas_api_key`) tem a quem perguntar.

Duas recomendações práticas:

1. **Perfil enxuto.** Emita para alguém cujo perfil de acesso tenha só as
   permissões da lista abaixo. Se a pessoa precisa ser `admin` para o trabalho
   dela, peça ao administrador um perfil separado para a integração.
2. **Transferência, não abandono.** Quando o responsável sair da empresa ou trocar
   de função, **transfira**: o administrador emite a chave para o novo responsável
   e revoga a anterior. Chave órfã é chave que ninguém sabe desligar com
   segurança.

## Permissões mínimas para o fluxo de onboarding

| Permissão | Para quê |
|---|---|
| `organizacoes:listar` | achar a empresa pelo CNPJ ou nome |
| `setores:listar` | ler os setores da empresa |
| `cargos:listar` | ler os cargos do setor |
| `pessoas:listar` | verificar se o colaborador já existe |
| `pessoas:criar` | cadastrar o colaborador |
| `agendas:listar` | ver onde o exame pode ser marcado |
| `atendimentos:criar` | abrir a solicitação de exame |
| `atendimentos:editar` | agendar data e hora |
| `atendimentos:listar` | acompanhar e baixar a guia |

Faltando alguma, a resposta é **403** dizendo qual — não é preciso adivinhar.

## Ciclo de vida da chave

**Emissão** — `POST /api/v1/pessoas/{id}/token-api`, feito pelo administrador da
conta. Exige role `admin` ou `gerente_sst` mais a permissão `pessoas:token_api`.
O segredo aparece **uma única vez**: guarde no ato, não dá para consultar depois.

**Validade** — opcional. Sem data, a chave não expira e o controle é a revogação.
Com data, o máximo é 365 dias.

**Revogação** — `DELETE /api/v1/pessoas/{id}/token-api`, efeito imediato.
Desativar a pessoa ou trocar o perfil dela também vale na hora: o perfil é lido
do banco a cada requisição, não fica preso no token.

## Onde guardar

:::danger[Nunca versione a chave]
Nem no código, nem no front-end, nem num arquivo de exemplo. A chave carrega as
permissões de uma pessoa real da sua conta.
:::

Todos os exemplos deste manual leem a chave de variável de ambiente:

```bash
export SIGA_API_KEY="yvx_..."
export SIGA_API_BASE="https://api-siga.yavix.app"
```

## Limite de requisições

Opcional, definido por tenant. Quando ativo, toda resposta traz:

| Header | O que diz |
|---|---|
| `X-RateLimit-Limit` | requisições permitidas por minuto |
| `X-RateLimit-Remaining` | quantas sobraram na janela atual |
| `X-RateLimit-Reset` | quando a janela reinicia (epoch em segundos) |

Estourou, vem **429** com `Retry-After` em segundos. **Respeite o `Retry-After`**
em vez de tentar de novo em intervalo fixo — os exemplos deste manual fazem isso.

## Auditoria

Toda chamada autenticada por chave é registrada: quem, quando, qual rota, qual
status e quanto demorou. Isso vale a favor da sua integração — quando algo dá
errado, o suporte consegue ver exatamente a chamada que falhou.

## Testando a chave

A forma mais barata de saber se a chave está viva:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "X-API-Key: $SIGA_API_KEY" \
  "$SIGA_API_BASE/api/v1/tipos-exame"
```

`200` — tudo certo. `401` — chave ausente, inválida ou revogada. `403` — a chave é
válida, mas o perfil não tem a permissão daquela rota.

## Captação de leads: header `X-API-Leads`

A captação de leads tem um header próprio, `X-API-Leads`, e ele vale **só** em
duas rotas:

| Rota | Para quê |
|---|---|
| `POST /api/v1/leads` | cadastro de solicitação |
| `POST /api/v1/leads/{slug}` | captação por campanha (o `slug` é o código do formulário) |

Nas outras rotas o `X-API-Leads` é ignorado. As outras rotas de leads, como
listar e qualificar, usam o `X-API-Key` normal.

O `X-API-Leads` aceita um de dois valores:

1. **Token de leads da integração.** É entregue pela Yavix fora de banda. Não
   pertence a nenhuma pessoa e não tem perfil: o próprio token autoriza, e só
   nessas duas rotas. Ele fica configurado no servidor da API, não no banco. Por
   isso não aparece na tela de usuários e não pode ser revogado por lá. Para
   trocá-lo, peça à Yavix.
2. **A sua `X-API-Key` (`yvx_...`).** Nesse caso o perfil da pessoa dona da chave
   vale, e ele precisa ter a permissão `leads:criar`. Sem ela, a resposta é
   **403**.

```bash
curl -X POST "$SIGA_API_BASE/api/v1/leads/form-supermercados" \
  -H "X-API-Leads: $SIGA_LEADS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"ten_…","cnpj":"…","nomeCompleto":"…","cpf":"…","dataNascimento":"1990-01-31","sexo":"M","email":"…","telefoneCelular":"…"}'
```

### Em qual tenant o lead entra: campo `tenantId`

O corpo das duas rotas aceita o campo opcional **`tenantId`**, com o id do tenant
no formato `ten_...`.

| O que vem na chamada | Tenant em que o lead é gravado |
|---|---|
| `tenantId` preenchido | o tenant informado. O CNPJ só liga o lead a uma empresa **desse** tenant |
| sem `tenantId` e CNPJ de uma única empresa (só em `POST /api/v1/leads`) | o tenant dessa empresa |
| sem `tenantId`, em qualquer outro caso | **DOZE** |

- `tenantId` que não existe ou está inativo: **400** `TENANT_INVALIDO`.
- Com a `X-API-Key` de uma pessoa, o tenant precisa estar na hierarquia dela.
  Se não estiver: **403** `TENANT_ESCRITA_NEGADA`. O token de leads da
  integração aceita qualquer tenant ativo.

:::danger[Mudança incompatível em 28/09/2026 (API v0.5.4.0): `X-API-Token` virou `X-API-Leads`]
Até a v0.5.3.0 este header se chamava **`X-API-Token`**. O nome antigo foi
**removido sem período de transição**: desde a v0.5.4.0 a API **não aceita mais
`X-API-Token`**, nem com um token válido.

- **O token não mudou.** Só o nome do header. Para migrar, troque `X-API-Token`
  por `X-API-Leads` e mantenha o mesmo valor.
- **O que a chamada antiga recebe:** status **401**, com o código `HEADER_RENOMEADO` no campo `error`, para a integração conseguir identificar o caso:

  ```json
  {
    "error": "HEADER_RENOMEADO",
    "message": "O header X-API-Token foi renomeado para X-API-Leads. Envie o mesmo token em X-API-Leads.",
    "timestamp": "2026-09-28T15:00:00.000Z"
  }
  ```

- **A tentativa fica registrada** na auditoria. O suporte consegue ver quais
  integrações ainda mandam o header antigo.
- **Se os dois headers vierem juntos**, vale o `X-API-Leads` e o `X-API-Token` é
  ignorado.
- **Sem nenhum dos dois**, a resposta é **401** `X-API-Leads header obrigatório`.
:::
