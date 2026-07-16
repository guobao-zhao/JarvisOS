import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { LLMWikiClient } from "./client"
import { formatMemoryDocument, frontmatterToDocument } from "./markdown"
import type { MemoryDocument, MemoryHit, MemorySearchOptions } from "./types"

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

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(path))
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path)
    }
  }
  return files
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff:_-]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
}

function scoreDocument(doc: MemoryDocument, queryTokens: string[]): number {
  const title = doc.title.toLowerCase()
  const titleLeaf = title.split("/").at(-1)?.trim() ?? title
  const tags = doc.tags.join(" ").toLowerCase()
  const content = doc.content.toLowerCase()
  let score = 0

  for (const token of queryTokens) {
    if (titleLeaf === token) score += 10
    if (title.includes(token)) score += 6
    if (tags.includes(token)) score += 4
    if (content.includes(token)) score += 1
  }

  if (queryTokens.length > 0 && queryTokens.every((token) => `${title} ${tags} ${content}`.includes(token))) {
    score += 5
  }

  return score
}

export async function searchMemoryDocs(
  query: string,
  outboxDir: string,
  options?: MemorySearchOptions,
): Promise<MemoryHit[]> {
  if (!outboxDir) return []

  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  const files = await collectMarkdownFiles(outboxDir)
  const hits: Array<MemoryHit & { rawScore: number }> = []

  for (const file of files) {
    const raw = await readFile(file, "utf-8").catch(() => null)
    if (!raw) continue

    let doc: MemoryDocument
    try {
      doc = frontmatterToDocument(file, raw)
    } catch {
      continue
    }

    if (options?.source && doc.source !== options.source) continue

    const rawScore = scoreDocument(doc, queryTokens)
    if (rawScore <= 0) continue

    hits.push({
      id: doc.id,
      title: doc.title,
      content: options?.includeContent === false ? "" : doc.content,
      score: rawScore / Math.max(1, queryTokens.length * 10),
      source: doc.source,
      path: file,
      rawScore,
    })
  }

  return hits
    .sort((a, b) => {
      if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore
      return a.title.length - b.title.length
    })
    .slice(0, options?.topK ?? 5)
    .map(({ rawScore: _rawScore, ...hit }) => hit)
}
