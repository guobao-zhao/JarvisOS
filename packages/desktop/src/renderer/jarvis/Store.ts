import type { MemoryHit } from "@jarvis-os/memory"
import { createStore, produce } from "solid-js/store"

export type JarvisStatus = "idle" | "listening" | "thinking" | "speaking"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
}

export type TaskStatus = "active" | "closing" | "closed"

export interface TaskSession {
  id: string
  title: string
  messages: Message[]
  status: TaskStatus
  expanded: boolean
  createdAt: number
  updatedAt: number
}

export interface TaskDescription {
  taskId: string
  description: string
  createdAt: number
}

export interface JarvisState {
  messages: Message[]
  status: JarvisStatus
  inputText: string
  recalledMemories: MemoryHit[]
  isRecallingMemories: boolean
  isListening: boolean
  taskSessions: TaskSession[]
  taskDescriptions: TaskDescription[]
  expandedTaskId: string | null
}

interface JarvisActions {
  addMessage: (role: Message["role"], content: string) => void
  appendAssistantContent: (delta: string) => void
  setStatus: (status: JarvisStatus) => void
  setInputText: (text: string) => void
  resetInput: () => void
  setRecalledMemories: (memories: MemoryHit[]) => void
  setIsRecallingMemories: (value: boolean) => void
  setIsListening: (value: boolean) => void
  createTask: (firstUserContent: string) => string
  appendTaskMessage: (taskId: string, role: Message["role"], content: string) => void
  appendTaskAssistantContent: (taskId: string, delta: string) => void
  setTaskTitle: (taskId: string, title: string) => void
  addTaskDescription: (taskId: string, description: string) => void
  removeTaskDescription: (taskId: string) => void
  expandTask: (taskId: string) => void
  collapseTask: () => void
  closeTask: (taskId: string) => void
  removeTask: (taskId: string) => void
}

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const [state, setState] = createStore<JarvisState>({
  messages: [],
  status: "idle",
  inputText: "",
  recalledMemories: [],
  isRecallingMemories: false,
  isListening: false,
  taskSessions: [],
  taskDescriptions: [],
  expandedTaskId: null,
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

  setRecalledMemories(memories) {
    setState("recalledMemories", memories)
  },

  setIsRecallingMemories(value) {
    setState("isRecallingMemories", value)
  },

  setIsListening(value) {
    setState("isListening", value)
  },

  createTask(firstUserContent) {
    const taskId = generateTaskId()
    const now = Date.now()
    setState(
      produce((draft) => {
        draft.taskSessions.push({
          id: taskId,
          title: firstUserContent.slice(0, 10),
          messages: [
            {
              id: generateMessageId(),
              role: "user",
              content: firstUserContent,
              createdAt: now,
            },
          ],
          status: "active",
          expanded: false,
          createdAt: now,
          updatedAt: now,
        })
      }),
    )
    return taskId
  },

  appendTaskMessage(taskId, role, content) {
    setState(
      produce((draft) => {
        const task = draft.taskSessions.find((t) => t.id === taskId)
        if (!task) return
        task.messages.push({
          id: generateMessageId(),
          role,
          content,
          createdAt: Date.now(),
        })
        task.updatedAt = Date.now()
      }),
    )
  },

  appendTaskAssistantContent(taskId, delta) {
    setState(
      produce((draft) => {
        const task = draft.taskSessions.find((t) => t.id === taskId)
        if (!task) return
        const lastMessage = task.messages[task.messages.length - 1]
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content += delta
        } else {
          task.messages.push({
            id: generateMessageId(),
            role: "assistant",
            content: delta,
            createdAt: Date.now(),
          })
        }
        task.updatedAt = Date.now()
      }),
    )
  },

  setTaskTitle(taskId, title) {
    setState(
      produce((draft) => {
        const task = draft.taskSessions.find((t) => t.id === taskId)
        if (!task) return
        task.title = title.slice(0, 10)
        task.updatedAt = Date.now()
      }),
    )
  },

  addTaskDescription(taskId, description) {
    setState(
      produce((draft) => {
        draft.taskDescriptions = draft.taskDescriptions.filter((d) => d.taskId !== taskId)
        draft.taskDescriptions.push({
          taskId,
          description: description.trim(),
          createdAt: Date.now(),
        })
      }),
    )
  },

  removeTaskDescription(taskId) {
    setState(
      produce((draft) => {
        draft.taskDescriptions = draft.taskDescriptions.filter((d) => d.taskId !== taskId)
      }),
    )
  },

  expandTask(taskId) {
    setState(
      produce((draft) => {
        for (const task of draft.taskSessions) {
          task.expanded = task.id === taskId
        }
        draft.expandedTaskId = taskId
      }),
    )
  },

  collapseTask() {
    setState(
      produce((draft) => {
        for (const task of draft.taskSessions) {
          task.expanded = false
        }
        draft.expandedTaskId = null
      }),
    )
  },

  closeTask(taskId) {
    setState(
      produce((draft) => {
        const task = draft.taskSessions.find((t) => t.id === taskId)
        if (!task) return
        task.status = "closing"
        task.expanded = false
        if (draft.expandedTaskId === taskId) {
          draft.expandedTaskId = null
        }
      }),
    )
  },

  removeTask(taskId) {
    setState(
      produce((draft) => {
        draft.taskSessions = draft.taskSessions.filter((t) => t.id !== taskId)
        draft.taskDescriptions = draft.taskDescriptions.filter((d) => d.taskId !== taskId)
        if (draft.expandedTaskId === taskId) {
          draft.expandedTaskId = null
        }
      }),
    )
  },
}
