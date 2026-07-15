import { readdir, readFile } from "node:fs/promises"
import { basename, join, relative } from "node:path"
import type { MemoryDocument } from "../preload/types"
import type { JarvisMigrationCandidate, JarvisMigrationImportResult, JarvisMigrationPreview } from "../preload/types"
import { handleJarvisMemoryWrite } from "./jarvis-memory"

const MIGRATION_DIRS = ["docs/context", "docs/dreams", "docs/projects"]

async function collectMarkdownFiles(root: string, relativeDir: string): Promise<string[]> {
  const dir = join(root, relativeDir)
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relativePath = relative(root, fullPath)
    if (entry.isDirectory()) files.push(...await collectMarkdownFiles(root, relativePath))
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath)
  }
  return files
}

function sourceForPath(path: string): MemoryDocument["source"] {
  if (path.includes("/dreams/")) return "intelligence"
  if (path.includes("/projects/")) return "insight"
  return "user_manual"
}

function tagsForPath(root: string, path: string): string[] {
  const parts = relative(root, path).split("/").filter(Boolean)
  return ["migration", ...parts.slice(0, -1)]
}

export async function previewJarvisMigration(root: string): Promise<JarvisMigrationPreview> {
  const files = (await Promise.all(MIGRATION_DIRS.map((dir) => collectMarkdownFiles(root, dir)))).flat()
  const candidates: JarvisMigrationCandidate[] = files.map((file) => ({
    sourcePath: file,
    title: basename(file, ".md"),
    source: sourceForPath(file),
    tags: tagsForPath(root, file),
  }))

  return { root, candidates, skipped: [] }
}

export async function importJarvisMigration(root: string): Promise<JarvisMigrationImportResult> {
  const preview = await previewJarvisMigration(root)
  let imported = 0
  let skipped = 0

  for (const candidate of preview.candidates) {
    const content = await readFile(candidate.sourcePath, "utf8").catch(() => null)
    if (!content || content.trim().length === 0) {
      skipped += 1
      continue
    }

    const now = Date.now()
    const result = await handleJarvisMemoryWrite({
      id: `migration:${candidate.sourcePath}`,
      source: candidate.source,
      title: candidate.title,
      content,
      tags: candidate.tags,
      createdAt: now,
      updatedAt: now,
      relations: [],
    })
    if (!result.ok) {
      skipped += 1
      continue
    }
    imported += 1
  }

  return { imported, skipped }
}
