import { createStore, produce } from "solid-js/store"

export type JarvisStatus = "idle" | "listening" | "thinking" | "speaking"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
}

export interface JarvisState {
  messages: Message[]
  status: JarvisStatus
  inputText: string
}

interface JarvisActions {
  addMessage: (role: Message["role"], content: string) => void
  appendAssistantContent: (delta: string) => void
  setStatus: (status: JarvisStatus) => void
  setInputText: (text: string) => void
  resetInput: () => void
}

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const [state, setState] = createStore<JarvisState>({
  messages: [],
  status: "idle",
  inputText: "",
})

export const jarvisStore = state

export const jarvisActions: JarvisActions = {
  addMessage(role, content) {
    setState(
      produce((draft) => {
        draft.messages.push({
          id: generateMessageId(),
          role,
          content,
          createdAt: Date.now(),
        })
      }),
    )
  },

  appendAssistantContent(delta) {
    setState(
      produce((draft) => {
        const lastMessage = draft.messages[draft.messages.length - 1]
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content += delta
        } else {
          draft.messages.push({
            id: generateMessageId(),
            role: "assistant",
            content: delta,
            createdAt: Date.now(),
          })
        }
      }),
    )
  },

  setStatus(status) {
    setState("status", status)
  },

  setInputText(text) {
    setState("inputText", text)
  },

  resetInput() {
    setState("inputText", "")
  },
}
