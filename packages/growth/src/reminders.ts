import type { GrowthReminder, GrowthReport } from "./assets"

export function createGrowthReminders(report: GrowthReport): GrowthReminder[] {
  const reminders: GrowthReminder[] = []

  if (report.totals.highRisk > 0) {
    reminders.push({
      id: "growth-high-risk-review",
      level: "warning",
      title: "Review high-risk Growth assets",
      message: `${report.totals.highRisk} high-risk assets need manual review before they can influence JarvisOS behavior.`,
    })
  }

  if (report.totals.promotionReady > 0) {
    reminders.push({
      id: "growth-promotion-review",
      level: "info",
      title: "Approve mature candidate tools",
      message: `${report.totals.promotionReady} candidate capabilities are ready for human approval.`,
    })
  }

  if (report.totals.discovered === 0) {
    reminders.push({
      id: "growth-source-root-empty",
      level: "warning",
      title: "Configure Growth source root",
      message: "Growth did not discover Jarvis assets. Set the source root to the original Jarvis repository and scan again.",
    })
  }

  return reminders
}
