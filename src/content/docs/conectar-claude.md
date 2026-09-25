---
title: Conectar o Claude (MCP)
description: Como ligar o Claude ao SIGA pelo servidor MCP, com o token MCP do administrador geral, para consultas e relatórios em linguagem natural.
sidebar:
  order: 4
---

## O que é

O SIGA tem um servidor [MCP](https://modelcontextprotocol.io) em `/mcp`. Com ele,
o Claude (Claude Code, Claude Desktop ou um agente) consulta o SIGA direto e
responde perguntas como:

> Quantos atendimentos a empresa Cali teve hoje?

:::note[Somente leitura]
O servidor MCP **não altera nada** no SIGA. Consultas, contagens e relatórios,
sim; criar, editar ou excluir, não — nem com um token gerado sem "somente leitura".
:::

## Quem pode usar

O token MCP é exclusivo do **administrador geral da plataforma** (perfil admin no
tenant Doze). Ele enxerga exatamente o que esse usuário enxerga na tela: mesmas
empresas, mesmos tenants, mesmas permissões.

## 1. Gerar o token

1. No SIGA, abra **Administração → Usuários** e escolha o administrador geral.
2. No bloco **Token MCP**, defina a validade (máximo 365 dias) e deixe
   **Somente leitura** ligado.
3. Clique em **Gerar token MCP** e copie o token (`yvxmcp_…`). Ele não aparece de novo.

## 2. Conectar o Claude Code

```bash
claude mcp add --transport http siga https://api-sst.yavix.app/mcp \
  --header "Authorization: Bearer yvxmcp_SEU_TOKEN"
```

No ambiente de desenvolvimento, troque o host por `devapi-sst.yavix.app`.

Depois, em qualquer sessão do Claude Code, é só perguntar. Para conferir a
conexão, use `/mcp`.

## 3. Conectar o Claude Desktop

Em **Configurações → Desenvolvedor → Editar configuração**, acrescente:

```json
{
  "mcpServers": {
    "siga": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "https://api-sst.yavix.app/mcp",
        "--header", "Authorization: Bearer yvxmcp_SEU_TOKEN"
      ]
    }
  }
}
```

:::caution[Claude.ai no navegador]
O conector personalizado do Claude.ai exige OAuth, que o SIGA ainda não oferece.
Use o Claude Code ou o Claude Desktop.
:::

## O que o Claude consegue consultar

49 consultas sobre **empresas, pessoas e dependentes, atendimentos e exames,
dashboard, tarefas (cards), quadros e métricas, e tenants** — cada uma é um
endpoint da API, com os mesmos filtros. Além delas, o Claude lê um guia de
consultas, glossários de atendimentos e de tarefas, e quem é o dono do token.

## Segurança

- Cada consulta do Claude é registrada na auditoria (`chamadas_api_key`) com o
  prefixo do token, e conta no limite de requisições do tenant.
- O token vence sozinho na data escolhida. Para cortar antes, **Revogar token MCP**
  no mesmo bloco — vale na hora.
- Se o dono perder o perfil de administrador geral, o token para de funcionar
  imediatamente.
