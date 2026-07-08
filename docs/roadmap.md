# JarvisOS 实施路线图

> 来源：`/Users/Zhuanz/Jarvis/docs/superpowers/specs/2026-07-07-jarvisos-design.md`
> 更新：2026-07-08
> 状态：已对齐当前代码，持续更新

---

## 当前进度对照

| 阶段 | 设计目标 | 实际状态 |
|------|---------|---------|
| Phase 0: 环境准备 | 创建仓库，复制 OpenCode，能跑起来 | ✅ 已完成 |
| Phase 1: 基座改造 | 改名 JarvisOS，替换标识 | ✅ 已完成 |
| Phase 2: Core Chat | 语音/文本输入 → LLM 流式回复 → HUD 显示 | ✅ 代码已完成，在工作区，待提交 + Phase E 校准 |
| Phase 3: Memory 接入 | LLM-wiki 客户端、写入模板、记忆搜索工具 | ⏳ 下一步 |
| Phase 4: Tools 工具库 | JarvisOS skills 库、MCP 客户端、工具埋点 | 🔲 未开始 |
| Phase 5: Metrics 指标 | 系统/项目/知识/模型指标 + 持久化 + HUD 面板 | 🔲 未开始 |
| Phase 6: Intelligence 情报 | 定时情报抓取 + 按需查询 + 每日简报 | 🔲 未开始 |
| Phase 7: Growth 成长 | 用户画像、任务管理、主动提醒、决策挑战 | 🔲 未开始 |
| Phase 8: Jarvis 迁移 | 把原 Jarvis 数据安全迁移进 JarvisOS 记忆 | 🔲 未开始 |
| Phase 9: 打磨发布 | 语音优化、性能优化、文档、安装包 | 🔲 未开始 |

---

## 近期任务（Phase 2 收尾 → Phase 3）

### P0：Phase 2 闭环

1. **提交 Phase 2 代码**
   - 提交所有工作区变更：`design.md`、`tasks.md`、HUD 组件、主进程代理、preload、renderer 入口
   - 注意清理 JarvisOS 仓库内重复创建的 `docs/projects/JarvisOS/route/PROJECT_ROUTE.md`
   - 同步更新 Jarvis 主仓库的 `docs/projects/JarvisOS/route/PROJECT_ROUTE.md`

2. **Phase E 校准（flow-calibrate）**
   - 人工验证端到端聊天流程
   - 输出 `docs/09-dev-records/core-chat/reflection.md`
   - 提炼流程改进规则到 `reflection-rules.md`（若首次创建）

3. **Archiver / Reporter 收尾**
   - Archiver：更新 `docs/projects/JarvisOS/route/PROJECT_ROUTE.md`、沉淀业务知识
   - Reporter：采集 16 项指标，写入 `docs/flow-metrics/JarvisOS/core-chat/`，推送公司指标系统

### P1：Phase 3 Memory 接入

4. **技术设计**
   - 明确 `MemoryService` 接口与 LLM-wiki HTTP API 映射
   - 设计 `MemoryDocument` 在 JarvisOS 中的 TypeScript 类型
   - 定义写入模板：对话萃取 / 情报摘要 / 任务记录
   - 确定降级策略：LLM-wiki 不可用时进入无记忆模式

5. **创建 `packages/memory/` 模块**
   - `packages/memory/src/client.ts`：LLM-wiki HTTP 客户端
   - `packages/memory/src/templates.ts`：写入模板与格式化
   - `packages/memory/src/search.ts`：向量搜索 + 关键词搜索封装
   - `packages/memory/src/index.ts`：统一导出 `MemoryService`
   - `packages/memory/package.json`：workspace 包配置

6. **记忆写入能力**
   - 对话结束后由 Core 调用 `memory.write()` 萃取事实/偏好/决策
   - 情报摘要写入（标记 `source: intelligence`）
   - 任务记录写入

7. **记忆召回能力**
   - 对话前根据用户问题做 `memory.search()`，Top-K 注入 system prompt
   - 提供 `memory_search` 工具供 LLM 主动调用
   - 支持图谱召回（若 LLM-wiki 提供 graph API）

8. **HUD 集成**
   - 在 `SidePanel` 展示最近召回的记忆条目
   - 记忆写入/召回事件在 `ChatFeed` 中可视化（可选，不打扰主对话）

9. **端到端验证**
   - 能记住用户偏好并在后续对话中召回
   - LLM-wiki 不可用时 gracefully 降级
   - `bun run typecheck` 通过

10. **Phase 3 收尾**
    - 更新 `docs/roadmap.md` 进度
    - 路由回填 + Archiver/Reporter

---

## 中长期里程碑

| 阶段 | 目标 | 关键交付 |
|------|------|---------|
| Phase 4 | 能调用工具并统计 | `packages/tools/`、skills 库、MCP 客户端、工具埋点 |
| Phase 5 | 能看到实时指标 | `packages/metrics/`、SQLite 持久化、HUD 指标面板 |
| Phase 6 | 能问新鲜事 | `packages/intelligence/`、定时任务、每日简报 |
| Phase 7 | Jarvis 主动关心你 | `packages/growth/`、用户画像、任务管理、主动提醒 |
| Phase 8 | 原数据可召回 | 只读迁移 Jarvis 文档/记忆，清洗后写入 |
| Phase 9 | v1.0 发布 | 安装包、文档、性能优化 |

---

## 关键约束重申

1. **API Key 安全**：Kimi 凭据只在 Electron 主进程，不进入渲染 bundle。
2. **本地优先**：记忆、指标、配置优先本地存储，不依赖远程服务。
3. **LLM-wiki 降级**：MemoryClient 必须做 health 检测，失败时进入无记忆模式。
4. **OpenCode 骨架**：保留原有包结构，逐步替换品牌与行为，不单独维护 `opencode/` 依赖。
5. **标准流程**：每个 Phase 走 `flow-clarify → flow-design → flow-code → Reviewer → flow-calibrate → Archiver/Reporter`。

---

## 当前会话建议

本会话建议完成 **P0 Phase 2 闭环**：提交代码 + Phase E 校准 + Archiver/Reporter。
若时间不够，至少完成**提交代码**，避免工作区变更跨会话丢失。
