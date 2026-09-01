# Manual de Integração — SIGA

Documentação pública de integração com a API do SIGA, publicada em
**<https://yavix-tecnologia.github.io/manual-api-siga/>**.

Conteúdo: um tutorial de 10 minutos cobrindo o onboarding de colaborador
(cadastro → solicitação de exame → agendamento → guia), a tabela de erros com
onde se resolve cada um, e a referência completa dos 212 endpoints.

## Estrutura

```
index.md            Início — o que é, como conseguir a chave, o que NÃO cobre
tutorial.md         Os 7 passos do onboarding, com respostas reais
autenticacao.md     X-API-Key, permissões mínimas, rate limit, revogação
erros.md            HTTP + recusas de negócio, cada uma com onde se corrige
referencia.md       Renderiza api/openapi.json com Scalar
api/openapi.json    Spec da API — GERADO, ver scripts/atualizar-spec.sh
exemplos/           onboarding.js · onboarding.ts · onboarding.py (executáveis)
```

## Atualizar a referência da API

A referência não é escrita à mão. Depois de uma release da API:

```bash
./scripts/atualizar-spec.sh          # produção
git diff --stat api/openapi.json     # confira o que mudou
git commit -am "docs: spec da API vX.Y.Z"
```

## Rodar o site local

O GitHub Pages faz o build sozinho — isto é só para pré-visualizar:

```bash
bundle install
bundle exec jekyll serve   # http://127.0.0.1:4000/manual-api-siga/
```

## Rodar os exemplos

```bash
export SIGA_API_KEY="yvx_..."                     # chave de sandbox
export SIGA_API_BASE="https://api-sst.yavix.app"

node exemplos/onboarding.js
python exemplos/onboarding.py
npm install && npm run onboarding:ts
```

## Regras deste repositório

Ele é **público**. Portanto:

- **nenhuma chave real**, nem em exemplo, nem em comentário, nem no histórico;
- **nenhum dado de cliente** — CNPJ, CPF, nome de empresa ou id de tenant reais;
- os exemplos usam ids no formato documentado (`org_…`, `pes_…`) com valores
  fictícios, e leem a chave de variável de ambiente.

Chave vazada em repositório público é chave revogada às pressas: a `X-API-Key`
do SIGA carrega **as permissões do perfil da pessoa** dona dela.
