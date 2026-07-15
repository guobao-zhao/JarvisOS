import { describe, expect, it } from "bun:test"
import type { GrowthReport } from "../assets"
import { createDecisionChallenges } from "../challenge"

describe("decision challenges", () => {
  it("challenges high-risk promotions", () => {
    const report: GrowthReport = {
      generatedAt: 1,
      sourceRoot: "/tmp",
      totals: { discovered: 1, classified: 1, sandboxPassed: 0, sandboxFailed: 1, promotionReady: 0, highRisk: 1 },
      assets: [],
      scores: [],
      suggestions: [{ assetId: "a", title: "write-skill", recommended: false, reason: "risk", risk: "高风险能力，不能自动晋升。", action: "observe" }],
      risks: [],
      nextActions: [],
    }

    const challenges = createDecisionChallenges(report)
    expect(challenges[0]?.id).toBe("growth-risk-boundary")
  })
})
