import { spawnSync } from "node:child_process"
import { readdir } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"

import {
  createMemoryService,
  loadMemoryConfig,
  searchMemoryDocs,
  type MemoryDocument,
  type MemoryHit,
  type MemorySearchOptions,
  type MemoryService,
} from "@jarvis-os/memory"
import { recordMemoryRecall } from "./jarvis-metrics"

export function injectLlmWikiTokenFromVault() {
  if (process.env.LLM_WIKI_API_TOKEN) return

  try {
    const script = join(homedir(), "Jarvis", ".ai", "scripts", "credential_store.py")
    const result = spawnSync("python3", [script, "get", "llm_wiki_api", "token"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "pipe"],
    })
    if (result.status === 0) {
      const token = result.stdout.trim()
      if (token) process.env.LLM_WIKI_API_TOKEN = token
    }
  } catch {
    // 金库读取失败时回退到环境变量或空 token，让后续 health 检查标记为不可写
  }
}

export async function resolveDefaultOutboxDir(): Promise<string | undefined> {
  // 如果用户显式配置了 outbox，优先尊重用户配置
  if (process.env.JARVIS_MEMORY_OUTBOX) return undefined

  const baseURL = process.env.LLM_WIKI_BASE_URL ?? "http://127.0.0.1:19828"
  const token = process.env.LLM_WIKI_API_TOKEN ?? ""

  try {
    const res = await fetch(`${baseURL}/api/v1/projects/current`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return undefined

    const data = (await res.json()) as {
      ok?: boolean
      currentProject?: { path?: string }
    }
    const projectPath = data.currentProject?.path
    if (!projectPath) return undefined

    // 直接写入当前 LLM-wiki 项目的 wiki 子目录，保证即时可搜索
    return join(projectPath, "wiki", "jarvisos-memory")
  } catch {
    return undefined
  }
}

export async function prepareJarvisMemoryEnv(): Promise<void> {
  injectLlmWikiTokenFromVault()
  const outboxDir = await resolveDefaultOutboxDir()
  if (outboxDir) {
    process.env.JARVIS_MEMORY_OUTBOX = outboxDir
  }
}

async function initMemoryService(): Promise<MemoryService> {
  await prepareJarvisMemoryEnv()
  return createMemoryService()
}

const memoryPromise = initMemoryService()

async function getMemory(): Promise<MemoryService> {
  return memoryPromise
}

export async function handleJarvisMemorySearch(query: string, options?: MemorySearchOptions) {
  const start = performance.now()
  try {
    const memory = await getMemory()
    const hits = await memory.search(query, options)
    void recordMemoryRecall({
      durationMs: Math.round(performance.now() - start),
      hitCount: hits.length,
      query,
    })
    return { ok: true, hits }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    void recordMemoryRecall({
      durationMs: Math.round(performance.now() - start),
      hitCount: 0,
      query,
    })
    return {
      ok: false,
      error,
    }
  }
}

export async function handleJarvisMemoryWrite(doc: MemoryDocument) {
  try {
    const memory = await getMemory()
    await memory.write(doc)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function countMarkdownFiles(dir: string): Promise<number> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  let total = 0
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += await countMarkdownFiles(path)
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      total += 1
    }
  }
  return total
}

function summarizeHits(hits: MemoryHit[]): MemoryHit[] {
  return hits.map((hit) => ({
    ...hit,
    content: hit.content.slice(0, 1000),
  }))
}

export async function handleJarvisMemoryDiagnostics(query: string) {
  try {
    await prepareJarvisMemoryEnv()
    const config = loadMemoryConfig()
    const memory = await getMemory()
    const health = await memory.health()
    const localDocCount = await countMarkdownFiles(config.outboxDir)
    const localHits = await searchMemoryDocs(query, config.outboxDir, {
      topK: 5,
      includeContent: true,
    })
    const effectiveHits = await memory.search(query, {
      topK: 5,
      includeContent: true,
    }).catch(() => [])

    return {
      ok: true,
      health,
      config: {
        baseURL: config.baseURL,
        project: config.project,
        outboxDir: config.outboxDir,
        tokenConfigured: Boolean(config.token),
      },
      localDocCount,
      localHits: summarizeHits(localHits),
      effectiveHits: summarizeHits(effectiveHits),
    }
  } catch (err) {
    const config = loadMemoryConfig()
    return {
      ok: false,
      health: {
        ok: false,
        authConfigured: false,
        projectResolved: false,
        writable: false,
        reason: err instanceof Error ? err.message : String(err),
      },
      config: {
        baseURL: config.baseURL,
        project: config.project,
        outboxDir: config.outboxDir,
        tokenConfigured: Boolean(config.token),
      },
      localDocCount: 0,
      localHits: [],
      effectiveHits: [],
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
