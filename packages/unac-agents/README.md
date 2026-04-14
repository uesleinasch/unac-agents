# unac-agents

> Agentes e skills para **GitHub Copilot no VS Code** — cobrindo todo o ciclo de desenvolvimento de software, da criação do card Jira até a revisão de código.

[![npm version](https://img.shields.io/npm/v/unac-agents.svg)](https://www.npmjs.com/package/unac-agents)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Instalação

```bash
npx unac-agents
```

O instalador:
1. Verifica que você possui Node.js >= 18.
2. Se `~/.copilot` já existir com conteúdo, move tudo para um backup timestampado (`~/.copilot-backup-<ISO>`) — mantém no máximo **3 backups**, removendo o mais antigo automaticamente.
3. Copia os agentes para `~/.copilot/agents/` e as skills para `~/.copilot/skills/`.
4. Instala o servidor **interactive-mcp** localmente e atualiza o `mcp.json` do VS Code para registrá-lo.

### Flags disponíveis

| Flag | Descrição |
|------|-----------|
| `--yes`, `-y` | Pula a confirmação interativa (útil em scripts) |
| `--dry-run` | Lista o que seria instalado sem gravar nada |

```bash
# Sem confirmação interativa
npx unac-agents --yes

# Prévia do que seria instalado
npx unac-agents --dry-run
```

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
                                      └─► unac-code-fix (quando necessário)
```

| Agente | Responsabilidade |
|--------|-----------------|
| `unac-product-owner` | Entende o pedido, pesquisa o codebase e orquestra a criação do card |
| `unac-solution-architect` | Avalia viabilidade técnica e define diretrizes arquiteturais |
| `unac-jira-maker` | Formata o card Jira com critérios de aceitação em GIVEN/WHEN/THEN |
| `unac-tech-lead` | Produz o plano de implementação com tarefas e arquivos |
| `unac-developer` | Implementa o plano e escreve testes unitários |
| `unac-qa-engineer` | Valida cada critério de aceitação com testes funcionais |
| `unac-code-reviewer` | Revisa qualidade, segurança e aderência ao plano |
| `unac-code-fix` | Aplica correções pontuais quando acionado pelo reviewer |

Cada agente grava seus artefatos em `.unac/{item-id}/` e só avança quando os gates de fase passam.

---

## Skills incluídas

| Skill | Descrição |
|-------|-----------|
| `clean-code` | Princípios SOLID, DRY, KISS aplicados ao código |
| `api-patterns` | REST, GraphQL, tRPC, autenticação, rate limiting e mais |
| `frontend-design` | UI/UX, sistema de cores, tipografia, animações |
| `database-design` | Schema design, migrações, indexação, seleção de ORM |
| `code-review` | Revisão de arquitetura, segurança, performance e testes |
| `code-review-checklist` | Checklist estruturado para revisões de código |
| `jira-card-maker` | Templates e framework para criação de cards Jira |
| `haskell-engineering` | Padrões de engenharia Haskell com Relude |
| `testing-patterns` | Padrões e boas práticas de testes |

---

## MCP interativo

Após a instalação, o servidor **interactive-mcp** fica disponível como ferramenta MCP no Copilot sob o nome `interactive`. Ele permite que os agentes façam perguntas diretamente ao usuário via pop-up de terminal, com suporte a:

- Opções pré-definidas com navegação por setas
- Input de texto livre
- Sessões de chat persistentes para múltiplas perguntas sequenciais
- Timeout configurável

---

## Requisitos

- **Node.js >= 18**
- **VS Code** com GitHub Copilot habilitado

---

## Apoie o projeto

Se este pacote foi útil para você, considere apoiar o desenvolvimento:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://www.buymeacoffee.com/uesleinac)

---

## Licença

MIT © [Ueslei Nascimento](https://github.com/uesleinac)
