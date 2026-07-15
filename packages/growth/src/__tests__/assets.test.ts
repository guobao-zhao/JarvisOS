import { describe, expect, it } from "bun:test"
import { calculateMaturity, isHighRiskAsset, type GrowthAsset, type GrowthReport } from "../index"

describe("Growth core types", () => {
  it("calculates maturity from value dimensions", () => {
    expect(calculateMaturity({ usability: 80, reliability: 70, value: 90, risk: 20 })).toBe(80)
  })

  it("identifies high-risk assets", () => {
    const asset: GrowthAsset = {
      id: "asset:skill:writer",
      sourcePath: ".ai/skills/prod-toca-wiki-writer/SKILL.md",
      sourceSystem: "jarvis",
      kind: "capability",
      title: "prod-toca-wiki-writer",
      summary: "Writes TOCA Wiki pages",
      tags: ["skill", "external-write"],
      riskLevel: "high",
      status: "classified",
      createdAt: 1,
      updatedAt: 1,
    }

    expect(isHighRiskAsset(asset)).toBe(true)
  })

  it("represents a migration report", () => {
    const report: GrowthReport = {
      generatedAt: 1,
      sourceRoot: "/tmp/jarvis-fixture",
      totals: {
        discovered: 2,
        classified: 2,
        sandboxPassed: 1,
        sandboxFailed: 0,
        promotionReady: 1,
        highRisk: 1,
      },
      assets: [],
      scores: [],
      suggestions: [],
      risks: [],
      nextActions: [],
    }

    expect(report.totals.discovered).toBe(2)
  })
})
