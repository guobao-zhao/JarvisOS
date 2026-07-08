import type { Message } from "./Store"

export async function streamChat(
  messages: Pick<Message, "role" | "content">[],
  onText: (delta: string) => void,
  onError: (error: Error) => void,
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
    })
  })
}
