import { LLMWikiClient } from "./client"
import { loadMemoryConfig } from "./config"
import { readMemoryDoc, searchMemoryDocs, writeMemoryDoc } from "./write"
import type { MemoryDocument, MemoryHealth, MemoryHit, MemorySearchOptions, MemoryService } from "./types"

export function createMemoryService(): MemoryService {
  const config = loadMemoryConfig()
  const client = new LLMWikiClient(config)

  return {
    async health(): Promise<MemoryHealth> {
      const base = await client.health()
      return {
        ...base,
        writable: base.writable && Boolean(config.outboxDir),
      }
    },
    async search(query, options) {
      try {
        const hits = await client.search(query, options)
        if (hits.length > 0) return hits
      } catch {
        // Fall back to local outbox search when LLM-wiki is unavailable or not yet indexed.
      }
      return searchMemoryDocs(query, config.outboxDir, options)
    },
    async read(id) {
      return (await client.read(id)) ?? (await readMemoryDoc(id, config.outboxDir))
    },
    async write(doc) {
      const result = await writeMemoryDoc(doc, client, config.outboxDir)
      if (!result.ok) throw new Error(result.error)
    },
  }
}
