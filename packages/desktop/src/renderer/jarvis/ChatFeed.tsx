import { createEffect, onMount } from "solid-js"
import { JarvisCore } from "@/components/hud/core"
import { jarvisStore } from "./Store"
import { ConsciousnessPanel } from "./ConsciousnessPanel"
import { MemoryOrb } from "./MemoryOrb"
import { TaskField } from "./TaskField"
import { VoiceOrb } from "./VoiceOrb"

export function ChatFeed() {
  let scrollRef: HTMLDivElement | undefined

  createEffect(() => {
    // Subscribe to messages to trigger auto-scroll on new content
    const lastMessage = jarvisStore.messages[jarvisStore.messages.length - 1]
    const _ = jarvisStore.messages.length + (lastMessage?.content.length ?? 0)
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight
    }
  })

  onMount(() => {
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight
    }
  })

  return (
    <div ref={scrollRef} class="relative flex-1 min-h-0 overflow-y-auto scroll-smooth">
      {/* Jarvis consciousness whisper */}
      <ConsciousnessPanel />

      {/* Memory energy orb - above the core */}
      <div class="pointer-events-none fixed left-1/2 top-20 -translate-x-1/2 z-20">
        <MemoryOrb />
      </div>

      {/* Jarvis HUD core - central visual anchor */}
      <div class="pointer-events-none fixed inset-0 top-14 flex items-center justify-center z-0 opacity-90">
        <JarvisCore showControl={false} active={jarvisStore.status !== "idle"} />
        <div class="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <VoiceOrb />
        </div>
      </div>

      {/* Floating task capsules around the core */}
      <TaskField />

      {/* Messages are now contained in task capsules around the core */}
      <div class="relative z-10 flex min-h-full flex-col px-6 py-4 pointer-events-none" />
    </div>
  )
}
