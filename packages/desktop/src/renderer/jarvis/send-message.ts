import { jarvisActions, jarvisStore } from "./Store"
import { streamChat } from "./LLM"
import { voiceAPI } from "./Voice"
import { searchMemories, writeMemory } from "./Memory"
import { extractMemoryDocuments } from "./extract-memory"
import { generateTaskDescription } from "./task-description"
import { generateTaskTitle } from "./task-title"

async function runAssistantTurn(taskId: string) {
  const memoryContext = jarvisStore.recalledMemories
    .map((h) => `【记忆】${h.title}\n${h.content}`)
    .join("\n\n")

  const identityPrompt =
    "你是 Jarvis，宝哥的私人智能管家。你常驻在 JarvisOS 桌面应用中，通过语音和文字与宝哥交互。"

  const systemContent = memoryContext
    ? `${identityPrompt}\n\n以下是与当前问题相关的历史记忆：\n\n${memoryContext}`
    : identityPrompt

  const messages = [
    { role: "system" as const, content: systemContent },
    ...jarvisStore.messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  jarvisActions.setStatus("thinking")
  jarvisActions.appendTaskMessage(taskId, "assistant", "")

  let fullResponse = ""
  await streamChat(
    messages,
    (delta) => {
      jarvisActions.appendAssistantContent(delta)
      jarvisActions.appendTaskAssistantContent(taskId, delta)
      fullResponse += delta
    },
    (error) => {
      jarvisActions.appendAssistantContent(`\n\n[错误] ${error.message}`)
      jarvisActions.appendTaskAssistantContent(taskId, `\n\n[错误] ${error.message}`)
      fullResponse += `\n\n[错误] ${error.message}`
    },
    { taskId },
  )

  void (async () => {
    try {
      const task = jarvisStore.taskSessions.find((t) => t.id === taskId)
      if (task) {
        const title = await generateTaskTitle(task.messages[0].content, fullResponse)
        jarvisActions.setTaskTitle(taskId, title)
      }
    } catch (err) {
      console.warn("Task title generation failed:", err)
    }
  })()

  jarvisActions.setStatus("speaking")
  voiceAPI.speak(fullResponse)

  void (async () => {
    try {
      const docs = extractMemoryDocuments(jarvisStore.messages)
      for (const doc of docs) {
        await writeMemory(doc)
      }
    } catch (err) {
      console.warn("Memory write failed:", err)
    }
  })()

  const checkDone = () => {
    if (!window.speechSynthesis.speaking) {
      jarvisActions.setStatus("idle")
    } else {
      setTimeout(checkDone, 250)
    }
  }
  setTimeout(checkDone, 250)
}

export async function sendUserMessage(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return

  jarvisActions.setIsListening(false)
  voiceAPI.stopRecognition()
  jarvisActions.addMessage("user", trimmed)
  const taskId = jarvisActions.createTask(trimmed)
  jarvisActions.resetInput()

  void (async () => {
    try {
      const description = await generateTaskDescription(trimmed)
      jarvisActions.addTaskDescription(taskId, description)
    } catch (err) {
      console.warn("Task description generation failed:", err)
      jarvisActions.addTaskDescription(taskId, trimmed.slice(0, 60))
    }
  })()

  jarvisActions.setIsRecallingMemories(true)
  try {
    const hits = await searchMemories(trimmed, { topK: 3, includeContent: true })
    jarvisActions.setRecalledMemories(hits)
  } catch {
    jarvisActions.setRecalledMemories([])
  } finally {
    jarvisActions.setIsRecallingMemories(false)
  }

  await runAssistantTurn(taskId)
}
