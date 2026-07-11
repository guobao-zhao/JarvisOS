import { LLMWikiClient } from "./client"
import { loadMemoryConfig } from "./config"
import { readMemoryDoc, writeMemoryDoc } from "./write"
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
    search(query, options) {
      return client.search(query, options)
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
