# 技术设计 — JarvisOS Phase 2 Core Chat

## 改动文件清单

### 新增文件

| 文件 | 职责 |
|------|------|
| `packages/desktop/src/renderer/jarvis/Store.ts` | HUD 全局状态：消息列表、当前状态、输入文本 |
| `packages/desktop/src/renderer/jarvis/LLM.ts` | 封装 ai-sdk 调用 Kimi，流式返回文本 |
| `packages/desktop/src/renderer/jarvis/Voice.ts` | Web Speech API：语音识别 + 语音合成 |
| `packages/desktop/src/renderer/jarvis/HUD.tsx` | HUD 主布局：顶部状态条 + 对话流 + 输入栏 + 侧栏 |
| `packages/desktop/src/renderer/jarvis/ChatFeed.tsx` | 对话消息流展示 |
| `packages/desktop/src/renderer/jarvis/InputBar.tsx` | 底部输入栏：文本输入 + 语音按钮 + 发送 |
| `packages/desktop/src/renderer/jarvis/StatusBar.tsx` | 顶部状态条：JarvisOS 名称 + 当前状态 + 时间 |
| `packages/desktop/src/renderer/jarvis/SidePanel.tsx` | 右侧信息面板占位：系统状态、工具结果 |
| `packages/desktop/src/renderer/jarvis/index.css` | HUD 样式变量与基础布局 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `packages/desktop/package.json` | 新增 `ai`、`@ai-sdk/anthropic` 依赖 |
| `packages/desktop/src/renderer/index.tsx` | 用 `JarvisOSHUD` 替换原有的 `AppInterface` 渲染 |
| `docs/projects/JarvisOS/route/PROJECT_ROUTE.md` | 追加本次新增文件职责索引 |

## 接口设计

### 状态接口

```typescript
export type JarvisStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface JarvisState {
  messages: Message[]
  status: JarvisStatus
  inputText: string
  addMessage: (role: Message['role'], content: string) => void
  setStatus: (status: JarvisStatus) => void
  setInputText: (text: string) => void
}
```

### LLM 接口

```typescript
export async function streamChat(
  messages: Pick<Message, 'role' | 'content'>[],
  onText: (delta: string) => void,
  onError: (error: Error) => void,
): Promise<void>
```

### 语音接口

```typescript
export interface VoiceAPI {
  startRecognition(onResult: (text: string, isFinal: boolean) => void): void
  stopRecognition(): void
  speak(text: string): void
  stopSpeaking(): void
}
```

## 数据流

```
用户输入
  ├── 文本输入 ──→ InputBar ──→ Store.inputText ──→ 发送
  └── 语音输入 ──→ VoiceAPI.startRecognition ──→ 识别结果 ──→ Store.inputText ──→ 自动发送

发送消息
  ├── Store.addMessage('user', text)
  ├── Store.setStatus('thinking')
  ├── LLM.streamChat(messages, onTextDelta)
  │     └── ai-sdk → Kimi API → 流式 text-delta
  ├── onTextDelta → 追加到 assistant 消息
  ├── 流结束 → Store.setStatus('speaking')
  └── VoiceAPI.speak(完整回复) → 说完 → Store.setStatus('idle')
```

## 关键约束

1. **API Key 安全**：Kimi API key 从环境变量 `KIMI_API_KEY` 读取，不硬编码、不入 git。
2. **语音降级**：Web Speech API 在某些浏览器/环境下不可用，需优雅降级：语音识别不可用时隐藏麦克风按钮；语音合成不可用时只显示文字。
3. **流式 UI**： assistant 回复逐字显示，避免等待完整响应。
4. **状态可视化**：顶部状态条根据 `JarvisStatus` 改变颜色和文字。
5. **不依赖 OpenCode App**：Phase 2 用简化 HUD 替换 `AppInterface`，后续再逐步集成 core/session。
6. **本地优先**：所有 LLM 调用在渲染进程直接发起，不经过远程服务器。

## 设计自检

- [x] 需求覆盖率：文本输入、语音输入、LLM 流式回复、语音输出、HUD 展示均有对应 Task
- [x] 占位符扫描：tasks.md 无 TBD/TODO/含糊步骤
- [x] 命名一致性：统一使用 `Jarvis*` / `jarvis/` 前缀，状态名为 `JarvisStatus`
- [x] 历史规则检查：JarvisOS 无 reflection-rules.md，跳过
