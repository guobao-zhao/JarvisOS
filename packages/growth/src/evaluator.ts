import type { GrowthScore, SandboxResult } from "./assets"
import { calculateMaturity } from "./assets"
import type { ClassifiedGrowthAsset } from "./classifier"

function riskScore(item: ClassifiedGrowthAsset): number {
  if (item.asset.riskLevel === "high") return 90
  if (item.asset.riskLevel === "medium") return 55
  return 20
}

export function evaluateGrowthAsset(item: ClassifiedGrowthAsset, sandbox: SandboxResult, now: () => number = Date.now): GrowthScore {
  const usability = item.capability ? 75 : 55
  const reliability = sandbox.passed ? 80 : 30
  const value = item.asset.kind === "capability" ? 80 : 65
  const risk = riskScore(item)
  const evidence = [...sandbox.reasons]
  if (sandbox.blocked) evidence.push("sandbox blocked")
  if (sandbox.passed) evidence.push("static sandbox passed")

  return {
    assetId: item.asset.id,
    usability,
    reliability,
    value,
    risk,
    maturity: calculateMaturity({ usability, reliability, value, risk }),
    evidence: Array.from(new Set(evidence)),
    evaluatedAt: now(),
  }
}
