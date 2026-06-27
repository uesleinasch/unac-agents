---
name: unac-multirepo
description: Camada de orquestração multi-repo — quando a `unac-pipeline` detecta que um item abrange mais de um repositório, esta skill lê o workspace, resolve a ordem contract-first, pergunta a estratégia (de-uma-vez/por-etapa) e executa o ciclo test-first (Red→Green→QA→Review) repo a repo, reusando `unac-execute-plan`/`unac-review-implementation`/`unac-fix-blockers` com o `repo-path` de cada repo. Mantém a sessão principal enxuta (subagent-driven). Invocada pela `unac-pipeline` na Fase 5 quando `repo-mode = multi`.
---

# Unac Multi-Repo Skill

Você é o **controller multi-repo**. Coordena o trabalho de UM `item-id` em vários repositórios, repo a repo, na ordem contract-first, reusando as skills de execução/review/fix por repo. Guarda só **estado leve** (workspace + ponteiros); todo trabalho pesado roda em subagente isolado.

> **🛑 SUBAGENT-STOP:** Se você foi invocado como subagent, pule este skill.

## Input contract

- `item-id` (obrigatório).
- `.unac/{item-id}/workspace.md` — se não existir, crie a partir do template abaixo, usando os repos já confirmados pelo orquestrador no checkpoint multi-repo da `unac-pipeline`.
- `.unac/{item-id}/{item-id}_implementation-plan.md` com `Repo:` por task.
- `.unac/{item-id}/{item-id}_contract.md` — âncora da interface cross-repo.
- `.unac/{item-id}/{item-id}_jira-card.md` — fonte única dos ACs.

## Workspace template

```markdown
# Workspace — {item-id}

repos:
  - id: <id>    role: provider | consumer    path: <caminho>    build: "<cmd>"    test: "<cmd>"

exec-strategy: por-etapa | de-uma-vez
order: [<id>, ...]

progress:
  <id>: { red: pending, green: pending, qa: pending, review: pending }

decisions:
  - "YYYY-MM-DD <decisão registrada>"
```

## Checklist

1. Setup — ler/criar workspace, ler plano + contrato
2. Resolver ordem (contract-first)
3. Escolher estratégia (perguntar ao usuário)
4. Ciclo por repo (na ordem)
5. Handoff de volta à `unac-pipeline` (Fase 8)

## Passo 1 — Setup
- `Read` em `.unac/{item-id}/workspace.md` (ou `Write` do template com os repos confirmados).
- `Read` no `implementation-plan` (tasks com `Repo`) e no `contract`.
- `TodoWrite` com 1 todo por repo.

## Passo 2 — Resolver ordem
- Derive `order` das dependências/papéis: **provider antes do consumer** (contract-first). Grave em `order` no workspace via `Edit`.

## Passo 3 — Escolher estratégia
- Pergunte ao usuário: **`de-uma-vez`** ou **`por-etapa`**. Grave em `exec-strategy` e registre em `decisions`.
  - **por-etapa:** gate humano após cada repo (inclui o Red gate humano por repo).
  - **de-uma-vez:** encadeia os repos automaticamente; sem gate humano entre/dentro dos repos; o Red é **confirmado mecanicamente** (testes falham + verificação de hash no `unac-execute-plan`).

## Passo 4 — Ciclo por repo

Para cada repo na `order` (serial; provider antes do consumer):

1. **Red** — dispatch `unac-qa-engineer` com `mode: red`, `repo-path`, `repo-role` e `contract`. Escreve os testes de aceitação **no repo**, ancorados nos ACs do card + contrato, e confirma que **falham**.
   - `por-etapa`: apresente os testes vermelhos e **aprove com o usuário** antes de seguir (Red gate).
2. **Green** — invoque `Skill("unac-execute-plan")` passando `item-id` + `repo-path`/`repo-id` (só as tasks daquele repo). A skill injeta a constitution **do repo** e garante a imutabilidade dos testes.
3. **QA verify** — dispatch `unac-qa-engineer` com `mode: verify` e `repo-path`. Emite o veredito daquele repo.
4. **Review** — invoque `Skill("unac-review-implementation")` com `item-id` + `repo-path`. Se `Requires Changes` → `Skill("unac-fix-blockers")` (com `repo-path`), depois re-review (limite 2 ciclos).
5. Atualize `progress[repo]` no workspace via `Edit` após cada subpasso.
6. **Gate:** `por-etapa` → apresente o resultado do repo e aguarde o usuário antes do próximo. `de-uma-vez` → siga automaticamente.

> O **consumer** só inicia após o **provider** estar verde — isso permite o **e2e de fumaça** do consumer contra o provider real (além do contract test contra o mock do contrato).

## Red flags
- ❌ Paralelizar repos com dependência de contrato (provider deve estar verde antes do consumer)
- ❌ Carregar o conteúdo dos subagentes na sessão principal — guarde só ponteiros/estado no `workspace.md`
- ❌ Deixar editar testes de aceitação (imutabilidade por repo é garantida no `unac-execute-plan`)
- ❌ Avançar em `por-etapa` sem o gate humano entre repos
- ❌ Tocar arquivos fora dos repos registrados no `workspace.md`

## Artefatos por repo

- **Hub** (no repo de origem): `workspace.md`, `jira-card`, `implementation-plan`, `contract`, `plan-briefing`, `research`, `codebase-context`, `user-context`.
- **Por repo** (execução): `{item-id}_implementation-progress_<repo>.md`, `{item-id}_qa-report_<repo>.md`, `{item-id}_code-review-report_<repo>.md`, `{item-id}_fix-report_<repo>.md`.
- **Código e testes** vivem em cada repositório real (em `<repo>.path`).

## Sub-skills invocadas
- `unac-execute-plan` (Green, por repo)
- `unac-review-implementation` (Review, por repo)
- `unac-fix-blockers` (Fix, por repo)

## Handoff
Quando todos os repos estão `review: approved`, retorne para a `unac-pipeline` **Fase 8 (closure)** com um resumo por repo (tasks, testes, review). Se algum repo travar, escale ao usuário com o estado do `workspace.md`.
