import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import type { JarvisModelDecision, JarvisModelRole } from "../../preload/types"
import { jarvisActions, jarvisStore, type Message } from "./Store"
import { streamChat } from "./LLM"
import { searchMemories, writeMemory } from "./Memory"
import { extractMemoryDocuments } from "./extract-memory"
import { voiceAPI } from "./Voice"
import { taskPanelSourceRect } from "./task-animation"

const PANEL_WIDTH = 520
const PANEL_HEIGHT = 640

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

const roleLabels: Record<JarvisModelRole, string> = {
  daily: "日常",
  designer: "GPT 设计",
  worker: "Kimi 执行",
  reviewer: "校验",
  fallback: "兜底",
}

export function TaskPanel() {
  const [inputText, setInputText] = createSignal("")
  const [isSending, setIsSending] = createSignal(false)
  const [modelDecisions, setModelDecisions] = createSignal<JarvisModelDecision[]>([])
  const [modelOverride, setModelOverride] = createSignal<JarvisModelRole | null>(null)
  const [overrideSaving, setOverrideSaving] = createSignal(false)
  const [panelStyle, setPanelStyle] = createSignal<Record<string, string>>({
    opacity: "0",
    transform: "scale(0.85)",
  })
  let panelRef: HTMLDivElement | undefined
  let isResizing = false
  let resizeStart = { x: 0, y: 0, width: PANEL_WIDTH, height: PANEL_HEIGHT }

  const task = createMemo(() => {
    const id = jarvisStore.expandedTaskId
    if (!id) return null
    return jarvisStore.taskSessions.find((t) => t.id === id) ?? null
  })

  const sourceRect = createMemo(() => taskPanelSourceRect())

  createEffect(() => {
    const id = task()?.id
    if (!id) {
      setModelDecisions([])
      return
    }
    void window.api.jarvisModelDecisionHistory(id).then((items) => {
      setModelDecisions(items.slice(-8))
    }).catch((reason) => {
      console.warn("Model decision history failed:", reason)
    })
  })

  onMount(() => {
    const unsubscribeDecision = window.api.jarvisModelDecisionSubscribe((decision) => {
      const id = task()?.id
      if (!id || decision.taskId !== id) return
      setModelDecisions((current) => [...current.filter((item) => item.id !== decision.id), decision].slice(-8))
    })

    const rect = sourceRect()
    if (rect && panelRef) {
      setPanelStyle({
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        opacity: "0.85",
        transform: "none",
        transition: "none",
        "border-radius": "22px",
      })

      void panelRef.offsetHeight

      requestAnimationFrame(() => {
        setPanelStyle({
          position: "fixed",
          left: "50%",
          top: "50%",
          width: `${PANEL_WIDTH}px`,
          height: `${PANEL_HEIGHT}px`,
          opacity: "1",
          transform: "translate(-50%, -50%) scale(1)",
          transition: "all 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
          "border-radius": "22px",
        })
      })
    } else {
      setPanelStyle({
        position: "fixed",
        left: "50%",
        top: "50%",
        width: `${PANEL_WIDTH}px`,
        height: `${PANEL_HEIGHT}px`,
        opacity: "1",
        transform: "translate(-50%, -50%) scale(1)",
        transition: "all 0.55s ease-out",
        "border-radius": "22px",
      })
    }

    onCleanup(() => {
      unsubscribeDecision()
    })
  })

  function startResize(e: PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    isResizing = true
    const style = panelStyle()
    resizeStart = {
      x: e.clientX,
      y: e.clientY,
      width: parseInt(style.width || `${PANEL_WIDTH}`, 10),
      height: parseInt(style.height || `${PANEL_HEIGHT}`, 10),
    }
    window.addEventListener("pointermove", onResizeMove)
    window.addEventListener("pointerup", stopResize)
  }

  function onResizeMove(e: PointerEvent) {
    if (!isResizing) return
    const dx = e.clientX - resizeStart.x
    const dy = e.clientY - resizeStart.y
    const newWidth = Math.max(360, resizeStart.width + dx)
    const newHeight = Math.max(320, resizeStart.height + dy)
    setPanelStyle((prev) => ({
      ...prev,
      width: `${newWidth}px`,
      height: `${newHeight}px`,
      transition: "none",
    }))
  }

  function stopResize() {
    isResizing = false
    window.removeEventListener("pointermove", onResizeMove)
    window.removeEventListener("pointerup", stopResize)
  }

  let pointerStartedOnBackdrop = false

  function onBackdropPointerDown(e: PointerEvent) {
    pointerStartedOnBackdrop = e.target === e.currentTarget
  }

  function onBackdropClick() {
    if (pointerStartedOnBackdrop) {
      collapse()
    }
    pointerStartedOnBackdrop = false
  }

  function collapse() {
    jarvisActions.collapseTask()
  }

  function close() {
    const id = jarvisStore.expandedTaskId
    if (id) {
      jarvisActions.closeTask(id)
    }
  }

  async function handleSend() {
    const t = task()
    const text = inputText().trim()
    if (!t || !text || isSending()) return

    setIsSending(true)

    jarvisActions.appendTaskMessage(t.id, "user", text)
    jarvisActions.addMessage("user", text)
    setInputText("")

    jarvisActions.setIsRecallingMemories(true)
    try {
      const hits = await searchMemories(text, { topK: 3, includeContent: true })
      jarvisActions.setRecalledMemories(hits)
    } catch {
      jarvisActions.setRecalledMemories([])
    } finally {
      jarvisActions.setIsRecallingMemories(false)
    }

    await runTaskAssistantTurn(t.id)
    setIsSending(false)
  }

  async function runTaskAssistantTurn(taskId: string) {
    const t = jarvisStore.taskSessions.find((s) => s.id === taskId)
    if (!t) return

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
      ...t.messages.map((m) => ({ role: m.role, content: m.content })),
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

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  async function overrideModel(role: JarvisModelRole | null) {
    const t = task()
    if (!t || overrideSaving()) return
    setOverrideSaving(true)
    try {
      await window.api.jarvisModelOverrideTask(t.id, role)
      setModelOverride(role)
    } catch (reason) {
      console.warn("Model override failed:", reason)
    } finally {
      setOverrideSaving(false)
    }
  }

  return (
    <Show when={task()}>
      {(t) => (
        <>
          <div
            class="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]"
            onPointerDown={onBackdropPointerDown}
            onClick={onBackdropClick}
          />

          <div
            ref={panelRef}
            class="task-panel z-[70] flex flex-col overflow-hidden shadow-[0_0_80px_rgba(0,219,231,0.18)]"
            style={panelStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient border glow — same as capsule */}
            <div class="absolute inset-0 rounded-[22px] bg-gradient-to-br from-cyan-300/40 via-cyan-500/20 to-transparent opacity-80 blur-[1px]" />
            <div class="absolute inset-0 rounded-[22px] bg-gradient-to-tr from-cyan-400/30 via-white/5 to-cyan-300/20" />

            {/* Inner panel */}
            <div class="relative z-10 flex h-full w-full flex-col overflow-hidden rounded-[21px] bg-[#070c0e]/80 backdrop-blur-md">
              {/* Top accent line */}
              <div class="absolute left-5 right-5 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

              {/* Header */}
              <div class="flex items-center justify-between px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                  <div class="text-[12px] font-bold uppercase tracking-[0.15em] text-cyan-200 text-shadow-cyan">
                    {t().title || "任务会话"}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={collapse}
                    class="rounded-lg px-2 py-1 text-[11px] text-cyan-200/60 transition-colors hover:bg-cyan-400/10 hover:text-cyan-100"
                  >
                    收起
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    class="flex h-7 w-7 items-center justify-center rounded-full text-cyan-200/60 transition-colors hover:bg-red-500/20 hover:text-red-200"
                    aria-label="结束任务"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <For each={t().messages}>
                  {(message) => <TaskMessageBubble message={message} />}
                </For>
              </div>

              <div class="border-t border-cyan-300/10 px-5 py-3">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div class="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/55">Model Timeline</div>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="rounded border border-violet-300/25 px-2 py-1 text-[10px] text-violet-100 transition hover:border-violet-200/60 disabled:opacity-50"
                      disabled={overrideSaving()}
                      onClick={() => void overrideModel("designer")}
                    >
                      Pin GPT
                    </button>
                    <button
                      type="button"
                      class="rounded border border-cyan-300/25 px-2 py-1 text-[10px] text-cyan-100 transition hover:border-cyan-200/60 disabled:opacity-50"
                      disabled={overrideSaving()}
                      onClick={() => void overrideModel("worker")}
                    >
                      Pin Kimi
                    </button>
                    <button
                      type="button"
                      class="rounded border border-white/10 px-2 py-1 text-[10px] text-white/60 transition hover:border-white/25 disabled:opacity-50"
                      disabled={overrideSaving()}
                      onClick={() => void overrideModel(null)}
                    >
                      Auto
                    </button>
                  </div>
                </div>
                <Show
                  when={modelDecisions().length > 0}
                  fallback={<div class="text-[10px] text-cyan-200/35">等待下一次模型决策</div>}
                >
                  <div class="space-y-2">
                    <For each={modelDecisions()}>
                      {(decision) => (
                        <div class="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                          <div class="flex items-center justify-between gap-3">
                            <div class="text-[11px] font-semibold text-cyan-50">
                              {decision.phase} · {roleLabels[decision.selectedRole]}
                            </div>
                            <div class="text-[10px] text-cyan-200/40">{formatTime(decision.createdAt)}</div>
                          </div>
                          <div class="mt-1 truncate text-[10px] text-white/50">
                            {decision.selectedModelId} · {Math.round(decision.confidence * 100)}% · {decision.reason}
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
                <Show when={modelOverride()}>
                  {(role) => <div class="mt-2 text-[10px] text-amber-100/70">当前任务已固定：{roleLabels[role()]}</div>}
                </Show>
              </div>

              {/* Input */}
              <div class="p-4">
                <div class="flex items-end gap-2 rounded-2xl bg-white/[0.04] p-2">
                  <textarea
                    value={inputText()}
                    onInput={(e) => setInputText(e.currentTarget.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isSending() ? "Jarvis 正在思考..." : "继续这个任务..."}
                    disabled={isSending()}
                    rows={1}
                    class="max-h-28 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white placeholder:text-cyan-200/40 outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!inputText().trim() || isSending()}
                    class="rounded-xl bg-cyan-500/90 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>

            {/* Resize handle */}
            <div
              class="absolute bottom-1 right-1 z-20 h-5 w-5 cursor-se-resize rounded-full bg-cyan-400/20 transition-colors hover:bg-cyan-400/40"
              onPointerDown={startResize}
              title="拖拽调整大小"
            >
              <svg
                class="h-full w-full text-cyan-300/60"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M10 14 L18 6 M14 18 L18 14 M6 18 L18 6" />
              </svg>
            </div>
          </div>
        </>
      )}
    </Show>
  )
}

function TaskMessageBubble(props: { message: Message }) {
  const isUser = () => props.message.role === "user"

  return (
    <div class={`flex w-full ${isUser() ? "justify-end" : "justify-start"}`}>
      <div class={`max-w-[85%] ${isUser() ? "items-end" : "items-start"} flex flex-col`}>
        <div
          class={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
            isUser() ? "bg-cyan-500/10 text-cyan-50" : "bg-white/[0.04] text-white/90"
          }`}
        >
          {props.message.content}
        </div>
        <span class="mt-1 text-[10px] text-cyan-200/40">{formatTime(props.message.createdAt)}</span>
      </div>
    </div>
  )
}
