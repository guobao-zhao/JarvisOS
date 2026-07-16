# Jarvis -> JarvisOS Migration Manifest v1

Date: 2026-07-16
Status: proposal only, not imported
Source: `/Users/Zhuanz/Jarvis`
Target: `/Users/Zhuanz/JarvisOS`

This manifest is the first review boundary before migrating old Jarvis assets into JarvisOS. It is intentionally conservative:

- Old Jarvis files are read-only source assets.
- No file is imported into JarvisOS memory until this manifest is confirmed.
- Secrets, private life data, local caches, generated dependencies, logs, and raw tool configs are excluded by default.
- Unverified knowledge is migrated only with `needs_review` / `unverified` metadata.

## Migration Order

1. Knowledge base
2. Skills
3. MCP
4. Important documents
5. Projects

Projects are last because they have the largest blast radius and may include generated files, local state, build outputs, and nested workflow instructions.

## Phase 1 Pilot Batch

The first batch should be small enough to validate retrieval quality before large-scale import.

| Source path | Type | Priority | Risk | Proposed action | Notes |
|---|---:|---:|---:|---|---|
| `docs/projects/jproduct-service/knowledge/price/multi-price.md` | knowledge/business | P0 | medium | import as unverified knowledge | Has structured product-price rules; keep source path and verification flag. |
| `docs/projects/jproduct-service/knowledge/price/multi-price-product-main.md` | knowledge/business | P0 | medium | import as unverified knowledge | Important for `multi_price_product_main`; verify date/day coverage semantics. |
| `docs/projects/jproduct-service/knowledge/price/reflection-rules.md` | knowledge/business | P0 | medium | import as unverified knowledge | Rule/reflection content may need normalization into retrieval-friendly sections. |
| `docs/projects/jproduct-service/knowledge/inventory/multiday-inventory-landing.md` | knowledge/business | P0 | medium | import as unverified knowledge | Important inventory landing model; verify fields and diff keys. |
| `docs/projects/jproduct-core-api/knowledge/order/multi-product-inventory.md` | knowledge/business | P0 | medium | import as unverified knowledge | Order-side inventory rules; validate with flow/branching questions. |
| `docs/projects/suishouji/knowledge/ai-provider/api-connection.md` | knowledge/technical | P1 | low | import as unverified knowledge | Useful for model provider endpoint debugging. |
| `.ai/skills/standard-flow/SKILL.md` | skill/workflow | P0 | high | import as skill metadata, not auto-enable | This is Jarvis workflow sovereignty; JarvisOS should understand it before executing it. |
| `.ai/skills/flow-gate/SKILL.md` | skill/workflow | P0 | high | import as skill metadata, not auto-enable | Requires compatibility mapping to JarvisOS task lifecycle. |
| `.ai/skills/flow-clarify/SKILL.md` | skill/workflow | P0 | high | import as skill metadata, not auto-enable | Used by GPT-class planning model. |
| `.ai/skills/flow-design/SKILL.md` | skill/workflow | P0 | high | import as skill metadata, not auto-enable | Design document and acceptance criteria generator. |
| `.ai/skills/flow-code/SKILL.md` | skill/workflow | P0 | high | import as skill metadata, not auto-enable | Execution workflow; should later route to worker model. |
| `.ai/skills/project-router/SKILL.md` | skill/routing | P0 | medium | import as routing knowledge first | Can power project lookup without enabling old hook behavior. |
| `.ai/skills/knowledge-base-load/SKILL.md` | skill/memory | P1 | medium | import as skill metadata | Needs mapping to JarvisOS memory ingestion. |
| `.ai/skills/knowledge-base-update/SKILL.md` | skill/memory | P1 | medium | import as skill metadata | Useful after task archive; do not auto-write until confirmed. |
| `.ai/skills/ask-memory/SKILL.md` | skill/memory | P1 | medium | import as skill metadata | Query behavior should map to JarvisOS LLM-wiki. |
| `.ai/skills/credential-vault/SKILL.md` | skill/security | P1 | high | import interface only, no secrets | Must not migrate credentials. |
| `.kimi/mcp-configs/claude-mcp-servers.json` | mcp/config-template | P1 | high | import sanitized summary only | Keep server names and required env vars; remove placeholders/secrets. |
| `.ai/rules/jarvis-rules.md` | governance/identity | P0 | high | import as governance doc, not general memory | Defines Jarvis identity, rules, memory policy, and sovereignty. |
| `.ai/rules/dev-workflow.md` | governance/workflow | P0 | high | import as workflow reference | Must not conflict with JarvisOS router and task system. |
| `docs/projects/registry.md` | routing/index | P0 | low | import as routing knowledge | Maps repositories, paths, architecture, and knowledge roots. |
| `docs/souls/jarvis-soul.md` | identity/persona | P1 | medium | import as identity memory | Should remain separate from business knowledge retrieval. |

## Needs Cleaning Before Import

| Source path | Type | Reason | Required cleanup |
|---|---:|---|---|
| `docs/context/working-memory.md` | working-memory/history | Contains historical current tasks and stale TODOs. | Split into active facts, stale history, and discardable session state. |
| `docs/context/evolution-log.md` | identity/history | Valuable but timeline-like. | Convert into dated evolution events; avoid polluting task retrieval. |
| `docs/context/forbidden-events.md` | safety/history | May contain operational safety lessons. | Review sensitivity and convert into safety constraints. |
| `.ai/skills/product-dynamic-sql/SKILL.md` | skill/prod-tooling | Contains auth/env instructions and production access behavior. | Import interface and usage boundaries only; never import credentials. |
| `.ai/skills/prod-product-model-kb/SKILL.md` | skill/domain-kb | References dependent documents. | Resolve dependencies and import linked KB files together. |
| `.kimi/skills/mcp-server-patterns/SKILL.md` | skill/mcp-pattern | General MCP implementation guidance. | Import as technical reference after dedupe with JarvisOS MCP docs. |
| `.kimi/mcp-configs/claude.json.full-copy` | local-tool-config | Large full Claude config, likely mixed with local state. | Do not import raw; extract MCP section only if needed. |

## Deferred

| Source path | Type | Reason |
|---|---:|---|
| `docs/flow-metrics/**` | metrics/history | High noise; useful later for analytics, not core memory. |
| `docs/dreams/**` | dream/intelligence | Should become a separate intelligence stream, not ordinary knowledge. |
| `docs/intel/**` | intelligence | Needs time-based freshness and source attribution model. |
| `docs/health/**` | private/life | Sensitive. Requires explicit private-memory policy. |
| `docs/life/**` | private/life | Sensitive. Requires explicit private-memory policy. |
| Project source directories under `code/**` | projects/source | Migrate last after routing, memory, and skill contracts are stable. |

## Prohibited

These must not be migrated unless explicitly reviewed and approved.

| Source path / pattern | Reason |
|---|---|
| `docs/private/**` | Private encrypted data and sensitive personal content. |
| `**/credentials*`, `**/*.enc` | Secrets or encrypted material. |
| `.env`, `.env.*` | Environment secrets. |
| `.git/**` | VCS internals. |
| `.codegraph/**` | Generated index. |
| `**/.venv/**`, `**/node_modules/**` | Generated dependencies. |
| `**/dist/**`, `**/build/**`, `**/.next/**`, `**/target/**` | Build outputs. |
| `**/logs/**`, `**/*.log`, `**/screenshots/**` | Local runtime artifacts. |
| `.kimi/mcp-configs/claude.json.full-copy` raw file | Too broad; may include local state and cached config. |

## Validation Cases

Each migrated type needs a small recall test before scaling up.

### Knowledge Recall

| Case | Query | Expected evidence |
|---|---|---|
| K1 | `multi-price 人数维度为什么要按人数过滤？` | Retrieves `multi-price.md`; answer mentions people/person dimension filtering and related rule context. |
| K2 | `multi_price_product_main 按 effective_date 覆盖 day_num 的规则是什么？` | Retrieves `multi-price-product-main.md`; answer explains effective date/day coverage without inventing fields. |
| K3 | `多天库存主表字段和 diff key 是什么？` | Retrieves `multiday-inventory-landing.md`; answer includes main table, fields, and diff key rules. |
| K4 | `订单多天连住库存占释入口和互斥分流规则是什么？` | Retrieves `multi-product-inventory.md`; answer separates order entry, occupancy/release, and branch rules. |
| K5 | `随手记 provider URL 为什么必须是完整 endpoint？` | Retrieves `api-connection.md`; answer explains full endpoint requirement and failure mode. |

### Skill Recall

| Case | Query | Expected evidence |
|---|---|---|
| S1 | `什么时候触发 standard-flow？` | Retrieves `standard-flow/SKILL.md`; answer describes development-demand trigger and flow chain. |
| S2 | `flow-design 的门禁和产物是什么？` | Retrieves `flow-design/SKILL.md`; answer includes knowledge loading, technical design, tasks, and self-check gates. |
| S3 | `project-router 如何定位 jproduct-service？` | Retrieves `project-router/SKILL.md` and/or `docs/projects/registry.md`; answer shows route lookup behavior. |
| S4 | `credential-vault 迁移时哪些内容不能带过去？` | Retrieves `credential-vault/SKILL.md`; answer says interface only, no secrets. |

### MCP Recall

| Case | Query | Expected evidence |
|---|---|---|
| M1 | `旧 Jarvis 里有哪些候选 MCP server？` | Retrieves sanitized MCP summary; answer lists server names and purpose, not secrets. |
| M2 | `哪些 MCP 需要 token 或外部凭据？` | Retrieves sanitized MCP summary; answer lists required env vars/placeholders only. |
| M3 | `claude.json.full-copy 能不能直接迁移？` | Retrieves migration rule; answer says no raw import, extract only reviewed MCP sections. |

### Governance / Identity Recall

| Case | Query | Expected evidence |
|---|---|---|
| G1 | `JarvisOS 迁移旧 Jarvis 时为什么不能直接复制文件？` | Retrieves this manifest and `jarvis-rules`; answer mentions explicit ingestion, validation, and safety boundary. |
| G2 | `Jarvis 的流程主权规则是什么？` | Retrieves `AGENTS.md` / `jarvis-rules`; answer explains Jarvis flow-* is authoritative and subproject workflow noise is ignored. |
| G3 | `Jarvis persona 和业务知识应该混在一起吗？` | Retrieves `jarvis-soul.md` classification; answer says identity/persona stays separate from business knowledge. |

## Migration Steps

1. Confirm this manifest with the user.
2. Build a read-only source inventory with SHA-256 checksums, file size, modified time, and classification.
3. Create sanitized import payloads in JarvisOS staging, not memory:
   - `knowledge/business`
   - `knowledge/technical`
   - `skills/metadata`
   - `mcp/sanitized`
   - `governance`
   - `identity`
4. Run a dry-run parser:
   - validate markdown frontmatter
   - detect secrets and tokens
   - detect generated dependency paths
   - detect stale or unverified fields
5. Import only the Phase 1 pilot through JarvisOS memory write API, not by raw file copy.
6. Trigger LLM-wiki rescan through the JarvisOS write path.
7. Run validation cases K1-K5, S1-S4, M1-M3, G1-G3.
8. Produce a recall report:
   - query
   - top retrieved documents
   - expected document hit or miss
   - answer correctness
   - hallucination / stale-risk notes
9. Fix chunking, metadata, or classification if recall is weak.
10. Only after pilot pass, expand to the next batch.

## Migration Notes

- Knowledge documents with `verified: false` must remain marked unverified after import.
- Workflow skills should first be migrated as readable metadata, then adapted to JarvisOS execution contracts later.
- MCP config should be reduced to server capability metadata and required environment variable names. No raw local config import.
- Private/life/health material needs a separate encrypted private-memory policy before migration.
- Project repositories should be handled after routing and memory validation, otherwise JarvisOS may learn stale or noisy code context.
- Old Jarvis remains the source of truth until a migrated item passes retrieval validation in JarvisOS.

## Confirmation Needed

Before any actual import, confirm:

1. Whether Phase 1 pilot scope is acceptable.
2. Whether identity/governance documents should be visible to normal chat retrieval or only to system governance retrieval.
3. Whether private/life/health migration should be planned now or explicitly deferred.
4. Whether production-tooling skills such as `product-dynamic-sql` should be imported as disabled references first.
