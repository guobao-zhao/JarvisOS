import type { GrowthReport } from "@jarvis-os/growth"
import type { MetricsService } from "../types"

export async function recordGrowthReportMetrics(service: MetricsService, report: GrowthReport): Promise<void> {
  const sandboxTotal = report.totals.sandboxPassed + report.totals.sandboxFailed

  await service.record({ category: "growth", name: "assets.discovered", value: report.totals.discovered, timestamp: report.generatedAt })
  await service.record({ category: "growth", name: "assets.classified", value: report.totals.classified, timestamp: report.generatedAt })
  await service.record({
    category: "growth",
    name: "sandbox.pass_rate",
    value: sandboxTotal === 0 ? 0 : Math.round((report.totals.sandboxPassed / sandboxTotal) * 100),
    unit: "percent",
    timestamp: report.generatedAt,
  })
  await service.record({ category: "growth", name: "sandbox.failure_count", value: report.totals.sandboxFailed, timestamp: report.generatedAt })
  await service.record({ category: "growth", name: "promotion.ready_count", value: report.totals.promotionReady, timestamp: report.generatedAt })
  await service.record({ category: "growth", name: "risk.high_count", value: report.totals.highRisk, timestamp: report.generatedAt })
}
