import { ChatFeed } from "./ChatFeed"
import { InputBar } from "./InputBar"
import { SidePanel } from "./SidePanel"
import { StatusBar } from "./StatusBar"
import "./index.css"

export function JarvisOSHUD() {
  return (
    <div class="jarvis-hud flex flex-col h-dvh w-screen overflow-hidden bg-background-base text-text-primary">
      <StatusBar />
      <div class="flex flex-1 overflow-hidden">
        <div class="flex flex-col flex-1 min-w-0">
          <ChatFeed />
          <InputBar />
        </div>
        <SidePanel />
      </div>
    </div>
  )
}
