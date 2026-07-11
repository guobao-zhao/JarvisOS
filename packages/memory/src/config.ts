import { homedir } from "node:os"
import { join } from "node:path"

export interface MemoryClientConfig {
  baseURL: string
  token: string
  project: string
  outboxDir: string
}

const DEFAULT_OUTBOX_DIR = join(homedir(), "Jarvis", "JarvisOS", "memory-outbox")

export function loadMemoryConfig(): MemoryClientConfig {
  return {
    baseURL: process.env.LLM_WIKI_BASE_URL ?? "http://127.0.0.1:19828",
    token: process.env.LLM_WIKI_API_TOKEN ?? "",
    project: process.env.LLM_WIKI_PROJECT ?? "current",
    outboxDir: process.env.JARVIS_MEMORY_OUTBOX ?? DEFAULT_OUTBOX_DIR,
  }
}
