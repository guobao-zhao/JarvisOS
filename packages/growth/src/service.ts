import type { GrowthAsset, GrowthReport, GrowthScore, PromotionSuggestion } from "./assets"
import { classifyGrowthSources } from "./classifier"
import { createDecisionChallenges } from "./challenge"
import { evaluateGrowthAsset } from "./evaluator"
import { discoverGrowthSources } from "./ingestion"
import { createGrowthProfile } from "./profile"
import { createPromotionSuggestion } from "./promotion"
import { createGrowthReminders } from "./reminders"
import { createGrowthNextActions } from "./reflection"
import { runStaticSandbox } from "./sandbox"

export interface GrowthServiceConfig {
  readonly sourceRoot: string
  readonly now?: () => number
}

export interface GrowthService {
  readonly scan: () => Promise<GrowthReport>
}

export function createGrowthService(config: GrowthServiceConfig): GrowthService {
  const now = config.now ?? Date.now

  return {
    async scan() {
      const sources = await discoverGrowthSources({ sourceRoot: config.sourceRoot, now })
      const classified = classifyGrowthSources(sources)
      const assets: GrowthAsset[] = []
      const scores: GrowthScore[] = []
      const suggestions: PromotionSuggestion[] = []
      const risks: string[] = []
      let sandboxPassed = 0
      let sandboxFailed = 0
      let promotionReady = 0
      let highRisk = 0

      for (const item of classified) {
        const sandbox = runStaticSandbox(item, now)
        const score = evaluateGrowthAsset(item, sandbox, now)
        const suggestion = createPromotionSuggestion(item, score)
        const isCapability = item.asset.kind === "capability"
        const status = suggestion.recommended
          ? "promotion_ready"
          : isCapability
            ? sandbox.passed
              ? "sandbox_passed"
              : "sandbox_failed"
            : "classified"
        const asset: GrowthAsset = { ...item.asset, status, updatedAt: now() }

        if (isCapability && sandbox.passed) sandboxPassed += 1
        else if (isCapability) sandboxFailed += 1
        if (suggestion.recommended) promotionReady += 1
        if (asset.riskLevel === "high") {
          highRisk += 1
          risks.push(`${asset.title}: ${suggestion.risk}`)
        }

        assets.push(asset)
        scores.push(score)
        suggestions.push(suggestion)
      }

      const totals = {
        discovered: sources.length,
        classified: classified.length,
        sandboxPassed,
        sandboxFailed,
        promotionReady,
        highRisk,
      }

      const report: GrowthReport = {
        generatedAt: now(),
        sourceRoot: config.sourceRoot,
        totals,
        assets,
        scores,
        suggestions,
        risks,
        nextActions: [],
      }

      const withNextActions = { ...report, nextActions: createGrowthNextActions(report) }
      return {
        ...withNextActions,
        profile: createGrowthProfile(withNextActions),
        reminders: createGrowthReminders(withNextActions),
        challenges: createDecisionChallenges(withNextActions),
      }
    },
  }
}
