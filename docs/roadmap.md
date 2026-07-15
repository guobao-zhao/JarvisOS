# JarvisOS 实施路线图

> 来源：`/Users/Zhuanz/Jarvis/docs/superpowers/specs/2026-07-07-jarvisos-design.md`
> 更新：2026-07-15
> 状态：已对齐当前代码，持续更新

---

## 当前进度对照

| 阶段 | 设计目标 | 实际状态 |
|------|---------|---------|
| Phase 0: 环境准备 | 创建仓库，复制 OpenCode，能跑起来 | ✅ 已完成 |
| Phase 1: 基座改造 | 改名 JarvisOS，替换标识 | ✅ 基本完成；内部 `@opencode-ai/*` 包名与协议标识保留以维持兼容 |
| Phase 2: Core Chat | 语音/文本输入 → LLM 流式回复 → HUD 显示 | ✅ 已完成，端到端已通 |
| Phase 3: Memory 接入 | LLM-wiki 客户端、写入模板、记忆搜索工具 | ✅ `packages/memory/` 已实现并接入对话流程 |
| Phase 4: Tools 工具库 | JarvisOS skills 库、MCP 客户端、工具埋点 | 🟡 `packages/tools/` registry 基座已建；formal/candidate 命名空间隔离已落地；MCP/common tools 仍待补全 |
| Phase 5: Metrics 指标 | 系统/项目/知识/模型指标 + 持久化 + HUD 面板 | ✅ `packages/metrics/` 已实现系统/LLM/记忆指标 + SQLite 持久化 + HUD 面板；模型路由已支持多 profile、角色绑定、自动阶段决策、后台报备和任务时间线 |
| Phase 6: Intelligence 情报 | 定时情报抓取 + 按需查询 + 每日简报 | ✅ 本地情报简报、远程 RSS 轮询、自动刷新、渲染层订阅已落地 |
| Phase 7: Growth 成长 | 用户画像、任务管理、主动提醒、决策挑战 | ✅ Growth Engine v1、report 持久化、source root 配置、定时扫描、通知提醒、晋升审批、用户画像/提醒/决策挑战、任务管理 UI 已落地 |
| Phase 8: Jarvis 迁移 | 把原 Jarvis 数据安全迁移进 JarvisOS 记忆 | 🟡 只读预览 + 导入面板已落地；导入调用 Memory 写链路，未修改原 Jarvis 文件 |
| Phase 9: 打磨发布 | 语音优化、性能优化、文档、安装包 | 🟡 F5-TTS、CosyVoice 已接入 `tools/`，README/roadmap 已更新；打包/签名/性能优化未做 |

---

## 近期任务

### P0：工作区清理与对齐

1. **提交当前工作区代码**
   - 提交 Phase 2/3/4/5/6/7 已落地的全部变更
   - 包括 `packages/memory/`、`packages/metrics/`、`packages/tools/` 三个新包
   - 包括 `packages/desktop/` 的 HUD、任务管理、语音、意识进程等修改

2. **修复构建问题**
   - 修复 `packages/desktop/src/renderer/jarvis/Voice.ts:147` 的 `Uint8Array` → `BlobPart` 类型错误
   - 让 `bun run typecheck` 全绿

3. **更新 `docs/roadmap.md`**
   - ✅ 本文件已更新

### P1：Phase 4 Tools 补齐

4. **扩展工具库**
   - 当前仅 `memory_search` 一个工具
   - 接入 MCP 客户端
   - 新增常用 skills（文件操作、系统命令、日历/提醒等）

### P2：Phase 8/9 长期项

5. **Jarvis 数据迁移**：将原 Jarvis 文档/记忆安全迁移进 JarvisOS
6. **发布打磨**：安装包、文档、性能优化、品牌残留清理

### 已完成：智能模型路由

- 多模型 profile 配置已落地，API Key 仍由 Electron 主进程加密保管，渲染层只接收 `hasApiKey`。
- daily/designer/worker/reviewer/fallback 角色绑定已落地，旧单模型配置可自动迁移到 v2 routing config。
- 聊天调用已接入规则型 ModelRouter，可按 chat/clarify/design/execute/verify/debug/review 阶段选择模型。
- 每次模型决策会广播到 Holographic Hub，任务面板显示当前任务的模型决策时间线。
- 任务面板支持 Pin GPT、Pin Kimi、Auto 三种纠偏入口，用户可覆盖 Jarvis 的自动决策。

---

## 中长期里程碑

| 阶段 | 目标 | 关键交付 | 状态 |
|------|------|---------|------|
| Phase 4 | 能调用工具并统计 | `packages/tools/`、skills 库、MCP 客户端、工具埋点 | registry 基座 + 命名空间隔离已落地，待补全 MCP/common tools |
| Phase 5 | 能看到实时指标 | `packages/metrics/`、SQLite 持久化、HUD 指标面板 | 核心已实现 |
| Phase 6 | 能问新鲜事 | `packages/intelligence/`、定时任务、每日简报 | 本地简报、远程轮询和自动刷新已落地 |
| Phase 7 | Jarvis 主动关心你 | `packages/growth/`、用户画像、任务管理、主动提醒 | report 持久化、画像/提醒/决策挑战原语、晋升审批、定时扫描和通知提醒已落地 |
| Phase 8 | 原数据可召回 | 只读迁移 Jarvis 文档/记忆，清洗后写入 | 预览/导入面板已落地，未修改原 Jarvis 文件 |
| Phase 9 | v1.0 发布 | 安装包、文档、性能优化 | README/roadmap 已更新，打包/签名/性能优化未做 |

---

## 关键约束重申

1. **API Key 安全**：Kimi 凭据只在 Electron 主进程，不进入渲染 bundle。
2. **本地优先**：记忆、指标、配置优先本地存储，不依赖远程服务。
3. **LLM-wiki 降级**：MemoryClient 必须做 health 检测，失败时进入无记忆模式。
4. **OpenCode 骨架**：保留原有包结构与内部 `@opencode-ai/*` 包名以维持兼容，用户可见文案与行为逐步替换为 JarvisOS。
5. **标准流程**：每个 Phase 走 `flow-clarify → flow-design → flow-code → Reviewer → flow-calibrate → Archiver/Reporter`。

---

## 当前会话建议

本计划执行后，建议完成：
1. 最终 typecheck + tests + desktop build 验证。
2. 手动桌面 smoke test（Holographic Hub、Growth Panel、Intelligence Panel、Migration Panel）。
3. 确认 `/Users/Zhuanz/Jarvis` 未被迁移流程修改。
4. 若宝哥要求提交，按建议 commit 分组分批提交，不提交生成产物。
