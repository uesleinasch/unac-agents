---
name: unac-review-implementation
description: Loop de review serial — lê o implementation plan de um item-id, cria o review report com header, e dispatcha `unac-code-reviewer` 1x por task. Consolida findings ao final e determina overall result. Use após a fase de QA aprovar. Se houver blockers 🔴, invoque a skill `unac-fix-blockers` na sequência.
---

# Unac Review Implementation Skill

Você é o **controller de review**. Dispatcha `unac-code-reviewer` uma vez por task, com texto completo da task + lista de arquivos no prompt. Ao final, lê o report inteiro, consolida contagens e decide overall result.

> **🛑 SUBAGENT-STOP:** Se você é subagent, pule este skill.

## Input contract

- `item-id` (obrigatório)
- Artefatos esperados: `{item-id}_implementation_plan.md`, `{item-id}_implementation_progress.md`, `{item-id}_jira-card.md` em `.unac/{item-id}/`

## Checklist

1. Setup — criar review report com header + TODO
2. Review loop — 1 dispatch de `unac-code-reviewer` por task
3. Consolidation — ler report inteiro e gravar Consolidated Summary
4. Decision — determinar overall result e decidir próximo passo

## Passo 1 — Setup

1. `Read` em `{item-id}_implementation_plan.md`, `{item-id}_implementation_progress.md`, `{item-id}_jira-card.md`.
2. Extraia em memória cada task: `task-number`, `description`, `ambient`, `files-to-modify`, `acceptance-criteria`.
3. Extraia ACs do Jira card.
4. Verifique `status: ready-for-review` no progress file. Se não, apresente warning mas pode prosseguir se o usuário confirmar.
5. Use `Write` para criar `.unac/{item-id}/{item-id}_code_review_report.md`:

```markdown
# Code Review Report — {item-id}

**Reviewer**: unac-code-reviewer (via unac-review-implementation skill)
**Date**: YYYY-MM-DD
**Tasks in plan**: {total}
**Overall result**: (computed after all tasks reviewed)

> jira-card.md: [found ✅ | absent ⚠️]
> implementation_progress.md: [found ✅ | absent ⚠️]

---

## Task Findings

<!-- Workers append one section per task below this line -->
```

6. `TodoWrite` com 1 todo por task.

## Passo 2 — Review loop (serial)

Para cada task:

```
Agent(
  subagent_type: "unac-code-reviewer",
  description: "Review task {task-number} of {item-id}",
  prompt: <<PROMPT
    item-id: {item-id}
    task-number: {task-number}
    report-path: .unac/{item-id}/{item-id}_code_review_report.md

    ## Task Description (completo, do plano)
    {description}

    ## Ambient
    {ambient}

    ## Files to review
    {lista}

    ## Acceptance Criteria (do Jira card)
    {lista}

    Review this task only. Append findings section to report-path.
    Return closed status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT).
  PROMPT
)
```

**Após cada retorno**:
- Parse STATUS.
- `Read` o review report e CONFIRME que a seção `### Task {task-number}` foi appendada.
- Se não appendou: trate como BLOCKED; pergunte ao usuário se retry ou pula task.
- `TodoWrite` marca todo completo com contagens (`blocking: N, suggestions: N`).

## Passo 3 — Consolidation

Após todas as tasks revisadas:

1. `Read` no report inteiro.
2. Conte através de todas as seções `### Task N`:
   - 🔴 Blocking issues (total)
   - 🟡 Suggestions (total)
   - 🔵 Informational (total)
   - ✅ Positive highlights (total)
3. Determine **Overall result**:
   - Se qualquer 🔴 → `🚫 Requires Changes`
   - Senão, se qualquer 🟡 → `🔄 Approved with Suggestions`
   - Senão → `✅ Approved`
4. Use `Edit` no report para append:

```markdown
---

## Consolidated Summary

**Overall result**: {result}
**Tasks reviewed**: {N} / {N}
**Date**: YYYY-MM-DD

| Metric | Total |
|--------|-------|
| 🔴 Blocking issues | {N} |
| 🟡 Suggestions | {N} |
| 🔵 Informational | {N} |
| ✅ Positive highlights | {N} |

### Review History
| Iteration | Date | Result | Blockers Resolved |
|-----------|------|--------|-------------------|
| {iter} | YYYY-MM-DD | {result} | — |
```

## Passo 4 — Decision

Apresente ao usuário:

- **`✅ Approved`** ou **`🔄 Approved with Suggestions`**: escreva status no `{item-id}_implementation_progress.md`:
  ```
  ## Review Status
  result: approved
  date: YYYY-MM-DD
  iteration: {N}
  ```
  Anuncie: "Review aprovado. Sugestões registradas no report."

- **`🚫 Requires Changes`**: apresente:
  > "Review encontrou {N} blocking issues. Opções: (A) invocar `unac-fix-blockers` skill agora, (B) revisar manualmente, (C) abortar."

  Se A: invoque `Skill("unac-fix-blockers")` com o `item-id`. Quando retornar, REINVOQUE esta skill (`unac-review-implementation`) para re-validar. **Limite 2 iterações** de review+fix; depois escale.

## Red flags

- ❌ Paralelizar reviews (tasks podem tocar arquivos compartilhados; seu consolidated summary fica não-determinístico)
- ❌ Fazer subagent reler plano
- ❌ Sobrescrever o report — só APPEND
- ❌ Tomar decisão de fix sem mostrar ao usuário
- ❌ Continuar além de 2 iterações review+fix sem escalar

## Sub-skill handoff

Se blockers existem:
**REQUIRED NEXT:** `unac-fix-blockers`

Senão:
**REQUIRED NEXT:** `unac-pipeline` Fase 8 (closure)
