import { ChatFeed } from "./ChatFeed"
import { InputBar } from "./InputBar"
import { HolographicHub } from "./HolographicHub"
import { StatusBar } from "./StatusBar"
import { TaskPanel } from "./TaskPanel"
import { JarvisBootSequence } from "./BootSequence"
import "./index.css"
import { createSignal, Show } from "solid-js"

export function JarvisOSHUD() {
  const [bootVisible, setBootVisible] = createSignal(true)

  return (
    <div class="jarvis-os-hud relative flex flex-col h-screen w-screen overflow-hidden bg-background-base text-text-primary">
      <StatusBar />
      <div class="flex flex-1 min-h-0 overflow-hidden">
        <div class="flex flex-col flex-1 min-w-0 min-h-0">
          <ChatFeed />
          <InputBar />
        </div>
      </div>
      <HolographicHub />
      <TaskPanel />
      <Show when={bootVisible()}>
        <JarvisBootSequence mode="overlay" onComplete={() => setBootVisible(false)} />
      </Show>
    </div>
  )
}
