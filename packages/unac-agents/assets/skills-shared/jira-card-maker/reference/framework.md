# Framework de Escrita | Jira | Histórias, Tarefas e Bugs

## FRAMEWORK DE ESCRITA
### Histórias de Usuário, Tarefas e Bugs no Jira

Guia Prático para Toda a Equipe Connect

### Para quem é este guia?

Este framework foi criado para qualquer pessoa da equipe que precise criar itens no Jira, independentemente do nível de experiência em Product Ownership.

## 1. Introdução e Objetivos

Este framework estabelece um padrão de escrita para criação de Histórias de Usuário, Tarefas e Bugs no Jira. O objetivo é garantir que qualquer membro da equipe consiga criar itens claros, completos e acionáveis, reduzindo retrabalho e aumentando a eficiência das entregas.

### Por que padronizar?

- Comunicação clara: todos entendem o que precisa ser feito
- Menos retrabalho: desenvolvimento entrega exatamente o solicitado
- Estimativas precisas: critérios claros facilitam o planejamento
- Rastreabilidade: histórico organizado para decisões futuras
- Satisfação do cliente: expectativas alinhadas desde o início

### Princípios SMART para Critérios de Aceitação

Todos os critérios de aceitação devem seguir o modelo SMART:

| Letra | Significa | Pergunta-chave |
|-------|-----------|---|
| S | Específico (Specific) | O critério descreve claramente o que deve acontecer? |
| M | Mensuravel (Measurable) | Como saberemos que foi concluído com sucesso? |
| A | Alcançável (Achievable) | É possível ser feito no contexto atual? |
| R | Relevante (Relevant) | Agrega valor real ao usuário ou ao negócio? |
| T | Com Prazo (Time-bound) | Há uma data ou sprint definida para entrega? |

## 2. História de Usuário

### O que é uma História de Usuário?

Uma História de Usuário descreve uma funcionalidade do ponto de vista do usuário final. Ela foca no VALOR entregue, não nos detalhes técnicos.

### 2.1 Fórmula Padrão

```
Como [PERSONA/PAPEL], eu quero [ACAO/FUNCIONALIDADE],
para que [BENEFÍCIO/VALOR].
```

### 2.2 Template Jira - História de Usuário

| Campo | Descrição / Instruções |
|-------|---|
| Título | HU-[Numero]: [Verbo no infinitivo + objeto]. Ex: HU-042: Filtrar produtos por categoria |
| Tipo de Item | História / Story |
| Prioridade | Critica / Alta / Média / Baixa |
| Sprint / Versão | Informar a sprint ou versão alvo |
| Componente | Módulo ou área do sistema afetada |
| Responsável | PO ou pessoa que criou a história |
| Descricao | (usar o formato abaixo no campo de descrição do Jira): |
| Estimativa | Story Points ou horas estimadas |

#### Descrição (formato para o campo do Jira):

```
## História de Usuário
Como [pessoa/papel], eu quero [acao/funcionalidade], para que [benefício/valor].

## Contexto e Motivação
[Explicar brevemente POR QUE essa história é necessária e qual problema ela resolve]

## Critérios de Aceitação
Usar o formato: DADO [condição inicial], QUANDO [acao do usuário], ENTÃO [resultado esperado]

CA01: Dado que o usuário está na página de produtos, QUANDO clicar no filtro de categoria, ENTÃO deve ver as opções disponíveis.

CA02: DADO que selecionou uma categoria, QUANDO o filtro for aplicado, ENTÃO somente produtos daquela categoria devem ser exibidos em menos de 2 segundos.

## Regras de Negócio
[Listar restrições, regras ou exceções importantes para esta funcionalidade]

## Notas Técnicas / Dependências
[APIs, serviços externos, outras histórias das quais depende, considerações de performance ou segurança]

## Definition of Done (DoD)
- [ ] Código desenvolvido e revisado (code review aprovado)
- [ ] Testes unitários escritos e passando
- [ ] Testes de integração realizados
- [ ] Critérios de aceitação validados com o PO
- [ ] Documentação atualizada (se aplicável)

## Mockups / Anexos
[Anexar protótipos, wireframes, prints ou links de design]
```

### 2.3 Exemplo Completo - História de Usuário

#### EXEMPLO: História de Usuário - Filtro de Produtos

| Campo | Conteúdo |
|-------|---|
| Título | HU-042: Filtrar produtos por categoria na loja virtual |
| Tipo | História / Story |
| Prioridade | Alta |
| Sprint | Sprint 15 |
| Componente | Catálogo de Produtos |
| Estimativa | 8 Story Points |

**História:**

Como cliente da loja virtual, eu quero filtrar os produtos por categoria, para que eu encontre rapidamente o que procuro sem ter que visualizar itens irrelevantes.

**Contexto:**

Atualmente o catálogo exibe todos os produtos sem filtros. Com mais de 500 itens, os clientes relatam dificuldade em encontrar produtos específicos, aumentando a taxa de abandono em 23% (dado Analytics - Outubro/2024).

**Critérios de Aceitação:**

- CA01: DADO que estou na página de catálogo, QUANDO visualizar a barra lateral, ENTÃO devo ver todas as categorias disponíveis com contador de produtos em cada uma.
- CA02: DADO que cliquei em uma categoria, QUANDO o filtro for aplicado, ENTÃO apenas produtos daquela categoria são exibidos e a URL é atualizada para permitir compartilhamento.
- CA03: DADO que nenhum produto existe na categoria selecionada, QUANDO o filtro for aplicado, ENTÃO uma mensagem amigável 'Nenhum produto encontrado nesta categoria' é exibida.

**Regras de Negócio:**

- Produtos sem categoria devem aparecer em 'Outros'
- Múltiplas categorias podem ser selecionadas simultaneamente (filtro OR)
- O filtro deve persistir durante a sessão do usuário

### 2.4 Checklist de Qualidade - História de Usuário

Antes de salvar a história, verifique:

- [ ] A história segue a fórmula 'Como... eu quero... para que...'?
- [ ] O benefício (para que) está claramente descrito?
- [ ] Há pelo menos 3 critérios de aceitação no formato DADO/QUANDO/ENTÃO?
- [ ] Os critérios são testáveis (é possível verificar se foram cumpridos)?
- [ ] As regras de negócio foram documentadas?
- [ ] Dependências com outras histórias foram identificadas?
- [ ] A Definition of Done está preenchida?
- [ ] Mockups ou referências visuais foram anexados?
- [ ] A história é pequena o suficiente para caber em uma sprint?
- [ ] A estimativa foi preenchida (Story Points ou horas)?

## 3. Tarefa (Task)

### O que é uma Tarefa?

Uma Tarefa representa uma ação técnica ou operacional necessária para o projeto, que não se encaixa no formato de História de Usuário. Pode ser uma atividade de configuração, refatoração, documentação, pesquisa ou qualquer trabalho técnico necessário.

### 3.1 Quando usar Tarefa ou História de Usuário?

| Use TAREFA quando... | Use HISTORIA quando... |
|---|---|
| Não há um usuário final beneficiado diretamente | Há um usuario que vai usar a funcionalidade |
| É uma atividade técnica (deploy, config, refatoração) | É uma funcionalidade de negócio |
| É pesquisa ou spike técnico | Entrega valor mensurável ao produto |
| É configuração de ambiente ou infraestrutura | Segue o fluxo Como... eu quero... para que... |

### 3.2 Template Jira - Tarefa

| Campo | Descrição / Instruções |
|-------|---|
| Título | TASK-[Número]: [Acabo clara e objetiva]. Ex: TASK-078: Configurar pipeline CI/CD no GitHub Actions |
| Tipo de Item | Tarefa / Task |
| Prioridade | Critica / Alta / Média / Baixa |
| Estimativa | Story Points ou horas estimadas |
| Sprint / Versão | Informar a sprint ou versão alvo |
| Responsável | Desenvolvedor ou pessoa responsável pela execução |
| História Pai | Vincular a História de Usuário relacionada (se houver) |
| Descricao | (usar o formato abaixo no campo de descrição do Jira): |

#### Descrição (formato para o campo do Jira):

```
## Objetivo da Tarefa
[Descrever em 1-3 frases o que será feito e por que é necessário]

## Escopo - O que será feito
[Listar detalhadamente todas as atividades que devem ser executadas dentro desta tarefa]

## Fora do Escopo - O que NÃO será feito
[Listar explicitamente o que NÃO está incluído nesta tarefa para evitar escopo extra]

## Critérios de Conclusão
- [ ] [Critério mensurável 1 - como saberemos que está pronto?]
- [ ] [Critério mensurável 2]
- [ ] [Critério mensurável 3]

## Pré-requisitos / Dependências
[Listar o que precisa estar pronto ANTES de iniciar esta tarefa, incluindo acessos, configurações e tarefas bloqueantes]

## Recursos e Referências
[Links de documentação, ADRs, tickets relacionados, exemplos de implementação ou qualquer referência útil]
```

### 3.3 Exemplo Completo - Tarefa

#### EXEMPLO: Tarefa Técnica - Pipeline CI/CD

| Campo | Conteúdo |
|-------|---|
| Título | TASK-078: Configurar pipeline CI/CD no GitHub Actions para o serviço de catálogo |
| Tipo | Tarefa / Task |
| Prioridade | Alta |
| Estimativa | 5 Story Points |
| Sprint | Sprint 14 |
| Responsavel | Time de DevOps |
| História Pai | HU-042: Filtrar produtos por categoria |

**Objetivo:**

Configurar pipeline de integração e entrega contínua para o micro serviço de catálogo, garantindo que todo código margeado na branch main seja automaticamente testado e implantado no ambiente de staging.

**Escopo (o que será feito):**

1. Criar arquivo .github/workflows/catalog-ci.yml
2. Configurar stage de build (Node 18, npm ci, npm run build)
3. Configurar stage de testes (jest com cobertura mínima de 80%)
4. Configurar deploy automático para staging após aprovação do PR

**Fora do Escopo:**

- Deploy em produção (será tratado em TASK-079)
- Configuração de outros microsserviços

**Critérios de Conclusão:**

- [ ] Pipeline executa automaticamente ao abrir ou atualizar um PR
- [ ] PR nao pode ser margeado se o pipeline falhar
- [ ] Deploy em staging ocorre automaticamente após merge em main

## 4. Bug / Defeito

### O que é um Bug?

Um Bug descreve um comportamento incorreto ou inesperado do sistema. Um bom relatório de bug deve conter informações suficientes para que qualquer desenvolvedor consiga reproduzir e corrigir o problema sem precisar de esclarecimentos adicionais.

### 4.1 Template Jira - Bug

| Campo | Descrição / Instruções |
|-------|---|
| Título | BUG-[Número]: [Comportamento incorreto + contexto]. Ex: BUG-213: Filtro de categoria nao funciona no Safari 17 |
| Tipo de Item | Bug |
| Severidade | Critica / Alta / Média / Baixa (ver tabela de severidades) |
| Prioridade | Critica / Alta / Média / Baixa |
| Ambiente | Produção / Staging / Desenvolvimento |
| Versão Afetada | Versão do sistema onde o bug foi encontrado |
| Componente | Módulo ou área do sistema afetada |
| Reportado por | Nome de quem encontrou o bug |
| Atribuído a | Desenvolvedor responsável pela correção |
| Descricao | (usar o formato abaixo no campo de descrição do Jira): |
| Estimativa | Story Points ou horas estimadas |

#### Descrição (formato para o campo do Jira):

```
## Resumo do Problema
[Descrição clara e direta do que está errado em 1-2 frases]

## Comportamento Atual (o que está acontecendo)
[Descrever exatamente o que acontece, incluindo mensagens de erro, comportamento inesperado e prints se possível]

## Comportamento Esperado (o que deveria acontecer)
[Descrever claramente como o sistema DEVERIA se comportar, com base nas regras de negócio ou especificação original]

## Passos para Reproduzir
1. [Primeiro passo - seja específico: 'Acesse a URL /catálogo']
2. [Segundo passo - 'Clique no filtro Categoria na barra lateral']
3. [Terceiro passo - 'Selecione a opção Eletronicos']
4. [Resultado observado - 'A página exibe todos os produtos sem filtrar']

## Ambiente de Reprodução
- Ambiente: [Produção / Staging / QA]
- Versão do sistema: [ex: v2.4.1]
- Navegador: [ex: Safari 17.0] / Sistema Operacional: [ex: macOS Sonoma 14.1]
- Dispositivo: [ex: Desktop / iPhone 15 / Samsung Galaxy S23]
- Frequência: [Sempre / Às vezes / Apenas uma vez]

## Impacto
[Descrever o impacto no negócio e nos usuários: quantos usuários afetados? Qual funcionalidade está bloqueada? Há workaround?]

## Evidências
[Anexar prints de tela, videos, logs de erro, traces ou qualquer evidência que ajude a diagnosticar]
[Se tiver log de console ou erro, colar aqui no formato de código]
```

### 4.2 Tabela de Severidades

| Severidade | Definição | Critério | Tempo de Resolução |
|---|---|---|---|
| Crítica | Sistema indisponível ou perda de dados | Interrupção total ou dados comprometidos para todos os usuários | Imediato (hot-fix) |
| Alta | Funcionalidade principal inoperante | Fluxo crítico bloqueado sem alternativa | Mesma sprint |
| Média | Funcionalidade parcialmente afetada | Há workaround, mais experiência prejudicada | Próxima sprint |
| Baixa | Problema cosmético ou de baixo impacto | Não afeta funcionalidades, apenas aparência e usabilidade minor | Backlog priorizado |

### 4.3 Exemplo Completo - Bug

#### EXEMPLO: Bug - Filtro de Categoria no Safari

| Campo | Conteúdo |
|-------|---|
| Título | BUG-213: Filtro de categoria não aplica resultado no Safari 17 em macOS |
| Tipo | Bug |
| Severidade | Alta |
| Prioridade | Alta |
| Ambiente | Produção |
| Versão | v2.4.1 |
| Frequência | Sempre reproduzível |
| Reportado por | Maria Silva (QA) - 15/11/2024 |
| Estimativa | 8 Story Points |


**Comportamento Atual:**

Ao selecionar qualquer categoria no filtro lateral, a página não filtra os produtos. Todos os 500+ itens continuam sendo exibidos, ignorando a seleção feita. Nenhuma mensagem de erro é exibida para o usuário.

**Comportamento Esperado:**

Ao selecionar uma categoria, apenas os produtos daquela categoria devem ser exibidos (conforme CA02 da HU-042). A URL deve ser atualizada com o parâmetro ?categoria=eletrônicos.

**Passos para Reproduzir:**

1. Abrir Safari 17 no macOS Sonoma 14.1
2. Acessar https://loja.exemplo.com/catálogo
3. Na barra lateral, clicar em 'Eletrônicos' no painel de categorias
4. Observar que todos os produtos continuam visíveis (resultado: nenhum filtro aplicado)

**Impacto:**

- Safari representa 31% do tráfego de acordo com Analytics (outubro/2024)
- Funcionalidade de filtro completamente inoperante para esses usuários
- Nao ha workaround disponível - usuario nao consegue filtrar de nenhuma outra forma

## 5. Boas Práticas e Erros Comuns

### 5.1 O que FAZER

- Ser específico: use números, porcentagens e exemplos concretos
  - Ex: 'carregar em menos de 2 segundos' em vez de 'carregar rapido'
- Pensar no usuário final: quem vai usar essa funcionalidade e o que espera?
- Escrever critérios testáveis: qualquer pessoa deve conseguir verificar se foi cumprido
- Dividir histórias grandes: se não cabe em uma sprint, dividir em partes menores
- Incluir evidências em bugs: print, videolog - quanto mais, melhor
- Referenciar outros itens: linkar história pai, bugs relacionados, PRs

### 5.2 O que NÃO FAZER

**Vago:**
- ❌ Fazer o sistema funcionar melhor
- ✅ Reduzir o tempo de resposta da API de busca de 800ms para menos de 200ms

**Técnico demais:**
- ❌ Refatorar o componente FilterPanel para usar React Query v5
- ✅ Como usuário, quero que o filtro de categoria aplique resultados instantaneamente, sem recarregar a página

**Sem critério:**
- ❌ O usuário deve conseguir fazer login
- ✅ CA01: DADO que informou email/senha válidos, QUANDO clicar em Entrar, ENTÃO é redirecionado ao dashboard em menos de 3 segundos

**Bug incompleto:**
- ❌ O botao nao funciona no Chrome
- ✅ BUG-214: Botão 'Adicionar ao carrinho' na página de detalhes do produto não responde ao clique no Chrome 119 em Windows 11

### 5.3 Dicas Rápidas para o Jira

- Use labels para categorizar: feature, improvement, technical-debt, ux
- Sempre linke histórias pai e filhos (Epic > História > Subtarefa)
- Adicione a label 'blocked' quando houver dependências não resolvidas
- Inclua o número da história no título dos commits: feat(HU-042): add category filter
- Atualize o status do item conforme o progresso: To Do > In Progress > In Review > Done
- Use o campo de comentários para registrar decisões técnicas tomadas durante o desenvolvimento

## 6. Resumo - Guia Rápido

| Campo | História de Usuário | Tarefa | Bug |
|-------|---|---|---|
| Foco | Valor para o usuário | Atividade técnica | Correcao de defeito |
| Fórmula | Como... eu quero... para que... | Objetivo + Escopo + Critérios | Atual vs Esperado + Passos |
| Critérios | DADO/QUANDO/ENTÃ O (mín. 3) | Critérios de conclusão | Comportamento esperado |
| Essencial | Contexto + Regras + DoD | Escopo + Fora do Escopo | Passos de reprodução + Impacto |
| Evidências | Mockups/Wireframes | Links e documentação | Prints, videos, logs |

---

**Lembre-se:**

Um item bem escrito economiza horas de reuniões, evita retrabalho e garante que a equipe entregou exatamente o que foi solicitado. Vale o esforço extra!