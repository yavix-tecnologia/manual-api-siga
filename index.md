---
title: Início
layout: default
nav_order: 1
description: "Integre seu sistema ao SIGA: onboarding de colaborador e agendamento de exame ocupacional pela API."
---

# Integração com o SIGA

API REST para o seu sistema conversar com o SIGA — cadastro de colaboradores,
solicitação e agendamento de exames ocupacionais, e a guia do exame em PDF.
{: .fs-6 .fw-300 }

[Começar pelo tutorial de 10 minutos]({{ '/tutorial' | relative_url }}){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[Ver a referência completa]({{ '/referencia' | relative_url }}){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## O que dá para fazer

O caso coberto por este manual é o **onboarding**: um colaborador é admitido no
seu sistema de RH e, sem ninguém digitar nada duas vezes, ele nasce cadastrado no
SIGA com o exame admissional agendado e a guia pronta para impressão.

São sete chamadas. O tutorial mostra as sete, com a resposta de cada uma.

```
seu RH  ──►  POST /pessoas          colaborador cadastrado
        ──►  GET  /agendas/disponiveis   onde ele pode ser atendido
        ──►  POST /atendimentos      exame solicitado
        ──►  PATCH .../agendar       data marcada
        ──►  GET  .../documento      guia + ficha + ASO em PDF
```

## Como é a API

| | |
|---|---|
| **Estilo** | REST sobre JSON, `https://api-sst.yavix.app/api/v1` |
| **Autenticação** | um header: `X-API-Key: yvx_…` |
| **Documentação** | OpenAPI 3.1 gerado do código — 212 rotas, sempre em dia |
| **IDs** | TSID prefixado por entidade (`pes_`, `org_`, `agd_`) — legível em log |
| **Erros** | corpo padronizado com `error`, `message` e `timestamp` |
| **Paginação** | `page` / `size` em toda listagem, com `totalElements` e `hasNextPage` |
| **Limite** | opcional por token, com `X-RateLimit-*` e `Retry-After` no 429 |

## Como conseguir a chave

A chave é emitida pelo **administrador da sua conta** no SIGA, para uma pessoa —
e ela carrega **as permissões do perfil dessa pessoa**. Por isso a recomendação é
criar uma *pessoa de serviço* (algo como `integracao@suaempresa.com.br`) com um
perfil que tenha só o que a integração precisa.

O passo a passo, as permissões mínimas e o ciclo de vida da chave estão em
[Autenticação]({{ '/autenticacao' | relative_url }}).

## O que este manual **não** cobre

Dito na cara, para você não descobrir depois de escrever código:

- **Webhooks / callbacks.** A API não notifica seu sistema quando o exame muda de
  status — hoje o acompanhamento é por consulta (`GET /atendimentos`).
- **Importação em massa por planilha.** Existe (`/importacoes`), é outro caminho e
  tem regras próprias.
- **Resultado clínico e emissão do ASO assinado.** É passo do médico dentro do
  SIGA, não do integrador.
- **Cadastro de setores e cargos.** Tecnicamente possível, operacionalmente
  **não** — o [tutorial]({{ '/tutorial#passo-3' | relative_url }}) explica por quê,
  e é a parte mais importante deste manual.

## Precisa de ajuda

Ambiente de testes, chave de sandbox ou dúvida de contrato:
[suporte@yavix.com.br](mailto:suporte@yavix.com.br).
