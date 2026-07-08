import { createEffect, For, onMount } from "solid-js"
import { jarvisStore, type Message } from "./Store"

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

function MessageBubble(props: { message: Message }) {
  const isUser = () => props.message.role === "user"

  return (
    <div class={`flex w-full ${isUser() ? "justify-end" : "justify-start"}`}>
      <div
        class={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser()
            ? "bg-accent-primary text-white rounded-br-md"
            : "bg-surface-elevated text-text-primary rounded-bl-md"
        }`}
      >
        <div class="whitespace-pre-wrap">{props.message.content}</div>
        <div class={`text-[10px] mt-1.5 ${isUser() ? "text-white/60" : "text-text-tertiary"}`}>
          {formatTime(props.message.createdAt)}
        </div>
      </div>
    </div>
  )
}

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
    <div
      ref={scrollRef}
      class="flex-1 overflow-y-auto px-6 py-4 space-y-4 scroll-smooth"
    >
      <For each={jarvisStore.messages}>{(message) => <MessageBubble message={message} />}</For>

      {jarvisStore.messages.length === 0 && (
        <div class="h-full flex flex-col items-center justify-center text-text-tertiary">
          <p class="text-lg font-medium">你好，宝哥</p>
          <p class="text-sm mt-1">有什么可以帮你的？</p>
        </div>
      )}
    </div>
  )
}
