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
- Plano esperado em `.unac/{item-id}/{item-id}_implementation-plan.md`
- `repo-path` (opcional; default: **cwd**) e `repo-id` (opcional) — quando informados (modo multi-repo), opere **nesse repo**: implemente apenas as tasks cujo campo `Repo` casa com `repo-id`, rode o build/test daquele repo (definidos em `.unac/{item-id}/workspace.md`) e use a `.unac/constitution.md` **daquele** repo. Os artefatos passam a ser sufixados por repo (`{item-id}_implementation-progress_<repo>.md`) e o hash dos testes de aceitação é calculado sobre os arquivos daquele repo. **Sem `repo-path`, o comportamento é single-repo, idêntico ao atual.**

## Checklist

Crie TODO items para:

1. Setup — criar progress file e enumerar tasks em memória
2. Execute loop — 1 dispatch por task, serial
3. Build verification global
4. Handoff — apresentar resultado para a fase seguinte

## Passo 1 — Setup

1. **Leia o plano UMA vez**: `Read` em `.unac/{item-id}/{item-id}_implementation-plan.md`.
2. **Leia a constitution**: `Read` em `.unac/constitution.md` e produza um `constitution-summary` curto (princípios que afetam a implementação) para injetar nos prompts.
3. **Localize os testes de aceitação** (escritos na Fase 4.5): use o `{item-id}_qa-report.md` e/ou a `## Traceability Matrix` do plano para listar os arquivos `{item-id}.qa.test.*`. **Calcule e guarde o hash** de cada um (via `Bash`: `git hash-object <arquivo>` ou `sha256sum <arquivo>`). Esse baseline detecta adulteração.
4. **Extraia cada task em memória** (estrutura de dados): para cada task, capture:
   - `task-number`
   - `description` (texto completo)
   - `ambient`
   - `files-to-modify` (lista)
   - `acceptance-criteria` (lista)
   - `technical-notes`
   - `subtasks` (se houver)
5. **Registre os Parallelizable Groups** do plano no progress file (apenas informativo — a execução é serial por ora).
6. **Crie o progress file** via `Write` em `.unac/{item-id}/{item-id}_implementation-progress.md` com todas as tasks listadas como `pending` (template abaixo).
7. **Crie TodoWrite** com 1 todo por task.

### Progress file template

```markdown
# Implementation Progress — {item-id}

**Started**: YYYY-MM-DD
**Plan source**: `.unac/{item-id}/{item-id}_implementation-plan.md`

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
    progress-file: .unac/{item-id}/{item-id}_implementation-progress.md
    plan-file: .unac/{item-id}/{item-id}_implementation-plan.md

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

    ## Constitution (resumo — respeite)
    {constitution-summary}

    ## Acceptance tests (JÁ existentes — IMUTÁVEIS — faça-os passar, não os edite)
    {lista de caminhos {item-id}.qa.test.*}

    Implement ONLY this task (Green: faça os testes de aceitação acima passarem; depois refatore mantendo-os verdes).
    Do NOT edit acceptance test files. Mark progress file and plan file on start/completion.
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

**Verificação pós-dispatch**: após cada DONE, use `Read` em `{item-id}_implementation-progress.md` e confirme a task marcada `completed`. Se não estiver, trate como BLOCKED.

**Verificação de imutabilidade dos testes**: após cada DONE, recalcule o hash de cada `{item-id}.qa.test.*` e compare com o baseline do Passo 1. Se algum mudou, o developer adulterou um teste de aceitação para passar → trate como **BLOCKED**, reverta a alteração do teste e escale ao usuário.

## Passo 3 — Global build verification

Após TODAS as tasks marcarem `completed`:

- Use `Bash` para rodar `npm run build && npm run lint` (ou equivalente) **e os testes de aceitação** (`{item-id}.qa.test.*`).
- **Revalide o hash** de cada teste de aceitação contra o baseline do Passo 1 — devem estar idênticos.
- Se falhar (build/lint, teste de aceitação vermelho, ou hash divergente):
  - Identifique a task/arquivo responsável.
  - Re-dispatch `unac-developer` com prompt de fix (`failing-files: [...]`, `lint-output: ...`) — **nunca** "consertar" editando o teste de aceitação.
  - Max 2 retries globais.
- Se passar:
  - Use `Edit` em `{item-id}_implementation-progress.md` adicionando:
    ```
    ## Review Handoff
    status: ready-for-review
    date: YYYY-MM-DD
    ```

## Passo 4 — Handoff

Anuncie ao usuário:
> "Implementação de {item-id} completa. Build + lint limpos. Progresso em `.unac/{item-id}/{item-id}_implementation-progress.md`. Próximo passo sugerido: invocar `unac-qa-engineer` (ou continuar via `unac-pipeline` Fase 6)."

## Red flags

- ❌ Dispatch paralelo de múltiplos `unac-developer` (serial por ora; os Parallelizable Groups do plano são apenas mapeados — execução paralela via git worktrees é evolução futura)
- ❌ Deixar o developer editar testes de aceitação (`{item-id}.qa.test.*`) — verifique o hash após cada DONE
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
