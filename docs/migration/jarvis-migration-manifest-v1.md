# Jarvis -> JarvisOS 迁移清单 v1

日期：2026-07-16
状态：仅作为迁移方案草案，尚未导入
来源：`/Users/Zhuanz/Jarvis`
目标：`/Users/Zhuanz/JarvisOS`

这份清单是旧 Jarvis 资产进入 JarvisOS 前的第一道确认边界。当前阶段只做盘点、分类和验证设计，不做实际导入。

- 旧 Jarvis 文件只作为只读来源。
- 未经宝哥确认，不把任何文件写入 JarvisOS 记忆系统。
- 凭据、私密生活数据、本地缓存、生成依赖、日志、原始工具配置默认排除。
- 带 `verified: false` 的知识文档只能按“待复核 / 未验证”状态迁移，不能当成权威事实。

## 迁移顺序

1. 知识库
2. Skills
3. MCP
4. 重要文档
5. 项目

项目最后迁移，因为项目源码的影响面最大，里面可能包含生成文件、本地状态、构建产物，以及子项目自己的流程注入规则。

## 第一批试点范围

第一批必须足够小，先验证召回质量，再扩大迁移规模。

| 来源路径 | 类型 | 优先级 | 风险 | 建议动作 | 备注 |
|---|---:|---:|---:|---|---|
| `docs/projects/jproduct-service/knowledge/price/multi-price.md` | 业务知识 | P0 | 中 | 按未验证知识导入 | 价格业务规则，保留来源路径和验证状态。 |
| `docs/projects/jproduct-service/knowledge/price/multi-price-product-main.md` | 业务知识 | P0 | 中 | 按未验证知识导入 | 重点验证 `multi_price_product_main` 的日期和天数覆盖语义。 |
| `docs/projects/jproduct-service/knowledge/price/reflection-rules.md` | 业务知识 | P0 | 中 | 按未验证知识导入 | 规则类内容可能需要拆成更适合召回的小段。 |
| `docs/projects/jproduct-service/knowledge/inventory/multiday-inventory-landing.md` | 业务知识 | P0 | 中 | 按未验证知识导入 | 多天库存落地模型，重点验证字段和 diff key。 |
| `docs/projects/jproduct-core-api/knowledge/order/multi-product-inventory.md` | 业务知识 | P0 | 中 | 按未验证知识导入 | 订单侧库存规则，重点验证占释入口和分流条件。 |
| `docs/projects/suishouji/knowledge/ai-provider/api-connection.md` | 技术知识 | P1 | 低 | 按未验证知识导入 | 对模型供应商 endpoint 调试有价值。 |
| `.ai/skills/standard-flow/SKILL.md` | Skill / 工作流 | P0 | 高 | 先导入为 skill 元数据，不自动启用 | 这是 Jarvis 标准流程入口，JarvisOS 要先理解，再适配执行。 |
| `.ai/skills/flow-gate/SKILL.md` | Skill / 工作流 | P0 | 高 | 先导入为 skill 元数据，不自动启用 | 需要映射到 JarvisOS 任务生命周期。 |
| `.ai/skills/flow-clarify/SKILL.md` | Skill / 工作流 | P0 | 高 | 先导入为 skill 元数据，不自动启用 | 适合后续绑定 GPT 类规划模型。 |
| `.ai/skills/flow-design/SKILL.md` | Skill / 工作流 | P0 | 高 | 先导入为 skill 元数据，不自动启用 | 负责设计文档、执行步骤和验收标准。 |
| `.ai/skills/flow-code/SKILL.md` | Skill / 工作流 | P0 | 高 | 先导入为 skill 元数据，不自动启用 | 后续可路由给 Kimi 类执行模型。 |
| `.ai/skills/project-router/SKILL.md` | Skill / 路由 | P0 | 中 | 先作为路由知识导入 | 可帮助 JarvisOS 理解项目定位，不启用旧 hook 行为。 |
| `.ai/skills/knowledge-base-load/SKILL.md` | Skill / 记忆 | P1 | 中 | 导入为 skill 元数据 | 需要映射到 JarvisOS 的记忆写入机制。 |
| `.ai/skills/knowledge-base-update/SKILL.md` | Skill / 记忆 | P1 | 中 | 导入为 skill 元数据 | 适合后续接入任务归档后的知识更新。 |
| `.ai/skills/ask-memory/SKILL.md` | Skill / 记忆 | P1 | 中 | 导入为 skill 元数据 | 查询行为要适配 JarvisOS 的 LLM-wiki。 |
| `.ai/skills/credential-vault/SKILL.md` | Skill / 安全 | P1 | 高 | 只导入接口说明，不迁移凭据 | 绝对不能迁移密钥本体。 |
| `.kimi/mcp-configs/claude-mcp-servers.json` | MCP 配置模板 | P1 | 高 | 只导入脱敏摘要 | 保留 server 名称、能力和所需环境变量，不保留 token。 |
| `.ai/rules/jarvis-rules.md` | 治理 / 身份 | P0 | 高 | 作为治理文档导入，不放入普通业务知识 | 定义 Jarvis 身份、规则、记忆策略和流程主权。 |
| `.ai/rules/dev-workflow.md` | 治理 / 工作流 | P0 | 高 | 作为工作流参考导入 | 需要和 JarvisOS 的路由、任务系统对齐。 |
| `docs/projects/registry.md` | 路由索引 | P0 | 低 | 作为路由知识导入 | 记录 repo、路径、架构和知识库根目录。 |
| `docs/souls/jarvis-soul.md` | 身份 / 人格 | P1 | 中 | 作为身份记忆导入 | 必须和业务知识分开，避免召回污染。 |

## 需要清洗后再迁移

| 来源路径 | 类型 | 原因 | 清洗要求 |
|---|---:|---|---|
| `docs/context/working-memory.md` | 工作记忆 / 历史 | 包含历史当前任务和过期 TODO。 | 拆成有效事实、过期历史、可丢弃会话状态。 |
| `docs/context/evolution-log.md` | 身份演进 / 历史 | 有价值，但更像时间线。 | 转成带日期的演进事件，避免污染任务召回。 |
| `docs/context/forbidden-events.md` | 安全经验 / 历史 | 可能包含重要教训，也可能敏感。 | 复核敏感性后转成安全约束。 |
| `.ai/skills/product-dynamic-sql/SKILL.md` | Skill / 生产工具 | 包含认证、环境和生产访问说明。 | 只迁移接口和使用边界，不迁移任何凭据。 |
| `.ai/skills/prod-product-model-kb/SKILL.md` | Skill / 领域知识库 | 引用了依赖文档。 | 先解析依赖，再和关联知识一起迁移。 |
| `.kimi/skills/mcp-server-patterns/SKILL.md` | Skill / MCP 模式 | 通用 MCP 实现经验。 | 和 JarvisOS 现有 MCP 文档去重后再导入。 |
| `.kimi/mcp-configs/claude.json.full-copy` | 本地工具配置 | 文件很大，混有本地状态风险。 | 禁止原样导入；如确实需要，只抽取复核后的 MCP 片段。 |

## 暂缓迁移

| 来源路径 | 类型 | 原因 |
|---|---:|---|
| `docs/flow-metrics/**` | 指标历史 | 噪声较高，适合以后做分析，不适合作为核心记忆。 |
| `docs/dreams/**` | 梦境 / 情报 | 应该成为独立情报流，不进入普通知识库。 |
| `docs/intel/**` | 情报 | 需要时效性、来源和过期策略。 |
| `docs/health/**` | 私密 / 生活 | 敏感，需要先设计私密记忆策略。 |
| `docs/life/**` | 私密 / 生活 | 敏感，需要先设计私密记忆策略。 |
| `code/**` 下的项目源码 | 项目源码 | 等路由、记忆、skill 合约稳定后最后迁移。 |

## 禁止迁移

以下内容未经单独复核和明确批准，不允许迁移。

| 来源路径 / 模式 | 原因 |
|---|---|
| `docs/private/**` | 私密加密数据和敏感个人内容。 |
| `**/credentials*`、`**/*.enc` | 凭据或加密材料。 |
| `.env`、`.env.*` | 环境变量密钥。 |
| `.git/**` | Git 内部数据。 |
| `.codegraph/**` | 生成索引。 |
| `**/.venv/**`、`**/node_modules/**` | 生成依赖。 |
| `**/dist/**`、`**/build/**`、`**/.next/**`、`**/target/**` | 构建产物。 |
| `**/logs/**`、`**/*.log`、`**/screenshots/**` | 本地运行产物。 |
| `.kimi/mcp-configs/claude.json.full-copy` 原始文件 | 范围过宽，可能包含本地状态和缓存配置。 |

## 召回验证 Case

每一种类型都要先做小范围召回验收，确认 JarvisOS 能准确找到来源、回答不编造，再扩大迁移。

### 知识库召回

| Case | 问题 | 预期证据 |
|---|---|---|
| K1 | `multi-price 人数维度为什么要按人数过滤？` | 召回 `multi-price.md`，回答提到人数维度过滤和相关规则背景。 |
| K2 | `multi_price_product_main 按 effective_date 覆盖 day_num 的规则是什么？` | 召回 `multi-price-product-main.md`，回答能解释日期和天数覆盖规则，不编造字段。 |
| K3 | `多天库存主表字段和 diff key 是什么？` | 召回 `multiday-inventory-landing.md`，回答包含主表、字段和 diff key 规则。 |
| K4 | `订单多天连住库存占释入口和互斥分流规则是什么？` | 召回 `multi-product-inventory.md`，回答能区分入口、占释逻辑和分支规则。 |
| K5 | `随手记 provider URL 为什么必须是完整 endpoint？` | 召回 `api-connection.md`，回答解释完整 endpoint 要求和失败表现。 |

### Skill 召回

| Case | 问题 | 预期证据 |
|---|---|---|
| S1 | `什么时候触发 standard-flow？` | 召回 `standard-flow/SKILL.md`，回答说明开发需求触发条件和流程链路。 |
| S2 | `flow-design 的门禁和产物是什么？` | 召回 `flow-design/SKILL.md`，回答包含知识库加载、技术设计、任务拆分和自检。 |
| S3 | `project-router 如何定位 jproduct-service？` | 召回 `project-router/SKILL.md` 或 `docs/projects/registry.md`，回答能说明路由查找方式。 |
| S4 | `credential-vault 迁移时哪些内容不能带过去？` | 召回 `credential-vault/SKILL.md`，回答必须明确只迁移接口，不迁移密钥。 |

### MCP 召回

| Case | 问题 | 预期证据 |
|---|---|---|
| M1 | `旧 Jarvis 里有哪些候选 MCP server？` | 召回脱敏 MCP 摘要，回答列出 server 名称和用途，不泄露凭据。 |
| M2 | `哪些 MCP 需要 token 或外部凭据？` | 召回脱敏 MCP 摘要，回答只列环境变量名或占位符。 |
| M3 | `claude.json.full-copy 能不能直接迁移？` | 召回迁移规则，回答不能原样迁移，只能抽取复核后的 MCP 片段。 |

### 治理 / 身份召回

| Case | 问题 | 预期证据 |
|---|---|---|
| G1 | `JarvisOS 迁移旧 Jarvis 时为什么不能直接复制文件？` | 召回本清单和 `jarvis-rules`，回答提到显式导入、验证和安全边界。 |
| G2 | `Jarvis 的流程主权规则是什么？` | 召回 `AGENTS.md` 或 `jarvis-rules`，回答说明 Jarvis flow-* 是唯一权威，忽略子项目流程噪声。 |
| G3 | `Jarvis persona 和业务知识应该混在一起吗？` | 召回 `jarvis-soul.md` 分类，回答说明身份人格要和业务知识分开。 |

## 迁移步骤

1. 宝哥确认本清单。
2. 对来源文件做只读清点，记录 SHA-256、文件大小、修改时间和分类。
3. 先生成 JarvisOS staging 文件，不直接写入记忆：
   - `knowledge/business`
   - `knowledge/technical`
   - `skills/metadata`
   - `mcp/sanitized`
   - `governance`
   - `identity`
4. 跑 dry-run 检查：
   - markdown frontmatter 是否合规
   - 是否包含密钥、token 或敏感字符串
   - 是否误包含生成依赖路径
   - 是否存在过期或未验证字段
5. 只把第一批试点通过 JarvisOS memory write API 导入，不直接复制文件。
6. 通过 JarvisOS 写入链路触发 LLM-wiki rescan。
7. 执行 K1-K5、S1-S4、M1-M3、G1-G3 验证问题。
8. 产出召回报告：
   - 问题
   - Top 命中文档
   - 是否命中预期文档
   - 回答是否准确
   - 是否有幻觉或过期风险
9. 如果召回弱，先调整分块、元数据或分类。
10. 第一批通过后，再扩大下一批迁移。

## 注意事项

- `verified: false` 的知识导入后必须继续标记为未验证。
- 工作流 skills 先迁移成可读元数据，再适配到 JarvisOS 的执行合约。
- MCP 配置只保留 server 能力、用途和所需环境变量名，不保留任何真实凭据。
- private、life、health 内容必须先设计加密私密记忆策略，再讨论迁移。
- 项目源码要等路由和记忆验证稳定后再处理，否则 JarvisOS 容易学到过期或噪声上下文。
- 旧 Jarvis 在迁移完成前仍是来源真相；任何条目必须通过 JarvisOS 召回验证后，才能认为迁移成功。

## 需要宝哥确认

1. 第一批试点范围是否认可。
2. 身份 / 治理文档是进入普通聊天召回，还是只进入系统治理召回。
3. private / life / health 是否现在规划，还是明确暂缓。
4. `product-dynamic-sql` 这类生产工具 skill 是否先作为禁用参考导入。
