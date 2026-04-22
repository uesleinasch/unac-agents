---
name: unac-execute-plan
description: Loop de implementação serial — lê o implementation plan de um item-id, extrai cada task em memória, e dispatcha `unac-developer` uma vez por task. Cria progress file, atualiza TODO, roda build global ao final. Use quando o plano já foi aprovado (via Gate C do unac-pipeline) e é hora de transformar tasks em código. Workers nunca spawnam workers — esta skill é o único ponto de dispatch.
---

# Unac Execute Plan Skill

Você é o **controller de implementação**. Sua responsabilidade é ler o plano, extrair texto completo de cada task, e dispatchar `unac-developer` serialmente.

> **🛑 SUBAGENT-STOP:** Se você foi invocado como subagent, pule este skill.

## Input contract

Você recebe via prompt ou contexto:
- `item-id` (obrigatório)
- Plano esperado em `.unac/{item-id}/{item-id}_implementation_plan.md`

## Checklist

Crie TODO items para:

1. Setup — criar progress file e enumerar tasks em memória
2. Execute loop — 1 dispatch por task, serial
3. Build verification global
4. Handoff — apresentar resultado para a fase seguinte

## Passo 1 — Setup

1. **Leia o plano UMA vez**: `Read` em `.unac/{item-id}/{item-id}_implementation_plan.md`.
2. **Extraia cada task em memória** (estrutura de dados): para cada task, capture:
   - `task-number`
   - `description` (texto completo)
   - `ambient`
   - `files-to-modify` (lista)
   - `acceptance-criteria` (lista)
   - `technical-notes`
   - `subtasks` (se houver)
3. **Crie o progress file** via `Write` em `.unac/{item-id}/{item-id}_implementation_progress.md` com todas as tasks listadas como `pending` (template abaixo).
4. **Crie TodoWrite** com 1 todo por task.

### Progress file template

```markdown
# Implementation Progress — {item-id}

**Started**: YYYY-MM-DD
**Plan source**: `.unac/{item-id}/{item-id}_implementation_plan.md`

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | {description} | pending |
| 2 | {description} | pending |

## Blockers
- (preenchido se aparecerem)

## Notes
- (decisões, trade-offs)

## Review Handoff
status: pending
```

## Passo 2 — Execute loop

**Serial, não paralelo.** Tasks de um mesmo plano podem tocar arquivos compartilhados.

Para cada task (em ordem):

### Dispatch

```
Agent(
  subagent_type: "unac-developer",
  description: "Implement task {task-number} of {item-id}",
  prompt: <<PROMPT
    item-id: {item-id}
    task-number: {task-number}
    progress-file: .unac/{item-id}/{item-id}_implementation_progress.md
    plan-file: .unac/{item-id}/{item-id}_implementation_plan.md

    ## Task Description
    {description-completo-da-task}

    ## Ambient
    {ambient}

    ## Files to modify
    {lista}

    ## Acceptance Criteria
    {lista}

    ## Technical Notes
    {notes}

    ## Subtasks
    {se houver}

    Implement ONLY this task. Mark progress file and plan file on start/completion.
    Return closed status (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT).
  PROMPT
)
```

### Handle response

Parse o STATUS do retorno:

| Status | Ação |
|--------|------|
| `DONE` | Marque TODO completo. Avance para próxima task IMEDIATAMENTE (sem gate humano entre tasks). Anuncie inline. |
| `DONE_WITH_CONCERNS` | Logue concerns. Se não bloquear, avance. Se for decisão sensível, pergunte ao usuário. |
| `BLOCKED` | PARE o loop. Apresente ao usuário: descrição do blocker + arquivos envolvidos. Pergunte: (A) retry com mais contexto, (B) dividir task, (C) escalar a `unac-tech-lead`, (D) abortar. |
| `NEEDS_CONTEXT` | Forneça o contexto faltante (releia o plano, busque arquivos, pergunte ao usuário). Re-dispatch com prompt enriquecido. |

**Verificação pós-dispatch**: após cada DONE, use `Read` em `{item-id}_implementation_progress.md` e confirme a task marcada `completed`. Se não estiver, trate como BLOCKED.

## Passo 3 — Global build verification

Após TODAS as tasks marcarem `completed`:

- Use `Bash` para rodar `npm run build && npm run lint` (ou equivalente).
- Se falhar:
  - Identifique a task/arquivo responsável.
  - Re-dispatch `unac-developer` com prompt de fix (`failing-files: [...]`, `lint-output: ...`).
  - Max 2 retries globais.
- Se passar:
  - Use `Edit` em `{item-id}_implementation_progress.md` adicionando:
    ```
    ## Review Handoff
    status: ready-for-review
    date: YYYY-MM-DD
    ```

## Passo 4 — Handoff

Anuncie ao usuário:
> "Implementação de {item-id} completa. Build + lint limpos. Progresso em `.unac/{item-id}/{item-id}_implementation_progress.md`. Próximo passo sugerido: invocar `unac-qa-engineer` (ou continuar via `unac-pipeline` Fase 6)."

## Red flags

- ❌ Dispatch paralelo de múltiplos `unac-developer` (tasks podem conflitar em arquivos)
- ❌ Fazer o subagent reler o plano (passe texto completo no prompt)
- ❌ Perguntar ao usuário entre cada task (serial mas sem gate humano)
- ❌ Pular a verificação do progress file após cada DONE
- ❌ Ignorar BLOCKED — sempre escale
- ❌ Modificar arquivos de teste durante fix loops do QA — apenas código-fonte

## Failure modes

- **Worker retorna texto fora do formato fechado**: trate como falha de contrato. Re-dispatch uma vez pedindo formato estrito. Se falhar de novo, escale.
- **Progress file não atualizado após DONE**: o worker pode ter mentido. Releia; se de fato não atualizado, trate como BLOCKED.
- **Build falha após última task**: re-dispatch com contexto do erro. Se falhar 2x, escale.

## Sub-skill handoff

Quando esta skill retorna com sucesso, o pipeline pai deve invocar em seguida:

**REQUIRED NEXT:** `unac-qa-engineer` (via `Agent`) ou a próxima fase do `unac-pipeline`.
