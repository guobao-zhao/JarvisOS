# JarvisOS Model Router Design

> 适用范围：JarvisOS 模型配置、对话模型切换、任务阶段模型编排、模型状态可视化
> 日期：2026-07-15

## 1. 目标

JarvisOS 需要从“单一模型配置”升级为“管家式模型编排”。系统默认由 Jarvis 判断当前工作阶段应该使用哪个模型，并在后台实时告知宝哥当前决策、原因和可纠偏选项。

核心目标：

1. 日常聊天和简单任务默认使用低成本执行模型，例如 Kimi。
2. 需求澄清、创意设计、复杂架构、风险判断默认使用高智商模型，例如 GPT。
3. 设计文档、执行步骤、验收标准生成后，执行阶段自动下发给 worker 模型。
4. 执行失败、验证失败、风险升高时，自动升级到 reviewer/designer 模型诊断。
5. UI 实时展示“当前阶段、当前模型、为什么选它、可否纠偏”。
6. 宝哥不需要每次手动选择模型，但可以随时说“改用 GPT / 改用 Kimi / 本任务固定 GPT”。

## 2. 非目标

第一版不做模型自动采购、价格优化、跨供应商复杂负载均衡，也不做完全自治的多 agent 编排。第一版重点是本地配置、规则路由、阶段状态、可视化和手动纠偏。

## 3. 模型角色

模型不再只叫“主模型/次模型”，而是按职责分配：

| 角色 | 默认用途 | 典型模型 |
|------|----------|----------|
| daily | 日常聊天、简单问答、轻量命令 | Kimi |
| designer | 需求澄清、创意设计、复杂推理、方案权衡 | GPT |
| worker | 按设计文档执行修改、跑命令、处理明确步骤 | Kimi |
| reviewer | 失败诊断、验证结果解释、风险复盘、最终评审 | GPT |
| fallback | 任一角色不可用时兜底 | 可配置 |

`designer` 和 `reviewer` 可以共用同一个 GPT 配置，`daily` 和 `worker` 可以共用同一个 Kimi 配置。

## 4. 工作阶段

JarvisOS 在每次对话或任务推进时维护一个 `WorkPhase`：

```ts
type WorkPhase =
  | "chat"
  | "triage"
  | "clarify"
  | "design"
  | "plan"
  | "execute"
  | "verify"
  | "debug"
  | "review"
```

阶段含义：

| 阶段 | 说明 | 默认角色 |
|------|------|----------|
| chat | 日常聊天、简单问答 | daily |
| triage | 判断任务复杂度和是否需要升级 | daily |
| clarify | 需求澄清、边界确认 | designer |
| design | 方案设计、架构权衡、创意生成 | designer |
| plan | 拆任务、写执行步骤和验收标准 | designer |
| execute | 按步骤改代码、调用工具、跑命令 | worker |
| verify | 跑测试、读取结果、基础修复 | worker |
| debug | 连续失败或复杂错误诊断 | reviewer |
| review | 最终验收、风险复盘、总结 | reviewer |

## 5. 路由决策

新增 `ModelRouter`，负责输入上下文并输出模型决策。

```ts
type ModelDecision = {
  phase: WorkPhase
  selectedRole: ModelRole
  selectedModelId: string
  reason: string
  confidence: number
  overrideable: boolean
  createdAt: number
}
```

第一版采用可解释规则：

1. 包含“需求、设计、方案、架构、创新、创意、PRD、权衡、复杂、评审”等信号，进入 `clarify/design/plan`，使用 `designer`。
2. 包含“实现、修复、跑测试、改文件、按计划执行、继续完成”等信号，进入 `execute/verify`，使用 `worker`。
3. 连续失败 2 次、测试失败难定位、类型错误反复出现、用户明确要求“分析原因”，进入 `debug`，使用 `reviewer`。
4. 日常聊天、简单查询、轻量问答，保持 `chat`，使用 `daily`。
5. 用户明确指定模型时，当前任务写入 override，优先级高于规则。
6. 被选模型连接异常时，切换到同层或 fallback 模型，并向用户报备。

后续可以把规则升级成小模型分类器，但第一版必须保留规则解释，确保可控。

## 6. 管家报备机制

模型切换不是静默发生。每次阶段或模型发生变化，JarvisOS 生成一条后台报备事件：

```ts
type ModelDecisionEvent = {
  id: string
  taskId?: string
  phase: WorkPhase
  modelRole: ModelRole
  modelID: string
  reason: string
  confidence: number
  options: Array<"continue" | "use_designer" | "use_worker" | "pin_current_for_task">
  createdAt: number
}
```

显示文案示例：

```text
Jarvis 决策：当前进入「需求澄清/创意设计」阶段，已切换到 GPT。
原因：该任务需要高复杂度推理、方案比较和边界判断。
你可以说「继续」「改用 Kimi」「本任务固定 GPT」。
```

执行阶段示例：

```text
Jarvis 决策：设计已完成，执行阶段切换到 Kimi。
原因：当前任务已拆解为明确步骤，适合交给执行模型完成。
```

## 7. 用户纠偏

JarvisOS 支持三类纠偏：

1. 临时纠偏：`改用 GPT` / `改用 Kimi`，只影响当前阶段。
2. 任务固定：`本任务固定 GPT` / `本任务固定 Kimi`，影响当前 taskId 的所有后续阶段。
3. 角色配置：在模型配置面板中把 `designer`、`worker` 等角色绑定到不同模型。

纠偏后必须生成一条新的决策事件，说明 override 来源：

```text
Jarvis 决策已调整：本任务后续阶段固定使用 GPT。
原因：宝哥手动指定。
```

## 8. 配置模型

存储结构升级为多角色配置：

```ts
type ModelRole = "daily" | "designer" | "worker" | "reviewer" | "fallback"

type JarvisModelConfig = {
  providerType: "openai-compatible"
  baseURL: string
  apiKey: string
  modelID: string
}

type JarvisModelProfile = {
  id: string
  label: string
  config: JarvisModelConfig
}

type JarvisModelRoutingConfig = {
  version: 2
  profiles: JarvisModelProfile[]
  roleBindings: Record<ModelRole, string>
}
```

迁移规则：

1. 如果存在旧 `modelConfig`，自动创建一个 `Kimi Default` profile。
2. `daily`、`worker`、`fallback` 默认绑定旧 profile。
3. `designer`、`reviewer` 如果未配置，先绑定旧 profile，但 UI 标记“建议配置高智商模型”。
4. 不删除旧配置，直到新配置保存成功。

## 9. 调用链

现有 `handleJarvisStreamChat` 需要从“读取唯一模型”改成“按任务阶段读取模型”。

建议新增接口：

```ts
getEffectiveJarvisModelConfig(role: ModelRole): Promise<JarvisModelConfig | null>
routeJarvisModel(input: ModelRouteInput): Promise<ModelDecision>
```

对话流程：

1. 渲染层发送用户消息。
2. 主进程根据消息、当前任务、历史失败计数调用 `ModelRouter`。
3. `ModelRouter` 输出 `ModelDecision`。
4. 主进程广播 `jarvis:model-decision`。
5. LLM 调用使用该 decision 对应模型。
6. 指标系统记录 `phase`、`role`、`modelID`、`success/failure`。

任务流程：

1. designer 产出需求澄清、设计、计划和验收标准。
2. worker 根据计划执行。
3. verify 失败不超过阈值时仍由 worker 修复。
4. 连续失败或高风险时切 reviewer。
5. reviewer 给出诊断后，可回到 worker 执行修复。

## 10. UI 设计

### 10.1 Model Pulse

中心 HUD 的 Model Pulse 显示：

- 当前阶段：`DESIGN / EXECUTE / VERIFY`
- 当前模型：`GPT-5 / Kimi K2`
- 当前角色：`designer / worker`
- 连通状态：畅通 / 异常 / 检测中
- 最近决策原因：一行展示

### 10.2 Model Command Center

点击 Model Pulse 打开配置窗口：

1. Profiles 列表：可新增、编辑、测试 OpenAI-compatible 模型。
2. Role Bindings：daily/designer/worker/reviewer/fallback 绑定到哪个 profile。
3. Health Check：每个 profile 显示最近测试状态和延迟。
4. Routing Rules：展示当前规则，不在第一版支持复杂编辑。

### 10.3 Task Model Timeline

任务面板增加模型时间线：

```text
12:42  Kimi  chat      日常对话
12:43  GPT   clarify   复杂需求识别，进入澄清
12:48  GPT   design    生成方案和验收标准
12:55  Kimi  execute   按步骤执行修改
13:08  GPT   debug     验证失败，升级诊断
13:15  Kimi  verify    按诊断修复并复测
```

时间线只展示当前任务相关事件，避免全局噪音。

## 11. 错误处理

1. 选中模型无配置：提示缺失角色绑定，并使用 fallback。
2. fallback 也不可用：中断请求，提示需要配置模型。
3. 模型测试超时：状态为异常，不覆盖已有可用配置。
4. worker 执行失败：记录失败次数，达到阈值后升级 reviewer。
5. 用户 override 的模型异常：提示异常并询问是否恢复自动路由。

## 12. 测试标准

单元测试：

1. 旧单模型配置能迁移到 v2 routing config。
2. daily/chat 默认选 worker 或 daily 绑定模型。
3. 复杂需求文本触发 designer。
4. 执行类文本触发 worker。
5. 连续失败触发 reviewer。
6. 用户 task override 优先于自动规则。
7. 模型连接测试按 profile 独立执行。

集成测试：

1. HolographicHub 打开后能看到当前模型决策状态。
2. 配置 GPT/Kimi 两个 profile 后，角色绑定能保存并恢复。
3. 复杂需求聊天时，后台报备切到 designer。
4. 执行阶段切到 worker，并在任务时间线可见。
5. worker 失败后切 reviewer，并生成报备事件。

## 13. 分阶段实施

第一阶段：

1. 多 profile 存储与旧配置迁移。
2. role binding 配置 UI。
3. profile 独立测试连接。

第二阶段：

1. ModelRouter 规则引擎。
2. `handleJarvisStreamChat` 按 decision 取模型。
3. 决策事件广播与 metrics 记录。

第三阶段：

1. Model Pulse 实时状态。
2. Task Model Timeline。
3. 用户纠偏命令和任务级 override。

## 14. 设计自检

- 需求覆盖率：覆盖自动切换、后台报备、用户纠偏、多模型配置、实时展示。
- 兼容性：旧单模型配置可迁移，不破坏现有聊天。
- 安全性：API Key 仍只保存在 Electron 主进程和 safeStorage，不进入渲染 bundle。
- 可解释性：第一版使用规则路由，每次切换都有 reason。
- 可扩展性：后续可把规则路由替换为分类器，但保持 `ModelDecision` 接口稳定。
