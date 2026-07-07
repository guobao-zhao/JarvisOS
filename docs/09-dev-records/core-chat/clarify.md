# 需求边界确认单

**需求名称**: JarvisOS Core Chat — 让 JarvisOS 能聊天

**flow_type**: standard

**flow_start_time**: 2026-07-07T18:30:00+08:00

**真实目标(一句话)**: 把 JarvisOS Desktop 从 OpenCode 的 IDE 界面改造成 HUD 式交互面板，实现文本/语音输入、LLM 流式回复、语音输出，让 Jarvis 成为可见可对话的桌面管家。

**涉及服务/模块**:
- `packages/desktop/src/renderer/` — HUD 界面改造
- `packages/core/src/` — 会话编排、LLM tool-call 循环
- `packages/llm/src/` — Kimi provider 配置
- Electron main/preload — IPC 桥接

**数据库变更**: 无

**接口变更**:
- 内部：renderer ↔ main ↔ core 的 IPC/SSE 事件流
- 外部：通过 ai-sdk 调用 Kimi Code API（key 已存于 Jarvis 凭据金库 `kimi_code`）

**灰度开关**: 无，本地应用直接生效

**兼容性风险**:
- 会替换 OpenCode desktop 的原有主界面，OpenCode 原功能（终端、文件浏览器等）在 Phase 2 不再显示。
- 这是预期行为，JarvisOS 就是要摆脱 OpenCode 的 IDE 形态。

**高复杂度项**: 无

**方案选择**: 方案 A — 替换主界面为 HUD 式聊天面板

**历史规则命中**: 无（JarvisOS 无 reflection-rules.md）

**未澄清项**:
- 语音输入/输出先用浏览器原生 Web Speech API，不额外调 Whisper 等服务。
- Kimi 模型默认用 `kimi-k2-0711-preview`。

**确认状态**: ✅ 已确认
