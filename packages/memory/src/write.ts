import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { LLMWikiClient } from "./client"
import { formatMemoryDocument, frontmatterToDocument } from "./markdown"
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

  const now = new Date(doc.createdAt)
  const monthDir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const filePath = join(outboxDir, doc.source, monthDir, `${doc.id}.md`)
  const content = formatMemoryDocument(doc)

  try {
    await mkdir(dirname(filePath), { recursive: true })

    const existing = await readFile(filePath, "utf-8").catch(() => null)
    if (existing === content) {
      return { ok: true, path: filePath }
    }

    await writeFile(filePath, content, "utf-8")
    await client.rescan()
    return { ok: true, path: filePath }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function readMemoryDoc(
  id: string,
  outboxDir: string,
): Promise<MemoryDocument | null> {
  if (!outboxDir) return null

  const candidates: string[] = []

  // Direct path: outbox/{id}.md
  candidates.push(join(outboxDir, id))
  candidates.push(join(outboxDir, `${id}.md`))

  // Nested by source and month: outbox/{source}/{yyyy-MM}/{id}.md
  try {
    const sourceEntries = await readdir(outboxDir, { withFileTypes: true })
    for (const sourceEntry of sourceEntries) {
      if (!sourceEntry.isDirectory()) continue
      candidates.push(join(outboxDir, sourceEntry.name, `${id}.md`))
      try {
        const monthEntries = await readdir(join(outboxDir, sourceEntry.name), { withFileTypes: true })
        for (const monthEntry of monthEntries) {
          if (monthEntry.isDirectory()) {
            candidates.push(join(outboxDir, sourceEntry.name, monthEntry.name, `${id}.md`))
          }
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  for (const filePath of candidates) {
    try {
      await stat(filePath)
      const raw = await readFile(filePath, "utf-8")
      return frontmatterToDocument(id, raw)
    } catch {
      // continue to next candidate
    }
  }

  return null
}
