import type { GrowthProfile, GrowthReport } from "./assets"

export function createGrowthProfile(report: GrowthReport): GrowthProfile {
  const tagCounts = new Map<string, number>()
  for (const asset of report.assets) {
    for (const tag of asset.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  }

  const focusAreas = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag]) => tag)

  return {
    focusAreas,
    safeCapabilityCount: report.assets.filter((asset) => asset.kind === "capability" && asset.riskLevel === "low").length,
    highRiskCount: report.totals.highRisk,
    promotionReadyCount: report.totals.promotionReady,
  }
}
