# 任务书 — JarvisOS Phase 2 Core Chat

> 目标：让 JarvisOS 能聊天，实现文本/语音输入 → LLM 流式回复 → HUD 显示。

---

## Task 1: 安装 ai-sdk 依赖

- [x] 完成
- 文件：`packages/desktop/package.json`
- Step 3 最小实现：无需新增 LLM SDK 依赖；Electron 主进程从凭据金库读取 `kimi_code`（api_key / base_url），代理调用 Kimi Code API，通过 IPC + SSE 推送增量到渲染进程
- Step 4 验证：`cd packages/desktop && bun install && bun run typecheck`
- DoD：typecheck 通过

---

## Task 2: 创建 HUD 全局状态 Store

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/Store.ts`
- Step 3 最小实现：定义 `JarvisStatus`、`Message`、`JarvisState`，用 `solid-js/store` 创建全局 store，暴露 `addMessage`、`appendAssistantContent`、`setStatus`、`setInputText`
- Step 4 验证：`bun run typecheck` 通过
- DoD：store 可被组件订阅和修改

---

## Task 3: 创建 LLM 服务

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/LLM.ts`
- Step 3 最小实现：在 `packages/desktop/src/renderer/jarvis/LLM.ts` 中通过 `window.api.jarvisStreamChat` 调用主进程代理；只向 UI 输出 `content`，过滤 `reasoning_content`
- Step 4 验证：`bun run typecheck` 通过
- DoD：函数签名与设计一致，类型无报错

---

## Task 4: 创建语音服务

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/Voice.ts`
- Step 3 最小实现：封装 `SpeechRecognition` 做语音识别，`speechSynthesis` 做语音合成，提供 `startRecognition`、`stopRecognition`、`speak`、`stopSpeaking`
- Step 4 验证：在浏览器控制台可调用
- DoD：API 与设计一致，无语音识别时降级

---

## Task 5: 创建 StatusBar 组件

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/StatusBar.tsx`
- Step 3 最小实现：展示 JARVISOS 标题、当前状态标签、实时时间；状态改变时颜色/文字变化
- Step 4 验证：HUD 中能看到顶部状态条
- DoD：订阅 store.status

---

## Task 6: 创建 ChatFeed 组件

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/ChatFeed.tsx`
- Step 3 最小实现：滚动消息列表，区分 user/assistant 气泡，流式追加时自动滚动
- Step 4 验证：发送消息后消息显示在对话区
- DoD：订阅 store.messages

---

## Task 7: 创建 InputBar 组件

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/InputBar.tsx`
- Step 3 最小实现：文本输入框、发送按钮、麦克风按钮；发送时调用 LLM；语音按钮调用语音识别
- Step 4 验证：能打字发送，也能点击麦克风说话发送
- DoD：输入为空时禁用发送， thinking 状态禁用输入

---

## Task 8: 创建 SidePanel 组件

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/SidePanel.tsx`
- Step 3 最小实现：右侧占位面板，显示当前状态、简单说明文字，为后续指标/工具结果预留位置
- Step 4 验证：HUD 布局完整
- DoD：不影响主对话区域

---

## Task 9: 创建 HUD 主布局并替换 AppInterface

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/HUD.tsx`；修改 `packages/desktop/src/renderer/index.tsx`
- Step 3 最小实现：HUD 组合 StatusBar + ChatFeed + InputBar + SidePanel；在 `index.tsx` 中当 sidecar 初始化后用 JarvisOSHUD 替换 AppInterface
- Step 4 验证：`bun run dev:desktop` 启动后显示 JarvisOS HUD 而非 OpenCode IDE
- DoD：窗口显示新界面，无 OpenCode 原界面元素

---

## Task 10: 添加 HUD 样式

- [x] 完成
- 文件：新建 `packages/desktop/src/renderer/jarvis/index.css`
- Step 3 最小实现：深色背景、状态颜色变量、布局 flex、消息气泡基础样式
- Step 4 验证：界面不丑陋，文本可读
- DoD：导入到 HUD.tsx 中生效

---

## Task 11: 端到端验证聊天流程

- [x] 完成
- 文件：无
- Step 3 最小实现：在 HUD 中输入问题，确认 Kimi 流式回复逐字出现，语音输出播放
- Step 4 验证：肉眼验证 + 日志无 error
- DoD：能完成一次完整对话

---

## Task 12: 路由回填

- [x] 完成
- 文件：`docs/projects/JarvisOS/route/PROJECT_ROUTE.md`
- Step 3 最小实现：在核心文件表中追加本次新增文件及职责
- Step 4 验证：路由文档反映本次改动
- DoD：无占位符

---

## Task 13: Electron 主进程代理 LLM

- [x] 完成
- 文件：`packages/desktop/src/main/jarvis-credential.ts`、`packages/desktop/src/main/jarvis-llm.ts`、`packages/desktop/src/main/ipc.ts`、`packages/desktop/src/preload/index.ts`、`packages/desktop/src/preload/types.ts`
- Step 3 最小实现：主进程从凭据金库读取 Kimi 凭据并代理 SSE 请求；渲染进程通过 IPC 接收增量；不禁用 `webSecurity`
- Step 4 验证：端到端聊天无 CORS 报错、API key 不出现在渲染 bundle
- DoD：LLM 请求成功返回 200，凭据只停留在主进程
