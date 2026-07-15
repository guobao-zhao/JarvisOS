import { GrowthPanel } from "./GrowthPanel"
import { IntelligencePanel } from "./IntelligencePanel"
import { MetricsPanel } from "./MetricsPanel"
import { MigrationPanel } from "./MigrationPanel"
import { TaskOrb } from "./TaskOrb"

export function RightSidebar() {
  return (
    <div class="pointer-events-none fixed right-6 top-24 bottom-28 z-30">
      <div class="pointer-events-auto absolute top-0 right-0 flex flex-col gap-6">
        <MetricsPanel />
        <GrowthPanel />
        <IntelligencePanel />
        <MigrationPanel />
      </div>
      <div class="pointer-events-auto absolute bottom-10 right-0">
        <TaskOrb />
      </div>
    </div>
  )
}
