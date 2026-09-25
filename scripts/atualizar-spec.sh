#!/usr/bin/env bash
#
# Atualiza a referência da API baixando o openapi.json da própria API.
#
# A referência do manual é GERADA, nunca escrita à mão: são 212 rotas, e uma
# cópia manual estaria errada na primeira release. O arquivo fica versionado
# (e não é buscado ao vivo pela página) para que o manual abra mesmo com a API
# fora do ar, e para que a versão publicada seja auditável.
#
#   ./scripts/atualizar-spec.sh                       # produção
#   SIGA_API_BASE=https://dev-api-siga.yavix.com.br ./scripts/atualizar-spec.sh
#
set -euo pipefail

BASE="${SIGA_API_BASE:-https://api-siga.yavix.app}"
DESTINO="public/openapi.json"

echo "Baixando de ${BASE}/openapi.json…"
curl -fsSL "${BASE}/openapi.json" -o "${DESTINO}.tmp"

# Só troca se for JSON válido: um HTML de erro gravado por cima quebraria a
# página de referência silenciosamente.
if ! python3 -c "import json,sys; json.load(open('${DESTINO}.tmp'))" 2>/dev/null; then
  rm -f "${DESTINO}.tmp"
  echo "Resposta não é JSON válido — spec anterior mantido." >&2
  exit 1
fi

# A lista de servidores do spec traz localhost e dev, que nao fazem sentido num
# manual publico -- e o Scalar usa o PRIMEIRO como padrao, entao quem copiasse um
# exemplo sairia chamando http://localhost:8040. Fica so producao.
python3 scripts/so-producao.py "${DESTINO}.tmp"

mv "${DESTINO}.tmp" "${DESTINO}"

VERSAO=$(python3 -c "import json; print(json.load(open('${DESTINO}'))['info']['version'])")
ROTAS=$(python3 -c "import json; print(len(json.load(open('${DESTINO}'))['paths']))")
echo "OK — SIGA API v${VERSAO}, ${ROTAS} rotas em ${DESTINO}"
echo "Confira o diff antes de commitar: git diff --stat ${DESTINO}"
