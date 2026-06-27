---
name: unac-verify-review
description: Verificação adversarial dos findings 🔴 BLOCKING de um code review report. Dispatcha um painel pequeno de unac-finding-verifier (lentes correctness/AC/alcançável) por blocker, tentando refutar. Calibração: na dúvida, mantém o blocker. Corta falsos positivos antes do fix-blockers. Reutiliza o unac-code-reviewer sem alterá-lo.
---

# Unac Verify Review Skill

## Overview

Esta skill se posiciona **entre** o `unac-review-implementation` e o `unac-fix-blockers`: recebe o `code-review-report.md` consolidado e tenta **refutar** cada finding 🔴 BLOCKING antes de despachá-los para correção.

**Princípio central**: só dispatcha agentes read-only em paralelo. A skill faz a única escrita (append no report). Workers nunca spawnam workers.

**Calibração INVERSA da exploração**: em `mode=review`, incerteza favorece o blocker. A dúvida não dissolve — mantém. A queda só ocorre com maioria `refuted` + evidência conclusiva.

## Input contract

O prompt contém:

- `item-id` — identificador canônico do item (ex.: `PROJ-123`)
- `report-path` — caminho do `{item-id}_code-review-report.md` consolidado
- `final-sweep` *(opcional, default `false`)* — se `true`, dispatcha um reviewer amplo sobre o diff completo ao final

## Governadores de token

- 🔴 BLOCKING **only** entram no painel (🟡/🔵 são ignorados inteiramente — economia de tokens)
- Painel de 1 verifier para blockers de baixo risco; até 3 nos sensíveis
- Sweep final DESLIGADO por default — requer `final-sweep=true` explícito
- Sem re-dispatch de agente que retorna `NEEDS_CONTEXT`; registra lacuna e trata como `manter-blocker`

---

## Passo 1 — Extrair blockers do report

Ler o `{report-path}` com `Read`.

Extrair **apenas** os findings marcados com 🔴 BLOCKING. Ignorar completamente 🟡 e 🔵.

Para cada blocker extrair:
- `id` — número sequencial ou identificador do finding no report
- `claim` — afirmação objetiva do problema (1 frase)
- `evidence` — localização (`file:line` ou descrição textual)

Se não houver nenhum finding 🔴 BLOCKING no report:

```
STATUS: DONE
blockers-surviving: 0
blockers-downgraded: 0
surviving-list: []
note: nenhum blocker 🔴 encontrado — nada a verificar. Proceed to unac-fix-blockers is a no-op.
```

Retornar imediatamente. Não escrever nada no report.

---

## Passo 2 — Calibrar o painel por blocker

Para cada blocker, determinar o tamanho do painel:

| Critério | Tamanho do painel |
|----------|------------------|
| Blocker de alto risco (segurança, data loss, contrato externo, AC crítico) | 3 verifiers (lentes: `correctness`, `ac-spec`, `reachability`) |
| Blocker de risco médio (lógica de negócio, edge case, performance significativa) | 2 verifiers (lentes: `correctness`, `ac-spec`) |
| Blocker de baixo risco (estilo forçado a blocking, formatação, naming periférico) | 1 verifier (lente: `correctness`) |
| Muitos blockers (> 6) e todos de baixo risco | 1 verifier por blocker (lente: `correctness`) — preservar orçamento |

---

## Passo 3 — Fan-out paralelo do painel adversarial

> **REGRA CRÍTICA**: Dispatchar **todos** os verifiers de **todos** os blockers na **mesma mensagem** — múltiplas chamadas `Agent` num único turno. Dispatchar 1 por turno é serial e está ERRADO.

Para cada blocker B[i] com painel de tamanho P, dispatchar P agentes `unac-finding-verifier` simultaneamente. Identificar cada verifier como `B{i}-L{lens}`.

**Template de dispatch** (repetir para cada (blocker, lens) na mesma mensagem):

```
Agent(
  subagent_type: "unac-finding-verifier",
  description: "Verify blocker {i}/{total} lens={lens} for {item-id}",
  model: "sonnet",
  prompt: <<PROMPT
    claim: {claim do blocker}
    evidence: {evidence do blocker}
    mode: review
    calibration: keep-on-uncertain
    lens: {correctness | ac-spec | reachability}

    Tente refutar a afirmação acima. Busque contraevidência no codebase.
    Retorne no formato MANDATORY do unac-finding-verifier.
  PROMPT
)
```

Aguardar todos os retornos antes de prosseguir.

**Tratamento de retornos**:
- `DONE` → coletar `verdict` e `resolved`
- `NEEDS_CONTEXT` → tratar como `resolved: manter-blocker` (campo ausente = conservador); registrar lacuna

---

## Passo 4 — Decisão por calibração inversa

> **REGRA EXPLÍCITA DE DECISÃO** (não altere esta lógica):
>
> Um blocker **CAI** (rebaixa para 🟡) **somente se** a **maioria absoluta** dos verifiers do seu painel retornar `resolved: rebaixar`.
>
> Em qualquer outro cenário, o blocker **SOBREVIVE**:
> - Qualquer verifier com `resolved: manter-blocker` → SOBREVIVE
> - Maioria `uncertain` (mesmo sem `manter-blocker` explícito) → SOBREVIVE
> - Empate (metade `rebaixar`, metade `manter-blocker`) → SOBREVIVE
> - `NEEDS_CONTEXT` de qualquer verifier conta como `manter-blocker` → SOBREVIVE
>
> **Fundamento**: em `mode=review` com `calibration: keep-on-uncertain`, `uncertain` → `manter-blocker` pelo contrato do verifier. Review é conservador por design — a dúvida não dissolve o blocker.

Para cada blocker B[i]:

```
votos_manter = count(resolved == "manter-blocker") + count(NEEDS_CONTEXT)
votos_rebaixar = count(resolved == "rebaixar")
total = len(painel)

decisao = "rebaixado" se votos_rebaixar > total / 2 else "sobrevive"
```

Classificar cada blocker como `sobrevive` ou `rebaixado`. Construir:
- `surviving_blockers[]` — lista dos que sobrevivem (para o `unac-fix-blockers`)
- `downgraded_blockers[]` — lista dos rebaixados para 🟡

---

## Passo 5 — Escrita única pela skill

Anexar ao `{report-path}` a seção de verificação adversarial. A skill é o **único** agente que escreve neste artefato nesta etapa.

Usar `Edit` para fazer append do seguinte bloco ao final do arquivo:

```markdown
---

## Verificação adversarial

> Executada por `unac-verify-review`. Calibração: `keep-on-uncertain` — na dúvida, o blocker sobrevive.

### Resultado geral

| Métrica | Valor |
|---------|-------|
| Blockers verificados | {N} |
| Sobreviventes 🔴 | {N} |
| Rebaixados para 🟡 | {N} |

### Por blocker

#### 🔴 B{i}: {claim resumida}

| Verifier | Lens | Verdict | Resolved |
|----------|------|---------|---------|
| B{i}-Lcorrectness | correctness | {confirmed\|refuted\|uncertain} | {manter-blocker\|rebaixar} |
| B{i}-Lac-spec | ac-spec | ... | ... |
| B{i}-Lreachability | reachability | ... | ... |

**Decisão**: SOBREVIVE 🔴 | REBAIXADO 🟡
**Motivo**: {1 frase explicando a decisão — qual voto determinou o resultado}

---
```

*(Repetir bloco "Por blocker" para cada finding verificado.)*

### Sweep final (opt-in, DESLIGADO por default)

Executar esta seção **somente se** `final-sweep=true` foi explicitamente fornecido no input.

Se `final-sweep=true`:

```
Agent(
  subagent_type: "unac-code-reviewer",
  description: "Final sweep — full diff review for {item-id}",
  model: "opus",
  prompt: <<PROMPT
    item-id: {item-id}
    report-path: {report-path}
    task-number: final-sweep
    task-description: Sweep amplo sobre o diff completo da branch. Revisar todos os arquivos alterados em busca de issues críticos não capturados pelas reviews por-task.
    files-to-review: [diff completo da branch — use `git diff main...HEAD`]
    jira-card-path: (omitir — sweep estrutural)
    constitution-path: .unac/constitution.md
  PROMPT
)
```

Aguardar retorno e anexar os findings ao `{report-path}` numa sub-seção `### Final Sweep`.

### Confirmar escrita

Após o `Edit`, executar `Read` no `{report-path}` para confirmar que a seção `## Verificação adversarial` está presente. Se ausente, repetir o `Edit` uma vez.

---

## Passo 6 — Return

```
STATUS: DONE | DONE_WITH_CONCERNS

item-id: {item-id}
report-path: {report-path}

blockers-surviving: {N}
blockers-downgraded: {N}

surviving-list:
  - id: B{i}
    claim: {claim}
    evidence: {evidence}

downgraded-list:
  - id: B{i}
    claim: {claim}
    reason: {motivo da queda — ex: "3/3 verifiers retornaram refuted com evidência em src/foo.ts:42"}

next: unac-fix-blockers com surviving-list acima (omitir se surviving-list vazia)

concerns: <se DONE_WITH_CONCERNS: ex: verifier retornou NEEDS_CONTEXT em B3, tratado conservadoramente como manter-blocker>
```

---

## Red flags (anti-patterns)

- **Jamais** processar 🟡 ou 🔵 findings — apenas 🔴 BLOCKING
- **Jamais** dispatchar verifiers em turnos sequenciais — sempre na mesma mensagem (fan-out)
- **Jamais** rebaixar um blocker sem maioria `refuted` + evidência conclusiva
- **Jamais** executar o sweep final sem `final-sweep=true` explícito
- **Jamais** deixar o worker escrever no report — apenas a skill escreve (Passo 5)
- **Jamais** re-dispatchar um verifier que retornou `NEEDS_CONTEXT` — registrar lacuna e tratar conservadoramente

---

## Sub-skills / workers invocados

| Worker | Modo | Quando |
|--------|------|--------|
| `unac-finding-verifier` | paralelo (fan-out) | Passo 3 — sempre que houver blockers |
| `unac-code-reviewer` | single | Passo 5 — apenas se `final-sweep=true` |
