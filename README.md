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

Os agentes foram projetados para trabalhar em sequência, com handoffs explícitos entre cada etapa:

```
unac-product-owner
  └─► unac-solution-architect
        └─► unac-jira-maker
              └─► unac-tech-lead
                    └─► unac-developer
                          └─► unac-qa-engineer
                                └─► unac-code-reviewer
```

| Agente | Responsabilidade |
|--------|-----------------|
| `unac-product-owner` | Entende o pedido do usuário, pesquisa o codebase e orquestra a criação do card |
| `unac-solution-architect` | Avalia viabilidade técnica e define diretrizes arquiteturais |
| `unac-jira-maker` | Formata o card Jira com critérios de aceitação em GIVEN/WHEN/THEN |
| `unac-tech-lead` | Produz o plano de implementação detalhado com tarefas e arquivos |
| `unac-developer` | Implementa o plano, escreve testes unitários e assina o handoff para QA |
| `unac-qa-engineer` | Valida cada critério de aceitação com testes funcionais; aciona o developer em caso de falha (máx. 2 iterações) |
| `unac-code-reviewer` | Revisa qualidade, segurança e aderência ao plano; produz relatório de revisão |
| `unac-code-fix` | Agente auxiliar que aplica correções pontuais quando acionado pelo reviewer |

Cada agente grava seus artefatos em `.unac/{item-id}/` e só avança quando os gates de fase passam.

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
│   └── unac-fix-blockers/         # Loop code-fix por issue 🔴
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
git add agents/ skills/ packages/unac-agents/
git commit -m "release: bump unac-agents to vX.Y.Z"
git push
```

---

## Comportamento do instalador

Ao executar `npx unac-agents`:

1. Verifica Node.js >= 18.
2. Exibe banner com a versão do pacote.
3. Se `~/.copilot` existir com conteúdo, move para `~/.copilot-backup-<ISO-timestamp>` (mantém no máximo 3 backups; o mais antigo é removido automaticamente).
4. Copia `assets/agents/` → `~/.copilot/agents/`.
5. Copia `assets/skills/` → `~/.copilot/skills/`.
6. Exibe resumo com contagem de agentes e skills instalados.
