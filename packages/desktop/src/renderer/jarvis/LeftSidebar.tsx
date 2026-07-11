import { ToolsPanel } from "./ToolsPanel"

export function LeftSidebar() {
  return (
    <div class="pointer-events-none fixed left-6 top-24 z-30 flex flex-col gap-4">
      <ToolsPanel />
    </div>
  )
}
