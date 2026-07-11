import type { MemoryDocument, MemorySource } from "./types"

const MEMORY_SOURCES: MemorySource[] = [
  "conversation",
  "intelligence",
  "user_manual",
  "task",
  "insight",
]

export function isMemorySource(value: unknown): value is MemorySource {
  return typeof value === "string" && MEMORY_SOURCES.includes(value as MemorySource)
}

export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string")
  if (typeof value === "string" && value.length > 0) {
    return value.split(",").map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, string | string[] | undefined>
  body: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }

  const raw = match[1]
  const body = match[2]
  const frontmatter: Record<string, string | string[] | undefined> = {}

  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key === "tags" || key === "relations") {
      frontmatter[key] = value.split(",").map((s) => s.trim()).filter(Boolean)
    } else {
      frontmatter[key] = value
    }
  }

  return { frontmatter, body }
}

export function frontmatterToDocument(
  id: string,
  content: string,
): MemoryDocument {
  const { frontmatter, body } = parseFrontmatter(content)
  const sourceValue = frontmatter.source ?? "conversation"

  if (!isMemorySource(sourceValue)) {
    throw new Error(`Invalid memory source: ${sourceValue}`)
  }

  return {
    id: String(frontmatter.id ?? id),
    source: sourceValue,
    title: String(frontmatter.title ?? ""),
    content: body.trim(),
    tags: toStringArray(frontmatter.tags),
    createdAt: Number(frontmatter.createdAt ?? Date.now()),
    updatedAt: Number(frontmatter.updatedAt ?? Date.now()),
    relations: toStringArray(frontmatter.relations),
  }
}

export { formatMemoryDocument } from "./templates"
