import { describe, expect, it } from "bun:test"
import type { GrowthReport } from "../assets"
import { createGrowthProfile } from "../profile"

const report: GrowthReport = {
  generatedAt: 1,
  sourceRoot: "/tmp",
  totals: { discovered: 2, classified: 2, sandboxPassed: 1, sandboxFailed: 0, promotionReady: 1, highRisk: 1 },
  assets: [
    { id: "a", sourcePath: "a", sourceSystem: "jarvis", kind: "capability", title: "A", summary: "A", tags: ["memory"], riskLevel: "low", status: "promotion_ready", createdAt: 1, updatedAt: 1 },
    { id: "b", sourcePath: "b", sourceSystem: "jarvis", kind: "process", title: "B", summary: "B", tags: ["memory", "flow"], riskLevel: "high", status: "classified", createdAt: 1, updatedAt: 1 },
  ],
  scores: [],
  suggestions: [],
  risks: [],
  nextActions: [],
}

describe("Growth profile", () => {
  it("summarizes focus areas and risk counts", () => {
    const profile = createGrowthProfile(report)
    expect(profile.focusAreas[0]).toBe("memory")
    expect(profile.safeCapabilityCount).toBe(1)
    expect(profile.highRiskCount).toBe(1)
    expect(profile.promotionReadyCount).toBe(1)
  })
})
