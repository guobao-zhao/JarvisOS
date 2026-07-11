import { ChatFeed } from "./ChatFeed"
import { InputBar } from "./InputBar"
import { LeftSidebar } from "./LeftSidebar"
import { RightSidebar } from "./RightSidebar"
import { StatusBar } from "./StatusBar"
import { TaskPanel } from "./TaskPanel"
import "./index.css"

export function JarvisOSHUD() {
  return (
    <div class="jarvis-os-hud relative flex flex-col h-screen w-screen overflow-hidden bg-background-base text-text-primary">
      <StatusBar />
      <div class="flex flex-1 min-h-0 overflow-hidden">
        <div class="flex flex-col flex-1 min-w-0 min-h-0">
          <ChatFeed />
          <InputBar />
        </div>
      </div>
      <TaskPanel />
      <LeftSidebar />
      <RightSidebar />
    </div>
  )
}
