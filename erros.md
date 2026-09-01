---
title: Erros
layout: default
nav_order: 4
---

# Erros e como resolver cada um
{: .no_toc }

1. TOC
{:toc}

---

## Formato

Toda falha responde no mesmo formato — não há dois formatos de erro na API:

```json
{
  "error": "Unprocessable Entity",
  "message": "Cadastro do colaborador incompleto para gerar o ASO — falta: CPF, cargo.",
  "timestamp": "2026-09-01T12:00:00.000Z"
}
```

O `message` é escrito para ser lido por quem vai corrigir. Quando há uma lista
(campos faltando, por exemplo), ela vem no próprio texto.

## Códigos HTTP

| Código | O que significa | O que fazer |
|---|---|---|
| `400` | Payload inválido | O campo problemático vem em `message` |
| `401` | Chave ausente, inválida, expirada ou revogada | Conferir o header `X-API-Key` |
| `403` | Chave válida, perfil sem a permissão | Pedir a permissão ao admin da conta |
| `404` | Recurso não existe **ou** está fora do seu tenant | Conferir o id |
| `409` | Conflito de estado (ex.: agenda inativa) | Ver a tabela abaixo |
| `422` | Requisição bem formada, **cadastro** incompleto | Corrigir o cadastro, não o payload |
| `429` | Cota por minuto excedida | Respeitar o `Retry-After` |

<div class="aviso" markdown="1">
**400 e 422 são coisas diferentes.** 400 é "seu JSON está errado". 422 é "seu
JSON está certo, mas o dado que ele aponta está incompleto no SIGA" — quem
corrige é o cadastro, não o código.
</div>

## Recusas de negócio

Cada uma se resolve num lugar diferente. É por isso que elas têm código próprio
em vez de um erro genérico.

| Código | Quando aparece | Onde se resolve |
|---|---|---|
| `COLABORADOR_INCOMPLETO` | `POST /atendimentos` com pessoa sem nome, CPF, data de nascimento, sexo, setor ou cargo | No cadastro da pessoa (`PUT /pessoas/{id}`) |
| `AGENDA_INATIVA` | `PATCH .../agendar` com agenda desativada | No cadastro da agenda, dentro do SIGA |
| `AGENDA_NAO_LIBERADA` | A agenda existe, mas não está liberada para a empresa do colaborador | Nas empresas vinculadas à agenda (time SST) |
| `CLINICA_FORA_DA_ABRANGENCIA` | A clínica daquela agenda não atende a empresa do colaborador | Na abrangência da clínica (time SST) |
| `VIGENCIA_SOBREPOSTA` | Dois médicos responsáveis com vigências que se cruzam | Encerrando a vigência anterior |
| `RATE_LIMIT` | Mais requisições por minuto do que a cota do tenant | Respeitando o `Retry-After` |

### Por que `AGENDA_NAO_LIBERADA` e `CLINICA_FORA_DA_ABRANGENCIA` são separados

Parecem o mesmo erro ("não pode agendar aqui"), mas se corrigem em cadastros
diferentes: a liberação é da **agenda**, a abrangência é da **clínica**. Um único
erro mandaria o operador procurar no lugar errado — por isso são dois.

**Como evitar os dois:** use sempre `GET /agendas/disponiveis?organizacaoId=…`
para escolher. Essa rota aplica exatamente os mesmos recortes que o agendamento
confere, então o que ela lista é o que o agendamento aceita.

## 429: como tratar direito

```
HTTP/1.1 429 Too Many Requests
Retry-After: 37
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1788230400
```

<div class="abas" markdown="1">
<div class="abas-painel" data-lang="JavaScript" markdown="1">
```js
async function comRetry(fn, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      // Espera o que o servidor mandou esperar — não um intervalo chutado.
      if (e.status === 429 && i < tentativas - 1) {
        const espera = Number(e.retryAfter ?? 5) * 1000;
        await new Promise((r) => setTimeout(r, espera));
        continue;
      }
      throw e;
    }
  }
}
```
</div>
<div class="abas-painel" data-lang="Python" markdown="1">
```python
def com_retry(fn, tentativas=3):
    for i in range(tentativas):
        try:
            return fn()
        except SigaError as e:
            # Espera o que o servidor mandou esperar.
            if e.status == 429 and i < tentativas - 1:
                time.sleep(float(e.retry_after or 5))
                continue
            raise
```
</div>
</div>

<div class="aviso" markdown="1">
**Não faça retry de 4xx que não seja 429.** 400, 403 e 422 não melhoram com
tentativa: eles pedem correção. Repetir só gasta a sua cota.
</div>

## Idempotência

A API não tem chave de idempotência. Para não criar o mesmo colaborador duas
vezes quando a rede falha no meio:

1. grave o seu identificador em `codigoIntegracao` no `POST /pessoas`;
2. antes de criar, procure por ele:
   `GET /pessoas?organizacaoId=org_…&search=<sua matrícula>`.

O CPF também é único por empresa, então uma segunda tentativa com o mesmo CPF é
recusada em vez de duplicar — mas procurar antes dá uma mensagem melhor para o
seu usuário do que tratar a recusa.
