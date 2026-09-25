"""Deixa apenas o servidor de producao na lista `servers` do spec.

Rodado por `atualizar-spec.sh` logo depois do download. O Scalar usa o primeiro
servidor como padrao, e um manual publico apontando para localhost faria o
leitor copiar um exemplo que nao funciona.
"""

import json
import sys

caminho = sys.argv[1]
spec = json.load(open(caminho, encoding="utf-8"))
spec["servers"] = [{"url": "https://api-siga.yavix.app", "description": "Producao"}]
json.dump(spec, open(caminho, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
