import type { JarvisStreamChatOptions } from "../../preload/types"

export interface StreamMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export async function streamChat(
  messages: StreamMessage[],
  onText: (delta: string) => void,
  onError: (error: Error) => void,
  options?: JarvisStreamChatOptions,
): Promise<void> {
  return new Promise((resolve) => {
    const cleanup = window.api.jarvisStreamChat(messages, {
      onDelta: (delta) => {
        onText(delta)
      },
      onError: (error) => {
        onError(new Error(error))
        cleanup()
        resolve()
      },
      onDone: () => {
        cleanup()
        resolve()
      },
    }, options)
  })
}
