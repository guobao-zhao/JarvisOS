# 技术设计 — JarvisOS Phase 3 Memory 接入

> 需求名称：memory-access  
> 项目：JarvisOS  
> 设计阶段：Phase 3（紧跟 Phase 2 Core Chat）  
> 更新：2026-07-08

---

## 改动文件清单

| 文件 | 改动目标 |
|------|----------|
| `packages/memory/package.json` | 新增 workspace 包，声明依赖与导出 |
| `packages/memory/src/index.ts` | 统一导出 `MemoryService` 与类型 |
| `packages/memory/src/client.ts` | LLM-wiki HTTP 客户端：health/search/read/rescan |
| `packages/memory/src/templates.ts` | 写入模板：对话萃取 / 情报摘要 / 任务记录 |
| `packages/memory/src/search.ts` | 向量/关键词搜索封装 + 召回上下文组装 |
| `packages/memory/src/config.ts` | 读取 `LLM_WIKI_API_TOKEN` / `LLM_WIKI_PROJECT` / `JARVIS_MEMORY_OUTBOX` |
| `packages/desktop/src/main/jarvis-memory.ts` | Electron 主进程：MemoryService 代理，避免 API token 进入渲染进程 |
| `packages/desktop/src/main/ipc.ts` | 注册 `jarvis:memory-search` / `jarvis:memory-write` IPC 通道 |
| `packages/desktop/src/preload/index.ts` | 暴露 `jarvisMemorySearch` / `jarvisMemoryWrite` API |
| `packages/desktop/src/preload/types.ts` | 补充 Memory IPC 类型 |
| `packages/desktop/src/renderer/jarvis/Memory.ts` | 渲染进程封装，调用主进程代理 |
| `packages/desktop/src/renderer/jarvis/Store.ts` | 增加 `recalledMemories` 状态 |
| `packages/desktop/src/renderer/jarvis/SidePanel.tsx` | 展示最近召回的记忆条目 |
| `packages/desktop/src/renderer/jarvis/InputBar.tsx` | 对话前召回记忆、对话后写入记忆 |
| `docs/projects/JarvisOS/route/PROJECT_ROUTE.md` | 追加 Memory 模块文件索引（雁过留痕） |

---

## 接口设计

### MemoryService（主进程 + 渲染层共享类型）

```typescript
export type MemorySource =
  | "conversation"
  | "intelligence"
  | "user_manual"
  | "task"
  | "insight"

export interface MemoryDocument {
  id: string
  source: MemorySource
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
  relations?: string[]
}

export interface MemoryHit {
  id: string
  title: string
  content: string
  score: number
  source: MemorySource
  path?: string
}

export interface MemorySearchOptions {
  topK?: number
  source?: MemorySource
  includeContent?: boolean
}

export interface MemoryHealth {
  ok: boolean
  authConfigured: boolean
  projectResolved: boolean
  writable: boolean
  reason?: string
}

export interface MemoryService {
  health(): Promise<MemoryHealth>
  search(query: string, options?: MemorySearchOptions): Promise<MemoryHit[]>
  read(id: string): Promise<MemoryDocument | null>
  write(doc: MemoryDocument): Promise<void>
}
```

### IPC 契约

```typescript
// preload/types.ts 追加
export type JarvisMemorySearchRequest = {
  query: string
  topK?: number
  source?: MemorySource
  includeContent?: boolean
}

export type JarvisMemorySearchResponse =
  | { ok: true; hits: MemoryHit[] }
  | { ok: false; error: string }

export type JarvisMemoryWriteRequest = {
  doc: MemoryDocument
}

export type JarvisMemoryWriteResponse =
  | { ok: true }
  | { ok: false; error: string }
```

> IPC 模式：主进程使用 `ipcMain.handle`，preload 使用 `ipcRenderer.invoke`，避免并发调用时结果错配。

---

## 数据流

### 1. 对话前召回

1. `InputBar.handleSend()` 在追加 user 消息后，调用 `recallMemories(query)`。
2. `Memory.ts` 通过 IPC 调用主进程 `jarvis:memory-search`。
3. 主进程 `jarvis-memory.ts` 读取 token/project，调用 LLM-wiki `/api/v1/projects/{id}/search`。
4. 结果返回渲染进程，写入 `jarvisStore.recalledMemories`。
5. `runAssistantTurn()` 组装 messages 时，把 Top-K 记忆注入 system prompt（作为一段上下文文本）。

### 2. 对话后写入

1. assistant 回复结束且语音播放开始后，调用 `extractMemory(messages)`。
2. 使用一个轻量级 prompt 让 LLM 从本轮对话提炼 `MemoryDocument[]`（事实/偏好/决策/任务）。
3. `Memory.ts` 通过 IPC 调用主进程 `jarvis:memory-write`。
4. 主进程将 markdown 内容写入 `JARVIS_MEMORY_OUTBOX/{source}/{yyyy-MM}/{id}.md`。
5. 调用 LLM-wiki `POST /api/v1/projects/{id}/sources/rescan` 触发索引。
6. 若 LLM-wiki 不可用或写入失败，记录 warning，不阻塞对话。

### 3. LLM 主动搜索工具（Phase 4 预留接口）

`MemoryService.search()` 设计为可被 Core 工具层调用。Phase 3 先在 InputBar 中手动调用，Phase 4 通过 `memory_search` tool 暴露给 LLM。

---

## 关键约束

1. **LLM-wiki v1 无直接 write 端点**
   - 写入通过"投递目录 + rescan"间接完成。
   - 默认投递目录：`~/Jarvis/JarvisOS/memory-outbox/`。
   - 用户需在 LLM-wiki 中将该目录添加为 Source Folder。

2. **API Token 安全**
   - `LLM_WIKI_API_TOKEN` 只在 Electron 主进程读取，不进入 preload/renderer bundle。
   - 渲染进程只能看到 search/write 的 IPC 调用，看不到 token。

3. **本地优先与降级**
   - `MemoryClient.health()` 在启动时检测 LLM-wiki 是否可连接、token 是否有效、project 是否存在。
   - 任一检查失败 → `writable: false`，系统进入无记忆模式：
     - search 返回空数组
     - write 只写本地 outbox，不重试 rescan
     - HUD 显示"记忆服务离线"提示

4. **文件命名与幂等**
   - 文件名基于 `doc.id`，保证同一文档多次写入不会创建重复文件。
   - 写入前先检查文件是否存在，内容相同则跳过 rescan。

5. **避免阻塞 UI**
   - search/write 都是异步 IPC，结果通过回调/Promise 返回。
   - write 在 assistant 回复结束后后台执行，不影响 speaking 状态。

---

## 设计自检

- [x] **需求覆盖率**：roadmap 中 Phase 3 的 6 项任务（技术设计、创建模块、写入、召回、HUD 集成、验证）均已映射到 Task。
- [x] **占位符扫描**：tasks.md 无 TBD/TODO，所有关键实现均有代码片段。
- [x] **命名一致性**：
  - `MemoryDocument.source` 与设计文档 `MemoryDocument.source` 枚举一致
  - `MemoryService` 接口与设计文档契约一致
  - IPC 通道统一使用 `jarvis:memory-*` 前缀
- [x] **历史规则检查**：当前 `docs/projects/JarvisOS/reflection-rules.md` 不存在，无历史规则需要覆盖。Phase 2 reflection.md 中的流程改进项（硬编码路径/模型、状态同步 best-effort）不落在本次 Memory 设计范围内，但本次设计已避免在 `packages/memory` 中硬编码 API URL/token（均走配置）。
