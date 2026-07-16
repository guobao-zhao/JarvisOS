import { readFile } from "node:fs/promises"
import type { JarvisMigrationImportResult, JarvisMigrationPreview } from "../preload/types"
import { handleJarvisMemoryWrite } from "./jarvis-memory"
import { buildMigrationMemoryDocument, previewJarvisMigrationManifest } from "./jarvis-migration-manifest"

export async function previewJarvisMigration(root: string): Promise<JarvisMigrationPreview> {
  return previewJarvisMigrationManifest(root)
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

    const result = await handleJarvisMemoryWrite(buildMigrationMemoryDocument(candidate, content))
    if (!result.ok) {
      skipped += 1
      continue
    }
    imported += 1
  }

  return { imported, skipped }
}
