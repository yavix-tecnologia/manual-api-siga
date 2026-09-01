---
title: Referência da API
layout: default
nav_order: 5
---

# Referência completa
{: .no_toc }

Todos os endpoints da API do SIGA, gerados a partir do código.
{: .fs-5 .fw-300 }

<div class="aviso aviso-ok" markdown="1">
Esta página é montada a partir do **mesmo `openapi.json` que a API publica** — não
é uma cópia escrita à mão. Rota nova no SIGA aparece aqui na atualização
seguinte do arquivo, sem ninguém redigir nada.
</div>

<div id="spec-info" style="margin: 1rem 0; font-size: .85rem; color: #4a5568;"></div>

<script
  id="api-reference"
  data-url="{{ '/api/openapi.json' | relative_url }}"
  data-configuration='{"theme":"default","hideDownloadButton":false,"searchHotKey":"k"}'>
</script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.86/dist/browser/standalone.min.js"></script>

<script>
  // Versão e data do spec: quem lê precisa saber se está lendo algo velho.
  fetch('{{ "/api/openapi.json" | relative_url }}')
    .then((r) => r.json())
    .then((spec) => {
      const rotas = Object.keys(spec.paths || {}).length;
      document.getElementById('spec-info').textContent =
        `SIGA API v${spec.info.version} · ${rotas} rotas`;
    })
    .catch(() => {});
</script>

---

## Também disponível

- **Versão sempre ao vivo:** [`api-sst.yavix.app/docs`](https://api-sst.yavix.app/docs)
- **Spec cru:** [`openapi.json`]({{ '/api/openapi.json' | relative_url }}) — use no
  Postman, Insomnia ou num gerador de cliente
- **Gerar um cliente:** o spec é OpenAPI 3.1 válido, então
  `openapi-generator`, `orval` ou `openapi-typescript` funcionam direto nele

## Exemplos por linguagem dentro da referência

Cada endpoint traz exemplos prontos em **curl, JavaScript, Python, Java, C# e
Dart** — eles vêm no próprio spec (`x-codeSamples`), então aparecem tanto aqui
quanto na documentação ao vivo.
