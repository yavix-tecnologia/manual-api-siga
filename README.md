# Manual de Integração — SIGA

Documentação pública de integração com a API do SIGA, publicada em
**<https://manual-siga-api.netlify.app>**.

Conteúdo: um tutorial de 10 minutos cobrindo o onboarding de colaborador
(cadastro → solicitação de exame → agendamento → guia), a tabela de erros com
onde se resolve cada um, e a referência completa dos 212 endpoints.

Feito com [Astro Starlight](https://starlight.astro.build) e publicado no
Netlify. (A primeira versão era Jekyll/GitHub Pages; o Pages da organização é
restrito, e o Netlify não limita o build.)

## Estrutura

```
src/content/docs/index.mdx        Início — o que é, como pegar a chave, o que NÃO cobre
src/content/docs/tutorial.mdx     Os 7 passos do onboarding, com abas por linguagem
src/content/docs/autenticacao.md  X-API-Key, permissões mínimas, rate limit, revogação
src/content/docs/erros.mdx        HTTP + recusas de negócio, cada uma com onde se corrige
src/pages/api.astro               Referência completa (Scalar em tela cheia)
public/openapi.json               Spec da API — GERADO, ver scripts/atualizar-spec.sh
exemplos/                         onboarding.js · onboarding.ts · onboarding.py
netlify.toml                      build, headers e redirects
```

## Atualizar a referência da API

A referência não é escrita à mão. Depois de uma release da API:

```bash
npm run spec                            # produção
git diff --stat public/openapi.json     # confira o que mudou
git commit -am "docs: spec da API vX.Y.Z"
```

O script deixa **só o servidor de produção** na lista `servers`: o Scalar usa o
primeiro como padrão, e um manual público apontando para `localhost` faria o
leitor copiar um exemplo que não funciona.

## Rodar o site local

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/, igual ao que o Netlify publica
```

## Rodar os exemplos

```bash
export SIGA_API_KEY="yvx_..."                     # chave de sandbox
export SIGA_API_BASE="https://api-siga.yavix.app"

node exemplos/onboarding.js
python exemplos/onboarding.py
npx tsx exemplos/onboarding.ts
```

## Regras deste repositório

Ele é **público**. Portanto:

- **nenhuma chave real**, nem em exemplo, nem em comentário, nem no histórico;
- **nenhum dado de cliente** — CNPJ, CPF, nome de empresa ou id de tenant reais;
- os exemplos usam ids no formato documentado (`org_…`, `pes_…`) com valores
  fictícios, e leem a chave de variável de ambiente.

Chave vazada em repositório público é chave revogada às pressas: a `X-API-Key`
do SIGA carrega **as permissões do perfil da pessoa** dona dela.
