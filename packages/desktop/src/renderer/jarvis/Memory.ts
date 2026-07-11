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
