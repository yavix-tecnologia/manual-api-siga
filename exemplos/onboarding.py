"""
Onboarding completo no SIGA — cadastro do colaborador, solicitação do exame,
agendamento e download da guia.

Python 3.9+ · pip install requests

    export SIGA_API_KEY="yvx_..."
    python exemplos/onboarding.py

O que este exemplo NÃO faz de propósito: criar setor ou cargo. Eles são o
endereço da matriz de riscos no SIGA — cargo criado pela integração aceita
vínculo mas nasce sem grade de exames, e o problema só aparece no ASO. Cargo novo
é pedido ao time de SST.
"""

import os
import sys
import time
from datetime import date, timedelta

import requests

BASE = os.environ.get("SIGA_API_BASE", "https://api-siga.yavix.app")
API_KEY = os.environ.get("SIGA_API_KEY")

if not API_KEY:
    sys.exit("Defina SIGA_API_KEY. A chave nunca fica no código.")


class SigaError(Exception):
    def __init__(self, status, body, retry_after=None):
        super().__init__((body or {}).get("message") or f"HTTP {status}")
        self.status = status
        self.body = body or {}
        self.retry_after = retry_after


def siga(caminho, method="GET", body=None, query=None):
    resposta = requests.request(
        method,
        f"{BASE}/api/v1{caminho}",
        headers={"X-API-Key": API_KEY},
        params=query,
        json=body,
        timeout=30,
    )
    if not resposta.ok:
        try:
            conteudo = resposta.json()
        except ValueError:
            # Resposta não-JSON: o texto cru já é a melhor pista.
            conteudo = {"message": resposta.text[:200]}
        raise SigaError(resposta.status_code, conteudo, resposta.headers.get("Retry-After"))
    return None if resposta.status_code == 204 else resposta.json()


def com_retry(fn, tentativas=3):
    """
    Retry só para 429, esperando o que o servidor mandou esperar. 400, 403 e 422
    não melhoram com repetição — pedem correção, e insistir só gasta cota.
    """
    for i in range(tentativas):
        try:
            return fn()
        except SigaError as e:
            if e.status == 429 and i < tentativas - 1:
                espera = float(e.retry_after or 5)
                print(f"  429 — aguardando {espera}s (Retry-After)")
                time.sleep(espera)
                continue
            raise


def proximo_dia_util():
    d = date.today() + timedelta(days=7)
    while d.weekday() >= 5:
        d += timedelta(days=1)
    return d.isoformat()


def main():
    # 1. Empresa
    orgs = com_retry(lambda: siga("/organizacoes", query={"search": "Panifica", "size": 5}))
    if not orgs["content"]:
        sys.exit("Empresa não encontrada — ajuste a busca.")
    org = orgs["content"][0]
    print(f"1. Empresa: {org['nome']} ({org['id']})")

    # 2. Setor e cargo — LEITURA. Faltando o que você precisa, pare e peça ao
    #    time de SST; não crie.
    setores = siga("/setores", query={"organizacaoId": org["id"], "ativo": True})
    if not setores:
        sys.exit("Nenhum setor cadastrado nesta empresa. Peça o cadastro ao time de SST.")
    setor = setores[0]

    cargos = [c for c in siga(f"/setores/{setor['id']}/cargos") if c["ativo"]]
    if not cargos:
        sys.exit(f"Setor \"{setor['nome']}\" sem cargos. Peça o cadastro ao time de SST.")
    cargo = cargos[0]
    print(f"2. Setor {setor['nome']} · Cargo {cargo['nome']}")

    # 3. Colaborador. Os seis campos abaixo são os que o atendimento exige depois.
    pessoa = com_retry(
        lambda: siga(
            "/pessoas",
            method="POST",
            body={
                "nomeCompleto": "Maria de Souza",
                "cpf": "52998224725",
                "dataNascimento": "1990-01-31",
                "sexo": "F",
                "organizacaoId": org["id"],
                "codigoIntegracao": f"RH-{int(time.time())}",
                "vinculo": {"setorId": setor["id"], "cargoId": cargo["id"]},
            },
        )
    )
    print(f"3. Colaborador: {pessoa['nomeCompleto']} ({pessoa['id']})")

    # 4. Agendas que servem ESTE colaborador, ja com a cobertura da grade dele.
    #    Esta rota aplica os mesmos recortes que o agendamento confere depois — o
    #    que aparece aqui e o que o passo 6 aceita — e ordena as de cobertura
    #    completa primeiro.
    opcoes = siga("/agendas/para-colaborador", query={"pessoaId": pessoa["id"]})
    if not opcoes["agendas"]:
        sys.exit("Nenhuma agenda liberada para esta empresa. Fale com o time de SST.")
    agenda = opcoes["agendas"][0]
    # Parar aqui e deliberado: uma clinica que atende so parte dos exames faz a
    # origem recusar o atendimento inteiro, e sobra um registro com erro para
    # limpar. Quase sempre e o exame que nao esta vinculado a clinica nenhuma.
    if opcoes["nenhumaCompleta"]:
        falta = ", ".join(p["nome"] for p in agenda["cobertura"]["faltantes"])
        sys.exit(f"Nenhuma agenda cobre a grade inteira — falta: {falta}. Fale com o time de SST.")
    print(f"4. Agenda: {agenda['nome']} — {agenda['clinicaNome']}")

    # 5. Atendimento. Sem "exames", vale a grade recomendada pelo PCMSO para o
    #    setor e o cargo.
    try:
        atendimento = com_retry(
            lambda: siga(
                "/atendimentos",
                method="POST",
                body={
                    "organizacaoId": org["id"],
                    "pessoaId": pessoa["id"],
                    "tipoExame": "ADMISSIONAL",
                },
            )
        )
    except SigaError as e:
        if e.status == 422:
            # O 422 lista o que falta no CADASTRO — corrigir a pessoa, não o payload.
            sys.exit(f"Cadastro incompleto: {e.body.get('message')}")
        raise
    print(f"5. Atendimento: {atendimento['id']} ({atendimento['statusAtendimento']})")

    # 6. Agendamento. Com agendaId a clínica sai da agenda e o servidor confere
    #    liberação e abrangência.
    agendado = com_retry(
        lambda: siga(
            f"/atendimentos/{atendimento['id']}/agendar",
            method="PATCH",
            body={
                "agendaId": agenda["id"],
                "clinicaNome": agenda["clinicaNome"],
                "dataAgendamento": proximo_dia_util(),
                "horaAgendamento": "08:00",
            },
        )
    )
    print(f"6. Agendado para {agendado['dataAgendamento']} {agendado['horaAgendamento']}")
    print(f"\nGuia: {BASE}/api/v1/atendimentos/{atendimento['id']}/documento")


if __name__ == "__main__":
    try:
        main()
    except SigaError as e:
        print(f"\nFalhou ({e.status}): {e}", file=sys.stderr)
        if e.status == 403:
            print("O perfil da chave não tem a permissão desta rota.", file=sys.stderr)
        if e.status == 401:
            print("Chave ausente, inválida ou revogada.", file=sys.stderr)
        sys.exit(1)
