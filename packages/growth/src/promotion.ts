import type { GrowthScore, PromotionDecision, PromotionSuggestion } from "./assets"
import type { ClassifiedGrowthAsset } from "./classifier"

export function createPromotionSuggestion(item: ClassifiedGrowthAsset, score: GrowthScore): PromotionSuggestion {
  const recommended = item.asset.kind === "capability" && item.asset.riskLevel !== "high" && score.maturity >= 60
  const risk = item.asset.riskLevel === "high" ? "高风险能力，不能自动晋升。" : "低风险候选能力，可人工评审。"
  const action = recommended
    ? `建议人工确认后加入正式 tools registry：${item.capability?.name ?? item.asset.title}`
    : `保留在 Growth 候选池继续观察：${item.asset.title}`

  return {
    assetId: item.asset.id,
    title: item.asset.title,
    recommended,
    reason: recommended ? "只读或无副作用能力，静态沙箱通过，成熟度达到人工评审阈值。" : "成熟度不足或风险过高。",
    risk,
    action,
  }
}

export function approvePromotionSuggestion(
  suggestion: PromotionSuggestion,
  now: () => number = Date.now,
): PromotionDecision {
  if (!suggestion.recommended) {
    return {
      assetId: suggestion.assetId,
      approved: false,
      decidedAt: now(),
      reason: "Promotion suggestion is not recommended.",
    }
  }

  return {
    assetId: suggestion.assetId,
    approved: true,
    decidedAt: now(),
    promotedToolName: suggestion.title,
    reason: suggestion.reason,
  }
}
