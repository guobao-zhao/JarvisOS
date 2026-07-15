import { describe, expect, it } from "bun:test"
import type { GrowthReport } from "../assets"
import { createGrowthReminders } from "../reminders"

const baseReport = (overrides: Partial<GrowthReport>): GrowthReport => ({
  generatedAt: 1,
  sourceRoot: "/tmp",
  totals: { discovered: 1, classified: 1, sandboxPassed: 0, sandboxFailed: 0, promotionReady: 0, highRisk: 0 },
  assets: [],
  scores: [],
  suggestions: [],
  risks: [],
  nextActions: [],
  ...overrides,
})

describe("Growth reminders", () => {
  it("warns about high risk assets", () => {
    const reminders = createGrowthReminders(baseReport({ totals: { discovered: 1, classified: 1, sandboxPassed: 0, sandboxFailed: 0, promotionReady: 0, highRisk: 2 } }))
    expect(reminders.some((item) => item.id === "growth-high-risk-review")).toBe(true)
  })

  it("warns when no assets are discovered", () => {
    const reminders = createGrowthReminders(baseReport({ totals: { discovered: 0, classified: 0, sandboxPassed: 0, sandboxFailed: 0, promotionReady: 0, highRisk: 0 } }))
    expect(reminders.some((item) => item.id === "growth-source-root-empty")).toBe(true)
  })
})
