import { describe, expect, it } from "bun:test"
import type { PromotionSuggestion } from "../assets"
import { approvePromotionSuggestion } from "../promotion"

describe("promotion approval", () => {
  it("approves recommended suggestions", () => {
    const suggestion: PromotionSuggestion = {
      assetId: "asset-1",
      title: "memory_search",
      recommended: true,
      reason: "safe and mature",
      risk: "low",
      action: "promote",
    }

    const decision = approvePromotionSuggestion(suggestion, () => 123)

    expect(decision.approved).toBe(true)
    expect(decision.assetId).toBe("asset-1")
    expect(decision.promotedToolName).toBe("memory_search")
    expect(decision.decidedAt).toBe(123)
  })

  it("rejects non-recommended suggestions", () => {
    const suggestion: PromotionSuggestion = {
      assetId: "asset-2",
      title: "write_shell",
      recommended: false,
      reason: "high risk",
      risk: "high",
      action: "observe",
    }

    const decision = approvePromotionSuggestion(suggestion, () => 456)

    expect(decision.approved).toBe(false)
    expect(decision.promotedToolName).toBeUndefined()
    expect(decision.decidedAt).toBe(456)
  })
})
