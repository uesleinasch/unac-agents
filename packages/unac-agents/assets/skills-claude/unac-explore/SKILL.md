---
name: unac-explore
description: Exploração acurada de contexto via fan-out paralelo + verificação adversarial. Decompõe o pedido em ângulos independentes, dispatcha unac-explorer em paralelo, deduplica, verifica fatos load-bearing com unac-finding-verifier e sintetiza um codebase-context verificado. Use no pipeline (Fase 1) ou standalone para entender um problema/subsistema. Knob depth controla custo (quick|standard|deep).
---

# Unac Explore Skill

## Overview

**Princípio central**: paralelo só em read-only; a skill é o único ponto de escrita em `.unac/`.

Workers (`unac-explorer`, `unac-finding-verifier`) são read-only e atômicos. A skill os dispatcha em fan-out paralelo para cobrir ângulos independentes, coleta os fatos, deduplica, verifica adversarialmente e sintetiza o artefato final em uma única operação de escrita.

### 6 governadores de token

1. **Gate de fan-out** — N≥2 apenas se ≥2 áreas verdadeiramente independentes; caso contrário N=1.
2. **Knob `depth`** — limita N e ativa/desativa verificação (ver tabela abaixo).
3. **Teto de ângulos** — máximo 4 exploradores por invocação.
4. **Teto de fatos a verificar** — ~5 fatos load-bearing por rodada de verificação.
5. **Modelo por papel** — haiku para ângulos mecânicos (leitura direta de código), sonnet para ângulos que exigem julgamento (integração, contrato, inferência).
6. **Retorno compacto** — a skill retorna apenas contagens e caminhos; sem transcrever os fatos no chat.

---

## Input contract

A skill recebe os seguintes campos (via prompt de invocação ou integração no pipeline):

| Campo | Obrigatório | Default | Descrição |
|-------|-------------|---------|-----------|
| `item-id` | sim (pipeline) / não (standalone) | — | ID do card Jira (ex: `PROJ-123`) ou `slug` livre (ex: `meu-subsistema`) |
| `context` | sim | — | Pedido do usuário + descrição do que explorar |
| `depth` | não | `standard` no pipeline; `quick` standalone | `quick` / `standard` / `deep` |
| `repo-path` | não | diretório atual | Caminho absoluto do repositório-alvo (multi-repo) |

Se `context` estiver ausente, retorne imediatamente ao chamador com pedido de contexto.

---

## Tabela de depth

| depth | N ângulos | Verificação adversarial |
|-------|-----------|------------------------|
| `quick` | 1 | Não (pular Passo 4 e 5) |
| `standard` | 2–3 | Sim (fatos load-bearing) |
| `deep` | até 4 | Sim (fatos load-bearing) |

---

## Passo 1 — Determinar modo e diretório de artefatos

```
SE item-id começa com padrão PROJ-NNN (Jira-like):
  dir_artefatos = .unac/{item-id}/
  prefixo = {item-id}
SENÃO (slug livre / standalone):
  slug = item-id fornecido OU slug derivado do context (kebab-case, max 40 chars)
  dir_artefatos = .unac/{slug}/
  prefixo = {slug}
```

Criar o diretório implicitamente na escrita (Passo 6).

---

## Passo 2 — Decomposição em ângulos

A partir do `context`, derivar ângulos **independentes** — cada ângulo deve ser investigável sem depender do resultado de outro. Eixos de decomposição (use os que se aplicam):

- **Subsistema / módulo** — qual componente ou camada é central?
- **Fluxo de dados** — como os dados entram, transformam e saem?
- **Entidade / modelo** — quais structs/schemas/models estão envolvidos?
- **Integração / contrato** — quais APIs, eventos ou interfaces externas?
- **Testes / erros** — quais testes existem? Quais falhas são conhecidas?

**Gate de fan-out**:

```
áreas_independentes = contar ângulos com menos de 50% sobreposição de evidência esperada
SE áreas_independentes == 1:
  N = 1
SENÃO:
  N = min(áreas_independentes, 4)

Aplicar knob depth:
  quick   → N = 1  (mesmo que áreas > 1)
  standard → N = min(N, 3)
  deep    → N = min(N, 4)
```

Registre mentalmente os N ângulos escolhidos antes de dispatchar.

---

## Passo 3 — Fan-out paralelo de `unac-explorer`

> **REGRA CRÍTICA**: Dispatchar todos os N `unac-explorer` **NA MESMA MENSAGEM** — múltiplas chamadas `Agent` num único turno. Dispatchar 1 por turno é serial e está ERRADO.

**Seleção de modelo por ângulo**:
- `haiku` — ângulos mecânicos: leitura direta de arquivos, mapeamento de imports, listagem de endpoints, contagem de linhas.
- `sonnet` — ângulos que exigem julgamento: integração cross-service, inferência de contrato, análise de fluxo de dados complexo, avaliação de cobertura de testes.

**Template de dispatch** (repita para cada ângulo i de 1 a N, na mesma mensagem):

```
Agent(
  subagent_type: "unac-explorer",
  description: "Explore angle {i}/{N}: {titulo-do-angulo} for {item-id}",
  model: "haiku" | "sonnet",  // conforme critério acima
  prompt: <<PROMPT
    angle: {descricao-do-angulo-em-1-frase}
    context: {context-original-do-usuario} | item-id: {item-id}
    repo-path: {repo-path}   // omitir se diretório atual

    Investigate this angle only. Return facts[] with claim/evidence/confidence.
    Return format MANDATORY:
      STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT
      angle: <eco>
      facts:
        - claim: <1 linha factual>
          evidence: <path:line ou URL>
          confidence: alta | media | baixa
      concerns: <se DONE_WITH_CONCERNS>
      missing-context: <se NEEDS_CONTEXT>
  PROMPT
)
```

Aguardar todos os N retornos antes de prosseguir.

**Tratamento de retornos**:
- `DONE` ou `DONE_WITH_CONCERNS` → coletar `facts[]`; registrar concerns para a seção de não-confirmados.
- `NEEDS_CONTEXT` → o ângulo ficará sem fatos; registrar como lacuna na síntese; não re-dispatchar.

---

## Passo 4 — Dedup + seleção de fatos load-bearing

> **SE `depth=quick`**: pular este passo e o Passo 5. Ir direto ao Passo 6 com os fatos do único explorador.

**Deduplicação**: coletar todos os `facts[]` de todos os exploradores. Remover duplicatas por par `(claim, evidence)` — prefira a entrada de `confidence` mais alta quando os claims são equivalentes.

**Seleção para verificação** — fato entra na fila se atender qualquer um destes critérios:
1. Será premissa direta do plano de implementação (fato estrutural, de contrato ou de dependência).
2. `confidence: baixa` ou `confidence: media`.

**Teto**: selecionar no máximo ~5 fatos para verificação. Se a fila exceder 5, priorizar por: (a) premissa do plano > (b) `confidence: baixa` > (c) `confidence: media`.

---

## Passo 5 — Verificação adversarial paralela

> **REGRA CRÍTICA**: Dispatchar todos os `unac-finding-verifier` **NA MESMA MENSAGEM** — múltiplas chamadas `Agent` num único turno. Um por fato selecionado.

**Mapeamento de verdict** (use o campo `verdict`, não `resolved`):
- `confirmed` → ✅ confirmado
- `uncertain` → ⚠️ não-confirmado
- `refuted` → ❌ contestado

**Template de dispatch** (repita para cada fato selecionado f, na mesma mensagem):

```
Agent(
  subagent_type: "unac-finding-verifier",
  description: "Verify fact {f}: {claim-resumido}",
  model: "sonnet",
  prompt: <<PROMPT
    claim: {claim-exato-do-fato}
    evidence: {evidence-exato-do-fato}
    mode: exploration
    // calibration: omitir (não relevante em mode=exploration)

    Attempt to refute this claim by re-reading the evidence.
    Return format MANDATORY:
      STATUS: DONE | NEEDS_CONTEXT
      verdict: confirmed | refuted | uncertain
      claim: <eco>
      evidence-checked:
        - <path:line verificado>
      rationale: <1-3 frases>
      resolved: <fato-confiável | rebaixar>
      missing-context: <se NEEDS_CONTEXT>
  PROMPT
)
```

Aguardar todos os retornos antes de prosseguir.

**Fatos não verificados** (não entraram na fila de seleção ou vieram de exploradores com `NEEDS_CONTEXT`): tratados como ⚠️ implicitamente — listados em "Fatos não-confirmados / contestados".

---

## Passo 6 — Síntese (escrita única)

**A skill — não os workers — faz a única escrita em `.unac/`.**

### Classificar todos os fatos

Para cada fato do pool deduplicado:
- Se passou pela verificação: aplicar rótulo do `verdict` (✅/⚠️/❌).
- Se não passou pela verificação (`depth=quick` ou fora do teto): sem rótulo de verificação — listar em seção separada.

### Separar fatos locais de fatos web

- Fatos com `evidence` = `path:line` → `_codebase-context.md`
- Fatos com `evidence` = URL → `_research.md` (criar apenas se existirem fatos web)

### Escrever `{prefixo}_codebase-context.md`

```markdown
# Codebase Context — {item-id}

**Gerado em**: {YYYY-MM-DD}
**depth**: {quick|standard|deep}
**Ângulos investigados**: {N}

## Fatos verificados

| Rótulo | Claim | Evidência |
|--------|-------|-----------|
| ✅ | {claim} | `{path:line}` |
| ⚠️ | {claim} | `{path:line}` |
| ❌ | {claim} | `{path:line}` |

## Fatos não-confirmados / contestados

> Fatos ⚠️ e ❌ acima + fatos de quick (sem verificação) + lacunas de ângulos com NEEDS_CONTEXT.

- ⚠️ {claim} — {rationale resumido ou "não verificado (depth=quick)"}
- ❌ {claim} — {rationale resumido}
- (lacuna) Ângulo "{titulo}" não pôde ser investigado: {missing-context}

## Concerns dos exploradores

{concerns registrados de DONE_WITH_CONCERNS — bullets}
```

### Escrever `{prefixo}_research.md` (apenas se houver fatos web)

```markdown
# Research — {item-id}

**Gerado em**: {YYYY-MM-DD}

## Fatos externos verificados

| Rótulo | Claim | Fonte |
|--------|-------|-------|
| ✅ | {claim} | {URL} |
| ⚠️ | {claim} | {URL} |
```

### Confirmar escrita

Após cada `Write`, use `Read` para confirmar que o arquivo existe e não está vazio. Se vazio ou ausente: retry (máximo 2 tentativas).

---

## Passo 7 — Return

Após confirmar a escrita, retorne ao chamador:

```
STATUS: DONE | DONE_WITH_CONCERNS

explore-summary:
  item-id: {item-id}
  depth: {quick|standard|deep}
  angles-dispatched: {N}
  facts-confirmed: {count ✅}
  facts-unverified: {count ⚠️}
  facts-contested: {count ❌}
  artefacts:
    - {dir_artefatos}{prefixo}_codebase-context.md
    - {dir_artefatos}{prefixo}_research.md  // omitir se não gerado

concerns: {se DONE_WITH_CONCERNS — bullets com lacunas, ângulos sem resposta, ❌ críticos}
```

---

## Governança de tokens — referência rápida

| Governador | Valor |
|-----------|-------|
| Teto de ângulos | 4 |
| Teto de fatos para verificação | ~5 |
| Modelo exploradores mecânicos | haiku |
| Modelo exploradores com julgamento | sonnet |
| Modelo verifiers | sonnet |
| Fan-out explorers | paralelo (mesma mensagem) |
| Fan-out verifiers | paralelo (mesma mensagem) |
| Dispatch serial | PROIBIDO |
| Workers invocando workers | PROIBIDO |
| Escrita em .unac/ por worker | PROIBIDO |

---

## Red flags (anti-patterns)

- ❌ Dispatchar `unac-explorer` 1 por turno (serial — anula o benefício de paralelismo)
- ❌ Dispatchar `unac-finding-verifier` 1 por turno (idem)
- ❌ Mapear o `verdict` pelo campo `resolved` (colapsa refuted e uncertain — use `verdict` diretamente)
- ❌ Deixar workers escreverem em `.unac/` (workers são read-only)
- ❌ Criar `_codebase-context.md` fora do diretório `.unac/{item-id}/`
- ❌ Despachar mais de 4 ângulos por invocação
- ❌ Verificar mais de ~5 fatos por rodada
- ❌ Re-dispatchar um explorador com `NEEDS_CONTEXT` sem fornecer o campo ausente
- ❌ Pular a confirmação de escrita (Read após Write)

---

## Sub-skills / workers invocados

| Worker | Modo | Quando |
|--------|------|--------|
| `unac-explorer` | paralelo (fan-out) | Passo 3 — sempre |
| `unac-finding-verifier` | paralelo (fan-out) | Passo 5 — apenas `depth=standard` ou `deep` |
