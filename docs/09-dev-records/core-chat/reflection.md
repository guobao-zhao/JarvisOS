# 人工校准反思 — core-chat

## 校准概览

- 需求名称：core-chat
- 项目：JarvisOS
- 校准人：Jarvis
- Reviewer PASS commit：`ebc2e5519402e10f1bd95dc281b726dca74c9533`
- 最终 commit：`a03fd1ec58792b203622302138f248039ea6efcc`
- 修改轮次：0（Reviewer PASS 后无代码改动，仅清理重复路由文件后提交）
- 验证轮次：1
- diff 文件数：21

---

## 修改与 diff 逐项

| 文件 | AI 原实现 | 人工改动 | 验证结果 | 风险判定 | 漏改归因 |
|------|----------|----------|----------|----------|----------|
| `packages/desktop/src/main/jarvis-credential.ts` | 从 `~/Jarvis/.ai/scripts/credential_store.py` 读取 Kimi 凭据，缓存结果 | 无 | typecheck PASS | 中 | design 未明确凭据 store 路径应配置化 |
| `packages/desktop/src/main/jarvis-llm.ts` | 主进程代理 Kimi Code API，模型硬编码 `kimi-k2-0711-preview`，SSE 解析只取 `content` | 无 | typecheck PASS | 中 | design 未明确模型名应配置化 |
| `packages/desktop/src/renderer/jarvis/LLM.ts` | 通过 `window.api.jarvisStreamChat` 调用主进程代理，Promise 封装 | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/renderer/jarvis/Voice.ts` | Web Speech API 封装，语音识别/合成降级 | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/renderer/jarvis/Store.ts` | SolidJS store 全局状态，消息列表 + 状态 + 输入 | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/renderer/jarvis/HUD.tsx` | 组合 StatusBar / ChatFeed / InputBar / SidePanel | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/renderer/jarvis/InputBar.tsx` | 发送逻辑、语音识别触发、状态流转（thinking → speaking → idle） | 无 | typecheck PASS | 中 | Reviewer 未发现 speaking→idle 状态同步是 best-effort |
| `packages/desktop/src/renderer/index.tsx` | sidecar 初始化后用 `JarvisOSHUD` 替换 `AppInterface` | 无 | typecheck PASS | 中 | clarify 已确认 Phase 2 不依赖 OpenCode App，符合设计 |
| `packages/desktop/src/main/ipc.ts` | 注册 `jarvis:stream-chat` IPC 通道 | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/preload/index.ts` | 暴露 `jarvisStreamChat` API | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/preload/types.ts` | 定义 `jarvisStreamChat` 类型 | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/renderer/jarvis/ChatFeed.tsx` | 消息流展示与自动滚动 | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/renderer/jarvis/StatusBar.tsx` | 顶部状态条 + 实时时间 | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/renderer/jarvis/SidePanel.tsx` | 右侧占位面板 | 无 | typecheck PASS | 低 | — |
| `packages/desktop/src/renderer/jarvis/index.css` | HUD 样式变量与布局 | 无 | typecheck PASS | 低 | — |
| `docs/09-dev-records/core-chat/design.md` | Phase 2 技术设计 | 无 | — | 低 | — |
| `docs/09-dev-records/core-chat/tasks.md` | 13 个 Task 全部完成 | 无 | — | 低 | — |
| `docs/09-dev-records/core-chat/flow-data-v1.json` | 流程 v1 数据 | 无 | — | 低 | — |
| `docs/09-dev-records/core-chat/flow-data-v2.json` | Reviewer 段流程数据 | 无 | — | 低 | — |
| `docs/roadmap.md` | JarvisOS 全阶段实施路线图 | 无 | — | 低 | — |
| `docs/projects/JarvisOS/route/PROJECT_ROUTE.md` | 路由回填文件，错误创建在 JarvisOS 仓库内 | 已删除 | — | 低 | code 实现时路由文件落错仓库，已在提交前清理 |

---

## 流程改进项（写入 reflection-rules 的候选）

按环节归类，每个条目必须可执行、可检查：

- **clarify**
  - [ ] Phase 2 是否允许完全替换 OpenCode Desktop 主界面？后续 Phase 是否需要保留 IDE 入口做双模式切换？
  - [ ] 语音输入的默认语言是否固定为 `zh-CN`？是否需要根据用户设置动态切换？

- **design**
  - [ ] 凭据 store 路径应支持环境变量 `JARVIS_CREDENTIAL_STORE`，但默认路径变更时需评估影响。
  - [ ] LLM 模型名、baseURL、默认 temperature 等应进入配置层，禁止在业务代码中硬编码。
  - [ ] 状态机设计文档应明确 `speaking → idle` 的转换条件（语音合成结束事件 vs 轮询）。

- **verify**
  - [ ] Electron 主进程 LLM 代理应补充单元测试：SSE 解析边界（空行、`[DONE]`、异常 JSON）。
  - [ ] Store 状态变更应补充测试：`appendAssistantContent` 在空消息列表时的行为。
  - [ ] 端到端验证应包括：凭据缺失时的降级提示、LLM API 错误时的 UI 反馈。

- **reviewer**
  - [ ] 增加规则：任何硬编码的外部路径/模型名/URL 必须加 `// CONFIG` 标记或配置化说明。
  - [ ] 增加规则：状态流转代码必须检查最终状态复位是否可靠（尤其是定时器/best-effort 场景）。

---

## 进入 Archiver 结论

- [x] 校准通过，可以进入 Archiver
- [ ] 存在阻塞项，需继续修改
- 阻塞项说明：无

---

## 备注

- 本次校准在 Reviewer PASS 后立即提交，无额外代码改动。
- 唯一人工干预：发现并删除 JarvisOS 仓库内重复创建的路由文件（应与 Jarvis 主仓库的 `docs/projects/JarvisOS/route/PROJECT_ROUTE.md` 区分）。
- 所有中风险项均为可接受的 Phase 2 原型债务，已在流程改进项中记录，建议 Phase 3 开始前配置化清理。
