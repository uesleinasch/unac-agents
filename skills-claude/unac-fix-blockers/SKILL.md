---
name: unac-fix-blockers
description: Loop de correção cirúrgica — lê o code review report de um item-id, enumera os issues 🔴 BLOCKING, cria um fix report, e dispatcha `unac-code-fix` 1x por issue. Roda build global ao final. Hard limit de 2 fix iterations. Invocada pela skill `unac-review-implementation` quando o overall result é Requires Changes.
---

# Unac Fix Blockers Skill

Você é o **controller de fix**. Dispatcha `unac-code-fix` uma vez por issue 🔴, cada um com descriptor completo do issue no prompt. Após todos os fixes, roda build global. Retorna para `unac-review-implementation` re-validar.

> **🛑 SUBAGENT-STOP:** Se você é subagent, pule este skill.

## Input contract

- `item-id` (obrigatório)
- `fix-iteration` (opcional, default 1; máximo 2)
- Artefato esperado: `.unac/{item-id}/{item-id}_code_review_report.md` com pelo menos 1 issue `🔴 Blocking`

## Checklist

1. Setup — enumerar issues 🔴 e criar fix report
2. Fix loop — 1 dispatch de `unac-code-fix` por issue
3. Global build — verificar regressões
4. Finalize — update progresso e handoff de volta

## Passo 1 — Setup

1. `Read` em `{item-id}_code_review_report.md`.
2. Extraia TODOS os issues marcados `🔴 BLOCKING` em memória:
   - `issue-index` (sequencial: 1, 2, 3...)
   - `file`, `line`, `problem`, `suggested-fix`
   - `ambient` (derive do contexto da task ou fallback "unknown")
3. Se 0 issues 🔴: anuncie "Nenhum blocker encontrado; nada para corrigir" e retorne.
4. Use `Write` para criar `.unac/{item-id}/{item-id}_fix_report.md`:

```markdown
## Fix Report — {item-id}

**Agent**: unac-code-fix (via unac-fix-blockers skill)
**Date**: YYYY-MM-DD
**Fix Iteration**: {N} of 2
**Authorized scope**: 🔴 Blocking issues only

---

### Pending Issues

| # | File:Line | Description | Status |
|---|-----------|-------------|--------|
| 1 | `path/file.ts:N` | [short description] | pending |

---

### Resolved Issues ✅
(preenchido pelos workers)

### Escalated Issues ⚠️
(preenchido pelos workers)

### Failed Issues ❌
(preenchido pelos workers)

### Modified Files
(preenchido ao final)

### Regressions Introduced
(preenchido se build global falhar)

### Final Summary
(preenchido ao final)
```

5. `TodoWrite` com 1 todo por issue.

## Passo 2 — Fix loop (serial)

Para cada issue:

```
Agent(
  subagent_type: "unac-code-fix",
  description: "Fix issue {issue-index} of {item-id}",
  prompt: <<PROMPT
    item-id: {item-id}
    issue-index: {issue-index}
    fix-iteration: {N}
    review-report: .unac/{item-id}/{item-id}_code_review_report.md
    fix-report: .unac/{item-id}/{item-id}_fix_report.md

    ## Issue Descriptor (completo, do review report)
    file: {file}
    line: {line}
    ambient: {ambient}
    problem: {problem}
    suggested-fix: {suggested-fix}

    Apply surgical fix (≤ 10 lines, no redesign). Update both reports.
    Return SUBAGENT_RESULT block + closed STATUS.
  PROMPT
)
```

**Após cada retorno**:
- Parse `SUBAGENT_RESULT_START…END` block para: `status` (resolved/escalated/failed), `file`, `build-result`, etc.
- Parse STATUS geral.
- `Read` em fix_report e code_review_report; confirme que o issue foi marcado.
- Se o parse/confirmação falhar:
  - 1ª tentativa: re-dispatch.
  - 2ª tentativa: pergunte ao usuário diretamente (você é a sessão principal) — apresente as opções (A) retry, (B) mark ❌ FAILED e continue, (C) abort; use `AskUserQuestion` ou pergunta inline.
- `TodoWrite` marca completo com o sub-status.

**Importante**: nunca pule um issue. Todos DEVEM ser processados. Ao final todos terão status `resolved`, `escalated` ou `failed`.

## Passo 3 — Global build verification

Após todos os issues processados:

1. `Bash`: `npm run build && npm run lint` (ou equivalente); se tiver test suite, rode `npm test`.
2. Se passar: prossiga para Passo 4.
3. Se falhar (regressão):
   - `Edit` em fix_report na seção `Regressions Introduced`, listando erros.
   - Apresente ao usuário: "Regressões detectadas após fix iteration {N}. Opções: (A) tentar corrigir agora (conta no fix_iteration), (B) escalar ao developer, (C) abortar."
   - Se A: re-dispatch fixes para regressões (caso fix_iteration < 2).

## Passo 4 — Finalize

1. `Edit` em fix_report adicionando Final Summary:

```markdown
### Final Summary
| Category | Total | Resolved ✅ | Escalated ⚠️ | Failed ❌ |
|----------|-------|------------|------------|---------|
| 🔴 Blocking | {N} | {N} | {N} | {N} |

### Modified Files
| File | Issues fixed | Build status |
|------|-------------|--------------|
| `path/file.ts` | {N} | ✅ |

### Fix Iteration History
| Iteration | Date | Resolved | Escalated | Failed |
|-----------|------|----------|-----------|--------|
| {N} | YYYY-MM-DD | {N} | {N} | {N} |
```

2. `Edit` em `{item-id}_implementation_progress.md`:
```
fix-cycle-{N}: completed
fixes-resolved: {N of M blocking}
fixes-escalated: {N}
fixes-failed: {N}
```

3. Apresente resultado ao usuário:
   - Se todos `resolved`: "Fix cycle {N} limpo. Re-validando review."
   - Se `escalated`/`failed` existem: "Fix cycle {N}: {X} escalados, {Y} falhados. Opções: (A) escalar ao developer, (B) continuar assim mesmo, (C) abortar."

## Passo 5 — Handoff

**Se fix_iteration < 2** e issues `resolved` existem: invocar `Skill("unac-review-implementation")` para re-validar o mesmo item. O review pode introduzir novos blockers → loop continua.

**Se fix_iteration >= 2** e ainda há issues não resolvidos: escale ao usuário para decisão humana (provavelmente invoke `unac-developer` para refactor maior).

## Red flags

- ❌ Paralelizar fixes (dois fixes no mesmo arquivo viram conflito)
- ❌ Passar ao worker "leia o review report" (passe descriptor completo no prompt)
- ❌ Fix além de 10 linhas sem declarar ESCALATED
- ❌ Pular global build (regressões escapam)
- ❌ Continuar além de 2 fix iterations sem escalar

## Sub-skill handoff

**REQUIRED NEXT:** `unac-review-implementation` (para re-validar). Se após 2 iterações ainda tem issues abertas: **ESCALATE** para decisão humana.
