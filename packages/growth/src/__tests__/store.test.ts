import { describe, expect, it } from "bun:test"
import { mkdtemp, rm, readFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { GrowthReport } from "../assets"
import { appendGrowthReport, loadLatestGrowthReport, saveGrowthReport } from "../store"

const report = (generatedAt: number): GrowthReport => ({
  generatedAt,
  sourceRoot: "/tmp/jarvis",
  totals: {
    discovered: 1,
    classified: 1,
    sandboxPassed: 1,
    sandboxFailed: 0,
    promotionReady: 1,
    highRisk: 0,
  },
  assets: [],
  scores: [],
  suggestions: [],
  risks: [],
  nextActions: ["review promotion candidates"],
})

describe("Growth report store", () => {
  it("saves and loads the latest report", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-growth-store-"))
    try {
      const file = join(dir, "latest.json")
      await saveGrowthReport(file, report(100))
      const loaded = await loadLatestGrowthReport(file)
      expect(loaded?.generatedAt).toBe(100)
      expect(loaded?.totals.promotionReady).toBe(1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("returns null when latest report does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-growth-store-"))
    try {
      const loaded = await loadLatestGrowthReport(join(dir, "missing.json"))
      expect(loaded).toBeNull()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("appends reports as json lines", async () => {
    const dir = await mkdtemp(join(tmpdir(), "jarvis-growth-store-"))
    try {
      const file = join(dir, "history.jsonl")
      await appendGrowthReport(file, report(100))
      await appendGrowthReport(file, report(200))
      const content = await readFile(file, "utf8")
      const lines = content.trim().split("\n")
      expect(lines).toHaveLength(2)
      expect(JSON.parse(lines[1])?.generatedAt).toBe(200)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
