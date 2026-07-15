import type { SandboxResult } from "./assets"
import type { ClassifiedGrowthAsset } from "./classifier"

export function runStaticSandbox(item: ClassifiedGrowthAsset, now: () => number = Date.now): SandboxResult {
  const reasons: string[] = []
  const capability = item.capability

  if (!capability) {
    reasons.push("not a capability")
    return { assetId: item.asset.id, level: "S0", passed: true, blocked: false, reasons, checkedAt: now() }
  }

  if (capability.sideEffects === "external_write") reasons.push("blocked side effect: external_write")
  if (item.asset.riskLevel === "high") reasons.push("blocked risk level: high")

  const blocked = reasons.some((reason) => reason.startsWith("blocked"))
  if (!blocked) reasons.push("static sandbox passed")

  return {
    assetId: item.asset.id,
    level: "S0",
    passed: !blocked,
    blocked,
    reasons,
    checkedAt: now(),
  }
}
