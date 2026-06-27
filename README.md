# unac-agents

Coleção de agentes e skills cobrindo todo o ciclo de desenvolvimento — da criação do card Jira até a revisão de código. Suporta **GitHub Copilot no VS Code** e **Claude Code**.

---

## Instalação

```bash
npx unac-agents
```

O instalador pergunta o alvo:

- **VS Code (GitHub Copilot)** → copia agentes e skills para `~/.copilot` (o Copilot detecta automaticamente). Também instala o servidor `interactive-mcp` local e configura o `mcp.json`. Se `~/.copilot` já existir com conteúdo, é salvo em `~/.copilot-backup-<timestamp>` antes (máx. 3 backups).
- **Claude Code** → pergunta o escopo:
  - **Global** → copia para `~/.claude/agents/` e `~/.claude/skills/` (overlay cirúrgico, não apaga nada existente).
  - **Local** → copia para `<repo-atual>/.claude/agents/` e `<repo-atual>/.claude/skills/`.

O alvo Claude Code **não instala MCP** — os agentes atômicos do Claude Code não dependem da ponte interativa do Copilot.

### Flags (não-interativo / CI)

```bash
# VS Code:
npx unac-agents --target=vscode --yes

# Claude Code global:
npx unac-agents --target=claude-code --scope=global --yes

# Claude Code local:
npx unac-agents --target=claude-code --scope=local --yes

# Preview sem escrever arquivos:
npx unac-agents --target=<vscode|claude-code> [--scope=<global|local>] --dry-run
```

**Requisitos:** Node.js >= 18

---

## Pipeline de agentes

Os agentes trabalham em sequência, com handoffs explícitos e gates humanos. O fluxo do Claude Code é **test-first**: o `unac-qa-engineer` escreve os testes de aceitação (modo `red`) **antes** da implementação e os valida (modo `verify`) **depois**:

```
.unac/constitution.md  →  princípios do projeto, lidos por todo o fluxo

unac-product-owner                      (pesquisa + bootstrap da constitution)
  │  ↑ Fase 1: unac-explore faz fan-out paralelo (read-only) de unac-explorer
  │    + unac-finding-verifier para produzir contexto verificado
  └─► unac-jira-maker                   (card + ACs em GIVEN/WHEN/THEN + clarify)
        └─► unac-solution-architect     (plano + NFR matrix + grupos paralelizáveis)
              └─► unac-tech-lead        (valida + Traceability Matrix: AC→task→teste)
                    └─► unac-qa-engineer · modo red    (testes de aceitação FALHANDO ◄ Red gate)
                          └─► unac-developer           (Green: faz passar + refactor)
                                └─► unac-qa-engineer · modo verify   (roda os testes imutáveis)
                                      └─► unac-code-reviewer         (+ audita constitution/NFR)
                                      │   ↑ Fase 7: unac-verify-review verifica adversarialmente
                                      │     os 🔴 BLOCKING antes de declarar overall result
                                            └─► unac-code-fix        (correções ≤ 10 linhas)
```

| Agente | Responsabilidade |
|--------|-----------------|
| `unac-product-owner` | Entende o pedido do usuário, pesquisa o codebase e o contexto web; produz os artefatos de pesquisa |
| `unac-jira-maker` | Formata o card Jira com critérios de aceitação em GIVEN/WHEN/THEN |
| `unac-solution-architect` | Produz o plano de implementação detalhado a partir do card: briefing, arquitetura, tasks, dependências e NFRs |
| `unac-tech-lead` | Valida o plano existente e decompõe as tasks em unidades developer-ready com critérios verificáveis |
| `unac-developer` | Implementa cada task para fazer passar os testes de aceitação já escritos (Green), refatora e escreve testes unitários; nunca edita os testes de aceitação |
| `unac-qa-engineer` | Modo `red`: escreve os testes de aceitação a partir dos ACs do card e confirma que falham (antes da implementação). Modo `verify`: roda os testes imutáveis e emite o veredito (máx. 2 iterações de fix) |
| `unac-code-reviewer` | Revisa qualidade, segurança e aderência ao plano; produz relatório de revisão |
| `unac-code-fix` | Agente auxiliar que aplica correções pontuais (≤ 10 linhas) por issue 🔴 BLOCKING quando acionado |
| `unac-explorer` | Worker read-only de fan-out: coleta fatos do codebase em paralelo (Fase 1, via skill `unac-explore`) |
| `unac-finding-verifier` | Worker read-only de fan-out: verifica adversarialmente os fatos coletados pelo `unac-explorer` (Fase 1) e os blockers de review (Fase 7, via skill `unac-verify-review`) |

Cada agente grava seus artefatos em `.unac/{item-id}/` seguindo a convenção canônica `{item-id}_<nome-em-kebab>.md` (ex.: `PROJ-123_implementation-plan.md`, `PROJ-123_qa-report.md`) e só avança quando os gates de fase passam. A lista canônica completa — qual artefato cada fase cria, lê e edita — é a fonte da verdade em `skills-claude/unac-pipeline/SKILL.md`; não crie artefatos fora dessa lista (sem placeholders, sem nomes ad-hoc).

### Fluxo spec-driven + test-first (Claude Code)

O fluxo orquestrado do Claude Code (skills em `skills-claude/`) é **spec-driven** e **test-first**:

- **Constitution** — o arquivo **global** `.unac/constitution.md` guarda os princípios não-negociáveis do projeto (stack, convenções, política de testes, segurança). É criado no início do fluxo e respeitado por `solution-architect`, `tech-lead`, `developer`, `code-reviewer` e `code-fix`.
- **Test-first (Red → Green → Refactor)** — antes de qualquer implementação, o `unac-qa-engineer` (modo `red`) escreve os testes de aceitação derivados dos critérios do card e confirma que **falham**; um gate humano aprova esses testes vermelhos; só então o `unac-developer` implementa para fazê-los passar (Green) e refatora. Os testes de aceitação são **imutáveis** durante a implementação (verificação por hash) e o QA (modo `verify`) os executa ao final.
- **O `jira-card` é a fonte única de verdade dos testes de aceitação** — nunca os critérios técnicos por-task do plano.
- **Traceability Matrix** — o `unac-tech-lead` mapeia cada critério do card → task → teste; a aprovação do plano só passa com cobertura completa.
- **Clarify** — ambiguidades nos critérios são resolvidas na aprovação do card, antes da arquitetura.
- **NFR Matrix** — requisitos não-funcionais são classificados em mensuráveis (testados pelo QA) e auditáveis (revisados pelo `code-reviewer`).

> Disponível hoje no fluxo do Claude Code (`skills-claude/`). A paridade no fluxo VS Code está planejada.

### Modo multi-repo (Claude Code)

Quando a investigação (`unac-product-owner`) detecta que o item abrange mais de um repositório (ex.: front + API), a pipeline comuta para o **modo multi-repo**:

- **Detecção e confirmação** — o PO sinaliza a suspeita (declaração do usuário, dependência externa, ou responsabilidade de camada); o orquestrador confirma com você.
- **Descoberta de repos** — lê o diretório pai em busca de `.git` e sugere candidatos; se não achar, pergunta os caminhos. Tudo registrado em `.unac/{item-id}/workspace.md`.
- **Contract-first** — o `unac-solution-architect` produz um `{item-id}_contract.md` (a interface entre os repos); o provider é implementado antes do consumer.
- **Orquestração** — a skill `unac-multirepo` executa o ciclo test-first **por repo** (Red→Green→QA→Review), reusando as skills de execução/review/fix com o caminho de cada repo, sempre subagent-driven.
- **De uma vez ou por etapa** — você escolhe; "por etapa" tem gate humano entre repos, "de uma vez" encadeia automaticamente. A escolha fica no `workspace.md`.

> Single-repo continua o **default** e permanece inalterado.

---

## Estrutura do repositório

```
unac-agents/
├── agents-vscode/                 # Agentes para VS Code / Copilot (.agent.md)
├── agents-claude/                 # Agentes atômicos para Claude Code (.md)
├── skills-shared/                 # Skills de conteúdo usadas pelos dois IDEs
│   ├── clean-code/
│   ├── api-patterns/
│   ├── frontend-design/
│   ├── database-design/
│   ├── haskell-engineering/
│   ├── jira-card-maker/
│   ├── testing-patterns/
│   ├── code-review/
│   └── code-review-checklist/
├── skills-claude/                 # Skills de orquestração Claude Code-only
│   ├── unac-pipeline/             # Meta-flow PO → SA → TL → Dev → QA → Rev → Fix
│   ├── unac-execute-plan/         # Loop developer por task
│   ├── unac-review-implementation/ # Loop reviewer por task
│   ├── unac-fix-blockers/         # Loop code-fix por issue 🔴
│   ├── unac-explore/              # Fan-out paralelo read-only (Fase 1): explorer + verifier
│   └── unac-verify-review/        # Verificação adversarial de blockers (Fase 7)
├── packages/
│   ├── unac-agents/               # Pacote npm publicável (instalador)
│   │   ├── bin/install.js
│   │   ├── src/
│   │   │   ├── backup.js          # Backup do ~/.copilot (somente VS Code)
│   │   │   ├── copy.js            # copyVscodeAssets + copyClaudeCodeAssets
│   │   │   ├── mcp.js             # Instala interactive-mcp (somente VS Code)
│   │   │   └── ui.js              # Banner, spinner, prompts
│   │   └── assets/                # Gerado por `npm run prepare`
│   │       ├── agents-vscode/
│   │       ├── agents-claude/
│   │       ├── skills-shared/
│   │       ├── skills-claude/
│   │       └── mcp/interactive-mcp/
│   └── interactive-mcp/           # Servidor MCP interativo (TypeScript + Ink)
└── specs/
```

> `agents-vscode/`, `agents-claude/`, `skills-shared/` e `skills-claude/` são as **fontes da verdade**. O conteúdo de `packages/unac-agents/assets/` é gerado automaticamente — nunca edite dentro de `assets/`.

---

## Desenvolvimento local

### Editando um agente existente

1. Edite o arquivo apropriado:
   - `agents-vscode/<nome>.agent.md` para GitHub Copilot
   - `agents-claude/<nome>.md` para Claude Code
2. Sincronize para o pacote:
   ```bash
   cd packages/unac-agents
   npm run prepare
   ```
3. Teste a instalação localmente (dry-run para preview):
   ```bash
   node bin/install.js --target=claude-code --scope=local --dry-run
   ```

### Criando um novo agente

1. Decida o alvo:
   - **VS Code**: crie em `agents-vscode/<nome>.agent.md` seguindo o padrão existente (frontmatter com `target: vscode`, `tools`, `handoffs:`, corpo `<agent>` com fases).
   - **Claude Code**: crie em `agents-claude/<nome>.md` como worker atômico (frontmatter enxuto com `name`, `description`, `tools` CSV, `model`; corpo com Role + Input contract + Your work + Return format fechado `STATUS: DONE | ...`).
2. Sincronize com `npm run prepare`.

### Criando uma nova skill

- **Skill de conteúdo** (usável pelos dois IDEs): crie em `skills-shared/<nome>/SKILL.md`.
- **Skill de orquestração Claude Code-only**: crie em `skills-claude/<nome>/SKILL.md` seguindo o padrão `unac-pipeline`/`unac-execute-plan` (checklist, dispatch pattern, red flags, sub-skill handoff).
- Depois: `npm run prepare` no pacote.

---

## Publicando uma nova versão

### 1. Atualizar o conteúdo

Faça todas as alterações em `agents-vscode/`, `agents-claude/`, `skills-shared/` e/ou `skills-claude/`. Ao terminar, sincronize os assets:

```bash
cd packages/unac-agents
npm run prepare
```

O script `sync-assets.js` copia tudo das 4 pastas-fonte + o build do `interactive-mcp` para `assets/`, sobrescrevendo o que estava lá.

### 2. Incrementar a versão

Dentro de `packages/unac-agents/`, use o `npm version` para atualizar o `package.json` e criar a tag git automaticamente:

```bash
# Correção de bug (1.0.0 → 1.0.1)
npm version patch

# Nova funcionalidade retrocompatível (1.0.0 → 1.1.0)
npm version minor

# Mudança incompatível / grande (1.0.0 → 2.0.0)
npm version major
```

### 3. Publicar no npm

```bash
npm run release
# equivalente a: npm publish
```

> Certifique-se de estar autenticado (`npm login`) e de ter permissão de publicação no pacote `unac-agents`.

### 4. Commitar e fazer push

```bash
# Volte para a raiz do repositório
cd ../..
git add agents-vscode/ agents-claude/ skills-shared/ skills-claude/ packages/unac-agents/
git commit -m "release: bump unac-agents to vX.Y.Z"
git push
```

---

## Comportamento do instalador

Ao executar `npx unac-agents`:

1. Verifica Node.js >= 18.
2. Exibe banner com a versão do pacote.
3. Pergunta o alvo (VS Code ou Claude Code) — ou usa as flags `--target`/`--scope`.

**Alvo VS Code:**

4. Se `~/.copilot` existir com conteúdo, move para `~/.copilot-backup-<ISO-timestamp>` (mantém no máximo 3 backups; o mais antigo é removido automaticamente).
5. Copia `assets/agents-vscode/` → `~/.copilot/agents/` e `assets/skills-shared/` → `~/.copilot/skills/`.
6. Instala o servidor `interactive-mcp` local e configura o `mcp.json`.

**Alvo Claude Code** (escopo global `~/.claude/` ou local `<repo>/.claude/`):

4. Copia `assets/agents-claude/` → `<claudeDir>/agents/` (overlay cirúrgico, não apaga nada existente).
5. Copia `assets/skills-shared/` + `assets/skills-claude/` → `<claudeDir>/skills/`.
6. Não instala MCP — os agentes atômicos do Claude Code não dependem da ponte interativa do Copilot.

Ao final, exibe resumo com a contagem de agentes e skills instalados.
