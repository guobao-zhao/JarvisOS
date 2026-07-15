import type { Dirent } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import type { RawGrowthSource } from "./assets"

export interface GrowthIngestionConfig {
  readonly sourceRoot: string
  readonly now?: () => number
}

const INCLUDE_ROOTS = [".ai/skills", ".ai/rules", "docs/projects", "docs/context"]
const INCLUDE_FILENAMES = new Set(["SKILL.md"])
const INCLUDE_EXTENSIONS = [".md", ".json", ".py", ".sh"]

function normalizePath(path: string): string {
  return path.split(sep).join("/")
}

function shouldInclude(relativePath: string): boolean {
  const normalized = normalizePath(relativePath)
  if (!INCLUDE_ROOTS.some((root) => normalized === root || normalized.startsWith(`${root}/`))) return false
  const filename = normalized.split("/").at(-1) ?? ""
  if (INCLUDE_FILENAMES.has(filename)) return true
  return INCLUDE_EXTENSIONS.some((ext) => normalized.endsWith(ext))
}

async function walk(root: string, current: string, files: string[]): Promise<void> {
  let entries: Dirent<string>[]
  try {
    entries = await readdir(current, { withFileTypes: true }) as Dirent<string>[]
  } catch {
    return
  }

  for (const entry of entries) {
    const absolutePath = join(current, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue
      await walk(root, absolutePath, files)
      continue
    }
    if (!entry.isFile()) continue
    const sourcePath = normalizePath(relative(root, absolutePath))
    if (shouldInclude(sourcePath)) files.push(absolutePath)
  }
}

export async function discoverGrowthSources(config: GrowthIngestionConfig): Promise<readonly RawGrowthSource[]> {
  try {
    const info = await stat(config.sourceRoot)
    if (!info.isDirectory()) return []
  } catch {
    return []
  }

  const files: string[] = []
  await walk(config.sourceRoot, config.sourceRoot, files)
  const discoveredAt = config.now?.() ?? Date.now()

  const sources = await Promise.all(
    files.sort().map(async (absolutePath) => {
      const sourcePath = normalizePath(relative(config.sourceRoot, absolutePath))
      const content = await readFile(absolutePath, "utf8")
      return {
        id: `source:${sourcePath}`,
        sourcePath,
        absolutePath,
        sourceSystem: "jarvis" as const,
        content,
        discoveredAt,
      }
    }),
  )

  return sources
}
