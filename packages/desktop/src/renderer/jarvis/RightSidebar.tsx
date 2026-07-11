import { MetricsPanel } from "./MetricsPanel"
import { TaskOrb } from "./TaskOrb"

export function RightSidebar() {
  return (
    <div class="pointer-events-none fixed right-6 top-24 bottom-28 z-30">
      <div class="pointer-events-auto absolute top-0 right-0">
        <MetricsPanel />
      </div>
      <div class="pointer-events-auto absolute bottom-10 right-0">
        <TaskOrb />
      </div>
    </div>
  )
}
