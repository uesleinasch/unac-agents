# unac-agents

Coleção de agentes e skills para o **GitHub Copilot no VS Code**, cobrindo todo o ciclo de desenvolvimento de software — da criação do card Jira até a revisão de código.

---

## Instalação

```bash
npx unac-agents
```

O comando copia os agentes e skills para `~/.copilot`, onde o GitHub Copilot os detecta automaticamente. Se já houver conteúdo em `~/.copilot`, ele é salvo em `~/.copilot-backup-<timestamp>` antes de qualquer alteração (máximo de 3 backups).

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
├── agents/                        # Fonte da verdade dos agentes (.agent.md)
├── skills/                        # Fonte da verdade das skills
│   ├── clean-code/
│   ├── api-patterns/
│   ├── frontend-design/
│   ├── database-design/
│   ├── haskell-engineering/
│   ├── jira-card-maker/
│   ├── code-review/
│   └── code-review-checklist/
├── packages/
│   └── unac-agents/               # Pacote npm publicável
│       ├── package.json
│       ├── bin/
│       │   └── install.js         # Entry point do CLI (npx unac-agents)
│       ├── src/
│       │   ├── backup.js          # Lógica de backup timestampado
│       │   ├── copy.js            # Copia assets/ para ~/.copilot
│       │   └── ui.js              # Banner, spinner e mensagens (chalk + ora)
│       └── assets/                # Cópia empacotada de agents/ e skills/
│           ├── agents/
│           └── skills/
└── specs/                         # Documentos de design e decisões técnicas
```

> `agents/` e `skills/` são a **fonte da verdade**. `packages/unac-agents/assets/` é gerado automaticamente — nunca edite diretamente dentro de `assets/`.

---

## Desenvolvimento local

### Editando um agente existente

1. Edite o arquivo em `agents/<nome>.agent.md`.
2. Sincronize para o pacote:
   ```bash
   cd packages/unac-agents
   npm run prepare
   ```
3. Teste a instalação localmente:
   ```bash
   node bin/install.js
   ```

### Criando um novo agente

1. Crie o arquivo em `agents/<nome>.agent.md` seguindo a estrutura dos agentes existentes (frontmatter YAML + `<agent>` com role, expertise, directives e workflow em fases).
2. Sincronize com `npm run prepare` (descrito acima).

### Criando uma nova skill

1. Crie um diretório em `skills/<nome>/` com pelo menos um arquivo `.md` de conteúdo.
2. Sincronize com `npm run prepare`.

---

## Publicando uma nova versão

### 1. Atualizar o conteúdo

Faça todas as alterações em `agents/` e/ou `skills/`. Ao terminar, sincronize os assets:

```bash
cd packages/unac-agents
npm run prepare
```

O script `sync-assets.js` copia tudo de `../../agents` e `../../skills` para `assets/` sobrescrevendo o que estava lá.

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
