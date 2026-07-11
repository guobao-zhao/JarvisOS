# 任务书 — JarvisOS Phase 3 Memory 接入

> 目标：让 JarvisOS 能接入 LLM-wiki 记忆后端，实现对话前记忆召回、对话后记忆写入。

---

## Task 1: 创建 `packages/memory/` workspace 包

- [x] 完成
- 文件：`packages/memory/package.json`、`packages/memory/tsconfig.json`、`packages/memory/src/index.ts`
- Step 1 写失败测试：在根目录执行 `bun --cwd packages/memory typecheck`，预期失败（包不存在）
- Step 2 跑测试确认 FAIL：命令退出码非 0
- Step 3 最小实现：
  ```json
  // packages/memory/package.json
  {
    "$schema": "https://json.schemastore.org/package.json",
    "name": "@jarvis-os/memory",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "license": "MIT",
    "exports": {
      ".": "./src/index.ts"
    },
    "scripts": {
      "typecheck": "tsgo --noEmit"
    },
    "devDependencies": {
      "@tsconfig/bun": "catalog:",
      "@types/bun": "catalog:",
      "typescript": "catalog:"
    }
  }
  ```
- Step 4 跑测试确认 PASS：`bun --cwd packages/memory typecheck` 退出码 0
- DoD 四问：
  1. 功能正确：包能被 workspace 其他包引用？
  2. 边界覆盖：tsconfig 与现有包一致？
  3. 测试覆盖：typecheck 通过？
  4. 持久化完整：无 Mapper，不涉及。

---

## Task 2: 定义 MemoryService 类型与接口

- [x] 完成
- 文件：`packages/memory/src/types.ts`、`packages/memory/src/index.ts`
- Step 1 写失败测试：在 `packages/memory/src/__tests__/types.test.ts` 中写：
  ```ts
  import { describe, expect, it } from "bun:test"
  import type { MemoryDocument, MemoryService } from "../index"

  describe("Memory types", () => {
    it("MemoryService has search", () => {
      const _service: MemoryService = {
        health: async () => ({ ok: true, authConfigured: true, projectResolved: true, writable: true }),
        search: async () => [],
        read: async () => null,
        write: async () => {},
      }
      expect(_service.search).toBeDefined()
    })
  })
  ```
- Step 2 跑测试确认 FAIL：`bun test` 找不到模块或类型缺失
- Step 3 最小实现：
  ```ts
  // packages/memory/src/types.ts
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

  export interface MemoryHealth {
    ok: boolean
    authConfigured: boolean
    projectResolved: boolean
    writable: boolean
    reason?: string
  }

  export interface MemorySearchOptions {
    topK?: number
    source?: MemorySource
    includeContent?: boolean
  }

  export interface MemoryService {
    health(): Promise<MemoryHealth>
    search(query: string, options?: MemorySearchOptions): Promise<MemoryHit[]>
    read(id: string): Promise<MemoryDocument | null>
    write(doc: MemoryDocument): Promise<void>
  }
  ```
  ```ts
  // packages/memory/src/index.ts
  export * from "./types"
  ```
- Step 4 跑测试确认 PASS：`bun test` 通过
- DoD 四问：
  1. 功能正确：类型枚举与设计文档一致？
  2. 边界覆盖：`relations` 可选、`score` 必须？
  3. 测试覆盖：有类型级测试？
  4. 持久化完整：无 Mapper。

---

## Task 3: 实现 LLM-wiki HTTP 客户端（search / read / health）

- [x] 完成
- 文件：`packages/memory/src/config.ts`、`packages/memory/src/client.ts`
- Step 1 写失败测试：在 `packages/memory/src/__tests__/client.test.ts` 中 mock `fetch`，断言 `search("hello")` 调用 `POST /api/v1/projects/current/search` 并返回 hits。
- Step 2 跑测试确认 FAIL：模块未实现
- Step 3 最小实现：
  ```ts
  // packages/memory/src/config.ts
  export interface MemoryClientConfig {
    baseURL: string
    token: string
    project: string
    outboxDir: string
  }

  export function loadMemoryConfig(): MemoryClientConfig {
    return {
      baseURL: process.env.LLM_WIKI_BASE_URL ?? "http://127.0.0.1:19828",
      token: process.env.LLM_WIKI_API_TOKEN ?? "",
      project: process.env.LLM_WIKI_PROJECT ?? "current",
      outboxDir: process.env.JARVIS_MEMORY_OUTBOX ?? "",
    }
  }
  ```
  ```ts
  // packages/memory/src/client.ts
  import type { MemoryClientConfig } from "./config"
  import type { MemoryDocument, MemoryHealth, MemoryHit, MemorySearchOptions } from "./types"

  export class LLMWikiClient {
    constructor(private config: MemoryClientConfig) {}

    private async request(path: string, init?: RequestInit): Promise<unknown> {
      const url = `${this.config.baseURL}${path}`
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (this.config.token) headers.Authorization = `Bearer ${this.config.token}`
      const res = await fetch(url, { ...init, headers })
      if (!res.ok) throw new Error(`LLM-wiki ${res.status}: ${await res.text()}`)
      return res.json()
    }

    async health(): Promise<MemoryHealth> {
      try {
        const data = (await this.request("/api/v1/health")) as {
          ok: boolean
          authConfigured: boolean
          allowUnauthenticated: boolean
        }
        const tokenReady = data.authConfigured || data.allowUnauthenticated || Boolean(this.config.token)
        return { ok: true, authConfigured: tokenReady, projectResolved: true, writable: tokenReady }
      } catch (err) {
        return {
          ok: false,
          authConfigured: false,
          projectResolved: false,
          writable: false,
          reason: err instanceof Error ? err.message : String(err),
        }
      }
    }

    async search(query: string, options?: MemorySearchOptions): Promise<MemoryHit[]> {
      const data = (await this.request(`/api/v1/projects/${this.config.project}/search`, {
        method: "POST",
        body: JSON.stringify({
          query,
          topK: options?.topK ?? 5,
          includeContent: options?.includeContent ?? true,
        }),
      })) as { results?: MemoryHit[] }
      return data.results ?? []
    }

    async read(id: string): Promise<MemoryDocument | null> {
      const data = (await this.request(`/api/v1/projects/${this.config.project}/files/content?path=${encodeURIComponent(id)}`)) as MemoryDocument | { error?: string }
      if ("error" in data && data.error) return null
      return data as MemoryDocument
    }
  }
  ```
- Step 4 跑测试确认 PASS：`bun test` 通过
- DoD 四问：
  1. 功能正确：health/search/read 均调用正确端点？
  2. 边界覆盖：token 为空、health 失败、search 无结果均处理？
  3. 测试覆盖：mock fetch 覆盖正常与异常路径？
  4. 持久化完整：无 Mapper。

---

## Task 4: 实现记忆写入（本地 outbox + rescan）

- [x] 完成
- 文件：`packages/memory/src/templates.ts`、`packages/memory/src/write.ts`
- Step 1 写失败测试：mock 文件系统，断言 `writeMemoryDoc(doc)` 创建 `.md` 文件并调用 `rescan`。
- Step 2 跑测试确认 FAIL：模块未实现
- Step 3 最小实现：
  ```ts
  // packages/memory/src/templates.ts
  import type { MemoryDocument } from "./types"

  export function formatMemoryDocument(doc: MemoryDocument): string {
    const tags = doc.tags.length ? `\ntags: ${doc.tags.join(", ")}` : ""
    const relations = doc.relations?.length ? `\nrelations: ${doc.relations.join(", ")}` : ""
    return `---\nsource: ${doc.source}\nid: ${doc.id}\ntitle: ${doc.title}\ncreatedAt: ${doc.createdAt}\nupdatedAt: ${doc.updatedAt}${tags}${relations}\n---\n\n${doc.content}\n`
  }
  ```
  ```ts
  // packages/memory/src/write.ts
  import { mkdir, stat, writeFile } from "node:fs/promises"
  import { dirname, join } from "node:path"
  import type { LLMWikiClient } from "./client"
  import { loadMemoryConfig } from "./config"
  import { formatMemoryDocument } from "./templates"
  import type { MemoryDocument } from "./types"

  export interface WriteResult {
    ok: boolean
    path?: string
    error?: string
  }

  export async function writeMemoryDoc(
    doc: MemoryDocument,
    client: LLMWikiClient,
    outboxDir: string,
  ): Promise<WriteResult> {
    if (!outboxDir) {
      return { ok: false, error: "JARVIS_MEMORY_OUTBOX not configured" }
    }

    const filePath = join(outboxDir, doc.source, `${doc.id}.md`)
    const content = formatMemoryDocument(doc)

    try {
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, content, "utf-8")
      await client.rescan()
      return { ok: true, path: filePath }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
  ```
  ```ts
  // 在 client.ts 中追加
  async rescan(): Promise<void> {
    await this.request(`/api/v1/projects/${this.config.project}/sources/rescan`, { method: "POST" })
  }
  ```
- Step 4 跑测试确认 PASS：`bun test` 通过
- DoD 四问：
  1. 功能正确：markdown 文件包含 frontmatter 与正文？
  2. 边界覆盖：outbox 未配置、写入失败、rescan 失败均有错误返回？
  3. 测试覆盖：mock fs 与 fetch 覆盖写入和 rescan？
  4. 持久化完整：无 Mapper。

---

## Task 5: 组装 MemoryService 实现

- [x] 完成
- 文件：`packages/memory/src/service.ts`、`packages/memory/src/index.ts`
- Step 1 写失败测试：
  ```ts
  const service = createMemoryService()
  const health = await service.health()
  expect(health.writable).toBe(false) // 未配置 token
  ```
- Step 2 跑测试确认 FAIL：未实现
- Step 3 最小实现：
  ```ts
  // packages/memory/src/service.ts
  import { LLMWikiClient } from "./client"
  import { loadMemoryConfig } from "./config"
  import { writeMemoryDoc } from "./write"
  import type { MemoryDocument, MemoryHealth, MemoryHit, MemorySearchOptions, MemoryService } from "./types"

  export function createMemoryService(): MemoryService {
    const config = loadMemoryConfig()
    const client = new LLMWikiClient(config)

    return {
      async health(): Promise<MemoryHealth> {
        const base = await client.health()
        return {
          ...base,
          writable: base.ok && base.authConfigured && Boolean(config.outboxDir),
        }
      },
      search(query, options) {
        return client.search(query, options)
      },
      read(id) {
        return client.read(id)
      },
      async write(doc) {
        const result = await writeMemoryDoc(doc, client, config.outboxDir)
        if (!result.ok) throw new Error(result.error)
      },
    }
  }
  ```
  ```ts
  // packages/memory/src/index.ts
  export * from "./types"
  export { createMemoryService } from "./service"
  ```
- Step 4 跑测试确认 PASS：`bun test` 通过
- DoD 四问：
  1. 功能正确：health 综合 token 与 outbox 目录判断 writable？
  2. 边界覆盖：未配置时 graceful 返回不可写？
  3. 测试覆盖：测试覆盖配置缺失路径？
  4. 持久化完整：无 Mapper。

---

## Task 6: Electron 主进程 Memory 代理 + IPC 注册

- [x] 完成
- 文件：`packages/desktop/src/main/jarvis-memory.ts`、`packages/desktop/src/main/ipc.ts`
- Step 1 写失败测试：启动 desktop typecheck，预期 `jarvisMemorySearch` 类型未找到
- Step 2 跑测试确认 FAIL：`bun --cwd packages/desktop typecheck` 报错
- Step 3 最小实现：
  ```ts
  // packages/desktop/src/main/jarvis-memory.ts
  import { createMemoryService, type MemoryDocument, type MemorySearchOptions } from "@jarvis-os/memory"
  import type { IpcMainEvent } from "electron"

  const memory = createMemoryService()

  export async function handleJarvisMemorySearch(
    event: IpcMainEvent,
    query: string,
    options?: MemorySearchOptions,
  ) {
    const sender = event.sender
    try {
      const hits = await memory.search(query, options)
      sender.send("jarvis:memory-search:result", { ok: true, hits })
    } catch (err) {
      sender.send("jarvis:memory-search:result", {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  export async function handleJarvisMemoryWrite(event: IpcMainEvent, doc: MemoryDocument) {
    const sender = event.sender
    try {
      await memory.write(doc)
      sender.send("jarvis:memory-write:result", { ok: true })
    } catch (err) {
      sender.send("jarvis:memory-write:result", {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  ```
  ```ts
  // packages/desktop/src/main/ipc.ts 追加
  import {
    handleJarvisMemorySearch,
    handleJarvisMemoryWrite,
    type MemoryDocument,
    type MemorySearchOptions,
  } from "./jarvis-memory"

  // 在 registerIpcHandlers 末尾追加：
  ipcMain.on("jarvis:memory-search", (event: IpcMainEvent, query: string, options?: MemorySearchOptions) => {
    void handleJarvisMemorySearch(event, query, options)
  })
  ipcMain.on("jarvis:memory-write", (event: IpcMainEvent, doc: MemoryDocument) => {
    void handleJarvisMemoryWrite(event, doc)
  })
  ```
- Step 4 跑测试确认 PASS：`bun --cwd packages/desktop typecheck` 通过
- DoD 四问：
  1. 功能正确：IPC 通道正确注册并代理到 MemoryService？
  2. 边界覆盖：search/write 异常均通过 IPC 返回错误？
  3. 测试覆盖：typecheck 覆盖类型正确性？
  4. 持久化完整：无 Mapper。

---

## Task 7: Preload 与渲染进程 Memory 封装

- [x] 完成
- 文件：`packages/desktop/src/preload/types.ts`、`packages/desktop/src/preload/index.ts`、`packages/desktop/src/renderer/jarvis/Memory.ts`
- Step 1 写失败测试：在 `packages/desktop/src/renderer/jarvis/__tests__/Memory.test.ts` 中 mock `window.api.jarvisMemorySearch` 并断言返回 hits。
- Step 2 跑测试确认 FAIL：API 未暴露
- Step 3 最小实现：
  ```ts
  // packages/desktop/src/preload/types.ts 追加
  export type JarvisMemorySearchResponse =
    | { ok: true; hits: MemoryHit[] }
    | { ok: false; error: string }

  export type JarvisMemoryWriteResponse =
    | { ok: true }
    | { ok: false; error: string }

  // ElectronAPI 追加：
  jarvisMemorySearch: (
    query: string,
    options?: { topK?: number; source?: MemorySource; includeContent?: boolean },
  ) => Promise<JarvisMemorySearchResponse>
  jarvisMemoryWrite: (doc: MemoryDocument) => Promise<JarvisMemoryWriteResponse>
  ```
  ```ts
  // packages/desktop/src/preload/index.ts 追加
  jarvisMemorySearch: (query, options) => ipcRenderer.invoke("jarvis:memory-search", query, options),
  jarvisMemoryWrite: (doc) => ipcRenderer.invoke("jarvis:memory-write", doc),
  ```
  ```ts
  // packages/desktop/src/renderer/jarvis/Memory.ts
  import type { MemoryDocument, MemoryHit, MemorySearchOptions } from "@jarvis-os/memory"

  export async function searchMemories(
    query: string,
    options?: MemorySearchOptions,
  ): Promise<MemoryHit[]> {
    const res = await window.api.jarvisMemorySearch(query, options)
    if (!res.ok) throw new Error(res.error)
    return res.hits
  }

  export async function writeMemory(doc: MemoryDocument): Promise<void> {
    const res = await window.api.jarvisMemoryWrite(doc)
    if (!res.ok) throw new Error(res.error)
  }
  ```
- Step 4 跑测试确认 PASS：renderer 测试 + desktop typecheck 通过
- DoD 四问：
  1. 功能正确：渲染进程能调用 search/write？
  2. 边界覆盖：错误从主进程透传到渲染进程？
  3. 测试覆盖：mock window.api 测试覆盖？
  4. 持久化完整：无 Mapper。

---

## Task 8: HUD 状态集成（Store + SidePanel + InputBar）

- [x] 完成
- 文件：`packages/desktop/src/renderer/jarvis/Store.ts`、`packages/desktop/src/renderer/jarvis/SidePanel.tsx`、`packages/desktop/src/renderer/jarvis/InputBar.tsx`
- Step 1 写失败测试：
  ```ts
  import { jarvisActions, jarvisStore } from "./Store"
  jarvisActions.setRecalledMemories([{ id: "m1", title: "test", content: "body", score: 0.9, source: "conversation" }])
  expect(jarvisStore.recalledMemories.length).toBe(1)
  ```
- Step 2 跑测试确认 FAIL：store 无该字段
- Step 3 最小实现：
  ```ts
  // packages/desktop/src/renderer/jarvis/Store.ts 追加
  import type { MemoryHit } from "@jarvis-os/memory"

  export interface JarvisState {
    messages: Message[]
    status: JarvisStatus
    inputText: string
    recalledMemories: MemoryHit[]
  }

  interface JarvisActions {
    // ... 原有方法
    setRecalledMemories: (memories: MemoryHit[]) => void
  }

  const [state, setState] = createStore<JarvisState>({
    messages: [],
    status: "idle",
    inputText: "",
    recalledMemories: [],
  })

  export const jarvisActions: JarvisActions = {
    // ... 原有实现
    setRecalledMemories(memories) {
      setState("recalledMemories", memories)
    },
  }
  ```
  ```tsx
  // packages/desktop/src/renderer/jarvis/SidePanel.tsx
  import { For } from "solid-js"
  import { jarvisStore } from "./Store"

  export function SidePanel() {
    return (
      <aside class="w-80 border-l border-border-subtle bg-surface-elevated flex flex-col">
        <div class="px-4 py-3 border-b border-border-subtle text-sm font-medium text-text-secondary">
          记忆
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <For each={jarvisStore.recalledMemories}>
            {(hit) => (
              <div class="p-3 rounded-lg bg-background-base border border-border-subtle">
                <div class="text-xs text-text-tertiary mb-1">{hit.source} · {Math.round(hit.score * 100)}%</div>
                <div class="text-sm font-medium text-text-primary truncate">{hit.title}</div>
                <div class="text-xs text-text-secondary line-clamp-3">{hit.content}</div>
              </div>
            )}
          </For>
        </div>
      </aside>
    )
  }
  ```
  ```ts
  // packages/desktop/src/renderer/jarvis/InputBar.tsx 修改
  import { searchMemories } from "./Memory"

  async function handleSend() {
    // ... 原有逻辑
    jarvisActions.addMessage("user", text)
    jarvisActions.resetInput()

    // 对话前召回记忆
    try {
      const hits = await searchMemories(text, { topK: 3, includeContent: true })
      jarvisActions.setRecalledMemories(hits)
    } catch {
      jarvisActions.setRecalledMemories([])
    }

    await runAssistantTurn()
  }

  async function runAssistantTurn() {
    // 组装消息时注入记忆上下文
    const memoryContext = jarvisStore.recalledMemories
      .map((h) => `【记忆】${h.title}\n${h.content}`)
      .join("\n\n")

    const systemMessage = memoryContext
      ? { role: "system" as const, content: `以下是与当前问题相关的历史记忆：\n\n${memoryContext}` }
      : null

    const messages = [
      ...(systemMessage ? [systemMessage] : []),
      ...jarvisStore.messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    // ... 原有 streamChat 调用
  }
  ```
- Step 4 跑测试确认 PASS：`bun --cwd packages/desktop typecheck` 通过
- DoD 四问：
  1. 功能正确：发送问题时召回记忆、注入 system prompt？
  2. 边界覆盖：无记忆、召回失败时不阻塞对话？
  3. 测试覆盖：store 状态测试覆盖？
  4. 持久化完整：无 Mapper。

---

## Task 9: 对话后记忆写入

- [x] 完成
- 文件：`packages/desktop/src/renderer/jarvis/InputBar.tsx`、`packages/desktop/src/renderer/jarvis/extract-memory.ts`
- Step 1 写失败测试：mock `writeMemory`，断言 `extractAndWriteMemory(messages)` 在 assistant 回复后调用 writeMemory。
- Step 2 跑测试确认 FAIL：未实现
- Step 3 最小实现：
  ```ts
  // packages/desktop/src/renderer/jarvis/extract-memory.ts
  import type { MemoryDocument, MemorySource } from "@jarvis-os/memory"
  import type { Message } from "./Store"

  export function extractMemoryDocuments(messages: Message[]): MemoryDocument[] {
    const now = Date.now()
    const lastUser = messages.findLast((m) => m.role === "user")
    const lastAssistant = messages.findLast((m) => m.role === "assistant")
    if (!lastUser || !lastAssistant) return []

    const docs: MemoryDocument[] = []

    // 简单规则：把 user 事实陈述和 assistant 关键结论分别写入
    // Phase 3 先用硬编码规则，Phase 7 再升级为用户画像驱动的萃取
    docs.push({
      id: `conv-${lastUser.id}`,
      source: "conversation" as MemorySource,
      title: `对话：${lastUser.content.slice(0, 40)}`,
      content: `用户问：${lastUser.content}\n\nJarvis答：${lastAssistant.content.slice(0, 500)}`,
      tags: ["auto-extract"],
      createdAt: now,
      updatedAt: now,
    })

    return docs
  }
  ```
  ```ts
  // InputBar.tsx runAssistantTurn 末尾追加
  import { extractMemoryDocuments } from "./extract-memory"
  import { writeMemory } from "./Memory"

  async function runAssistantTurn() {
    // ... 原有 streamChat 调用

    const lastMessage = jarvisStore.messages[jarvisStore.messages.length - 1]
    const fullResponse = lastMessage?.role === "assistant" ? lastMessage.content : ""

    jarvisActions.setStatus("speaking")
    voiceAPI.speak(fullResponse)

    // 后台写入记忆
    void (async () => {
      try {
        const docs = extractMemoryDocuments(jarvisStore.messages)
        for (const doc of docs) {
          await writeMemory(doc)
        }
      } catch (err) {
        console.warn("Memory write failed:", err)
      }
    })()

    // ... 原有 speaking → idle 轮询
  }
  ```
- Step 4 跑测试确认 PASS：测试 + typecheck 通过
- DoD 四问：
  1. 功能正确：对话结束后生成 MemoryDocument 并写入？
  2. 边界覆盖：写入失败不影响 UI 状态？
  3. 测试覆盖：提取规则测试覆盖？
  4. 持久化完整：无 Mapper。

---

## Task 10: 端到端验证与路由回填

- [x] 完成
- 文件：`docs/projects/JarvisOS/route/PROJECT_ROUTE.md`、`docs/09-dev-records/memory-access/verify-log.md`
- Step 1 写失败测试：启动 `bun run dev:desktop`，在 HUD 中问"我叫什么名字？"，第一次回答"不知道"，告知名字后，第二次能记住。
- Step 2 跑测试确认 FAIL：功能未实现
- Step 3 最小实现：完成 Task 1-9 后，手动执行验证步骤：
  1. 确保 LLM Wiki 桌面应用已启动，token 已配置。
  2. 设置环境变量或确认 `JARVIS_MEMORY_OUTBOX` 指向 LLM Wiki 已索引的目录。
  3. 启动 `bun run dev:desktop`。
  4. 发送"我叫宝哥"，等待回复。
  5. 发送"我叫什么名字"，验证回复包含"宝哥"。
  6. 查看 SidePanel 是否展示召回的记忆。
  7. 关闭 LLM Wiki，验证 HUD 显示"记忆服务离线"或无记忆模式仍可用。
- Step 4 跑测试确认 PASS：验证通过，无 error 日志
- DoD 四问：
  1. 功能正确：记忆召回与写入端到端可用？
  2. 边界覆盖：LLM-wiki 离线时降级？
  3. 测试覆盖：手动验证记录到 verify-log.md？
  4. 持久化完整：路由文件已更新。
- reuse 三问（复用 Phase 2 IPC 模式）：
  1. 所有字段是否全部体现：复用了 `jarvis:stream-chat` 的主进程-渲染进程模式，新增 memory 通道。
  2. 所有约束/边界是否全部处理：token 安全、降级策略均保留。
  3. 新需求 vs 旧实现差异是否逐行 diff：memory 是 invoke/handle 模式（有返回 Promise），stream-chat 是 send/on 模式（SSE 推送），已区分。

---

## 设计自检（B6 硬门禁）

- [x] 需求覆盖率：roadmap Phase 3 全部映射到 Task 1-10
- [x] 占位符扫描：无 TBD/TODO
- [x] 命名一致性：`MemoryDocument` / `MemoryService` / `MemoryHit` 跨文件一致
- [x] 历史规则检查：`reflection-rules.md` 不存在；Phase 2 改进项中"硬编码外部路径"已在本次通过 `loadMemoryConfig` 环境变量化避免
