import { describe, expect, it } from "bun:test"
import { join } from "node:path"
import { createGrowthService } from "../service"

const fixtureRoot = join(import.meta.dir, "../../fixtures/jarvis-assets")

describe("GrowthService", () => {
  it("produces a migration growth report", async () => {
    const service = createGrowthService({ sourceRoot: fixtureRoot, now: () => 100 })
    const report = await service.scan()

    expect(report.sourceRoot).toBe(fixtureRoot)
    expect(report.totals.discovered).toBeGreaterThanOrEqual(4)
    expect(report.totals.classified).toBe(report.totals.discovered)
    expect(report.totals.highRisk).toBeGreaterThanOrEqual(1)
    expect(report.totals.sandboxPassed + report.totals.sandboxFailed).toBe(report.assets.filter((asset) => asset.kind === "capability").length)
    expect(report.assets.filter((asset) => asset.kind !== "capability").every((asset) => asset.status === "classified")).toBe(true)
    expect(report.suggestions.some((suggestion) => suggestion.recommended)).toBe(true)
    expect(report.risks.some((risk) => risk.includes("write-skill"))).toBe(true)
    expect(report.nextActions.length).toBeGreaterThan(0)
  })
})
