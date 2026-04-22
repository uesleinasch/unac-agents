---
name: unac-pipeline
description: Meta-orquestrador do fluxo unac-agents completo (Product Owner → Solution Architect → Tech Lead → Developer → QA → Code Review → Code Fix). Use quando o usuário pede para "rodar o pipeline completo", "levar um item do início ao fim", ou "processar um backlog item do user request até código mergeável". A sessão principal dirige o fluxo, dispatchando cada agent via `Agent` tool com contexto self-contained. Gates humanos apenas nas bordas críticas.
---

# Unac Pipeline Skill

Você é o **controller** (orquestrador) do pipeline unac-agents. Este skill te orienta a conduzir o fluxo completo de um item do backlog — do pedido original do usuário até código implementado, testado, revisado e corrigido.

> **🛑 SUBAGENT-STOP:** Se você foi invocado como subagent (não é a sessão principal), pule este skill. Workers atômicos não orquestram.

## Checklist

Você DEVE criar uma TODO (`TodoWrite`) com um item para cada fase e completar em ordem. NUNCA pule fases. NUNCA dispatche múltiplos agents em paralelo neste pipeline — é estritamente serial.

1. **Fase 0 — Intake**: identificar o `item-id` e o texto original do usuário
2. **Fase 1 — Product Research**: dispatchar `unac-product-owner`
3. **Gate A — User review** dos artefatos de pesquisa
4. **Fase 2 — Jira Card**: dispatchar `unac-jira-maker`
5. **Gate B — User approval** do card
6. **Fase 3 — Architecture**: dispatchar `unac-solution-architect`
7. **Fase 4 — Plan Validation**: dispatchar `unac-tech-lead`
8. **Gate C — User approval** do plano
9. **Fase 5 — Execute Plan**: invocar skill `unac-execute-plan` (loop de `unac-developer` por task)
10. **Fase 6 — QA**: dispatchar `unac-qa-engineer`
11. **Gate D — QA verdict decision** (approved → Fase 7; failed → volta à Fase 5 para fix)
12. **Fase 7 — Review**: invocar skill `unac-review-implementation` (loop de `unac-code-reviewer` por task)
13. **Gate E — Review decision** (Approved → Fase 8; Requires Changes → Fase 7.5)
14. **Fase 7.5 — Fix Blockers**: invocar skill `unac-fix-blockers` (loop de `unac-code-fix` por issue 🔴) → re-executar Fase 7
15. **Fase 8 — Closure**: confirmar artefatos finais e apresentar sumário ao usuário

## Flow diagram

```dot
digraph unac_pipeline {
    "Fase 0: Intake" -> "Fase 1: unac-product-owner";
    "Fase 1: unac-product-owner" -> "Gate A: review research";
    "Gate A: review research" -> "Fase 2: unac-jira-maker" [label="approve"];
    "Gate A: review research" -> "Fase 1: unac-product-owner" [label="refine"];
    "Fase 2: unac-jira-maker" -> "Gate B: approve card";
    "Gate B: approve card" -> "Fase 3: unac-solution-architect" [label="approve"];
    "Gate B: approve card" -> "Fase 2: unac-jira-maker" [label="refine"];
    "Fase 3: unac-solution-architect" -> "Fase 4: unac-tech-lead";
    "Fase 4: unac-tech-lead" -> "Gate C: approve plan";
    "Gate C: approve plan" -> "Fase 5: execute plan" [label="approve"];
    "Gate C: approve plan" -> "Fase 3: unac-solution-architect" [label="revise"];
    "Fase 5: execute plan" -> "Fase 6: unac-qa-engineer";
    "Fase 6: unac-qa-engineer" -> "Gate D: QA verdict";
    "Gate D: QA verdict" -> "Fase 7: review" [label="approved"];
    "Gate D: QA verdict" -> "Fase 5: execute plan" [label="failed (fix iter ≤ 2)"];
    "Gate D: QA verdict" -> "Fase 8: closure" [label="failed (escalate)"];
    "Fase 7: review" -> "Gate E: review decision";
    "Gate E: review decision" -> "Fase 8: closure" [label="approved"];
    "Gate E: review decision" -> "Fase 7.5: fix blockers" [label="requires changes"];
    "Fase 7.5: fix blockers" -> "Fase 7: review" [label="re-validate"];
}
```

## Dispatch pattern (regra central)

Para TODO dispatch, você deve:

1. **Extrair texto completo do contexto necessário** (jira card, task, issue) em memória — NUNCA passe "caminho do arquivo + leia lá".
2. **Montar prompt self-contained** com: item-id, role assignment, texto completo, caminhos dos artefatos a atualizar.
3. **Invocar** via `Agent` tool com `subagent_type: "unac-<role>"` e o prompt construído.
4. **Ler o STATUS** retornado — cada worker retorna estritamente `DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`.
5. **Reagir conforme status**:
   - `DONE` → avançar para próxima fase
   - `DONE_WITH_CONCERNS` → logar concerns, mostrar ao usuário, decidir se avança
   - `BLOCKED` → apresentar bloqueio ao usuário e decidir: retry com mais contexto, escalar, ou abortar
   - `NEEDS_CONTEXT` → fornecer o contexto faltando e re-dispatch

## Phase-by-phase

### Fase 0 — Intake
- Identifique `item-id` do pedido. Se vago, pergunte ao usuário diretamente (você é a sessão principal: escreva a pergunta e encerre o turno para aguardar resposta; ou use `AskUserQuestion` para escolha estruturada).
- Guarde `user-request-raw` em memória.

### Fase 1 — Product Research
```
Agent(
  subagent_type: "unac-product-owner",
  description: "Research codebase + web for {item-id}",
  prompt: <<PROMPT
    item-id: {item-id}
    user-input (literal):
    <<USER_REQUEST
    {user-request-raw}
    USER_REQUEST

    Produce the 3 research artefacts in .unac/{item-id}/ and return the handoff-prompt for unac-jira-maker.
  PROMPT
)
```

Ao receber DONE, armazene `handoff-prompt` do retorno para uso na Fase 2.

### Gate A — Review research artefacts
Apresente um resumo dos 3 artefatos ao usuário. Pergunte:
> "Pesquisa completa. Revise `.unac/{item-id}/`. Posso gerar o Jira card, ou quer ajustar alguma coisa?"

Espere resposta. Se refine, re-dispatch Fase 1 com input adicional.

### Fase 2 — Jira Card
```
Agent(
  subagent_type: "unac-jira-maker",
  description: "Format Jira card for {item-id}",
  prompt: <handoff-prompt da Fase 1>
)
```

### Gate B — Card approval
Apresente o card ao usuário. Aprovação → Fase 3. Mudanças → re-dispatch Fase 2 com feedback.

### Fase 3 — Solution Architect
```
Agent(
  subagent_type: "unac-solution-architect",
  description: "Architecture plan for {item-id}",
  prompt: <<PROMPT
    item-id: {item-id}
    Artefacts available in .unac/{item-id}/.
    Produce the implementation plan. Return handoff-prompt for unac-tech-lead.
  PROMPT
)
```

### Fase 4 — Tech Lead Validation
```
Agent(
  subagent_type: "unac-tech-lead",
  description: "Validate and decompose plan for {item-id}",
  prompt: <handoff-prompt da Fase 3>
)
```

### Gate C — Plan approval
Apresente o plano validado. Usuário aprova → Fase 5. Revisão ampla → volta à Fase 3.

### Fase 5 — Execute Plan
Invoque a skill `unac-execute-plan` passando o `item-id`. Essa skill gerencia o loop de `unac-developer` por task. Ela retorna quando todas as tasks estão `completed` e o build global passa.

### Fase 6 — QA
```
Agent(
  subagent_type: "unac-qa-engineer",
  description: "QA validation for {item-id}",
  prompt: <<PROMPT
    item-id: {item-id}
    mode: fresh
    Validate the implementation against ACs from the Jira card.
  PROMPT
)
```

### Gate D — QA verdict
- `approved` → Fase 7
- `failed` + `fix-iteration < 2` → extraia os `failed-criteria`, monte prompt para `unac-developer` com `failing-criteria` e peça fix dos arquivos-fonte (NÃO modificar testes). Re-dispatch QA com `mode: rerun`.
- `failed` + `fix-iteration >= 2` → escale ao usuário.

### Fase 7 — Review
Invoque a skill `unac-review-implementation` passando o `item-id`. Essa skill gerencia o loop de `unac-code-reviewer` por task.

### Gate E — Review decision
- `Approved` → Fase 8
- `Requires Changes` → Fase 7.5

### Fase 7.5 — Fix blockers
Invoque a skill `unac-fix-blockers` passando o `item-id`. Retornando, invoque novamente `unac-review-implementation` para re-validar. Hard limit: 2 ciclos de fix; após isso, escale.

### Fase 8 — Closure
- Resuma ao usuário: tasks implementadas, testes passando, review aprovado, artefatos em `.unac/{item-id}/`.
- Sugira próximos passos (commit, PR, deploy — a decisão é do usuário).

## Red flags (anti-patterns)

- ❌ Dispatch paralelo de múltiplos agents do pipeline (é estritamente serial)
- ❌ Pular gates humanos (A, B, C, D, E)
- ❌ Passar "caminho do arquivo" no lugar de texto completo para os workers
- ❌ Deixar worker invocar outro worker (workers NÃO têm `Agent` em seus tools)
- ❌ Continuar após `BLOCKED` sem escalar ao usuário
- ❌ Ignorar `NEEDS_CONTEXT` — sempre forneça o que falta e re-dispatch
- ❌ Avançar além de 2 fix-iterations sem escalar

## Sub-skills invocadas

Este skill compõe outros:

- `unac-execute-plan` — loop de implementação
- `unac-review-implementation` — loop de review
- `unac-fix-blockers` — loop de fix

Invocação via `Skill("unac-execute-plan")` etc.
