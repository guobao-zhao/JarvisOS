import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { GrowthReport } from "./assets"

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
}

export async function saveGrowthReport(filePath: string, report: GrowthReport): Promise<void> {
  await ensureParent(filePath)
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

export async function loadLatestGrowthReport(filePath: string): Promise<GrowthReport | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as GrowthReport
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null
    throw error
  }
}

export async function appendGrowthReport(historyPath: string, report: GrowthReport): Promise<void> {
  await ensureParent(historyPath)
  await appendFile(historyPath, `${JSON.stringify(report)}\n`, "utf8")
}
