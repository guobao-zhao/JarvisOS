import { createSignal, Show } from "solid-js"
import { jarvisActions, jarvisStore } from "./Store"
import { streamChat } from "./LLM"
import { voiceAPI } from "./Voice"

export function InputBar() {
  const [isListening, setIsListening] = createSignal(false)

  const canSend = () => jarvisStore.inputText.trim().length > 0 && jarvisStore.status !== "thinking"
  const isBusy = () => jarvisStore.status === "thinking"

  async function handleSend() {
    if (isListening()) {
      voiceAPI.stopRecognition()
      setIsListening(false)
      jarvisActions.setStatus("idle")
    }

    const text = jarvisStore.inputText.trim()
    if (!text || isBusy()) return

    jarvisActions.addMessage("user", text)
    jarvisActions.resetInput()
    await runAssistantTurn()
  }

  async function runAssistantTurn() {
    const messages = jarvisStore.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    jarvisActions.setStatus("thinking")

    let fullResponse = ""
    await streamChat(
      messages,
      (delta) => {
        jarvisActions.appendAssistantContent(delta)
      },
      (error) => {
        jarvisActions.appendAssistantContent(`\n\n[错误] ${error.message}`)
      },
    )

    const lastMessage = jarvisStore.messages[jarvisStore.messages.length - 1]
    fullResponse = lastMessage?.role === "assistant" ? lastMessage.content : ""

    jarvisActions.setStatus("speaking")
    voiceAPI.speak(fullResponse)

    // Keep speaking status until synthesis finishes (best-effort)
    const checkDone = () => {
      if (!window.speechSynthesis.speaking) {
        jarvisActions.setStatus("idle")
      } else {
        setTimeout(checkDone, 250)
      }
    }
    setTimeout(checkDone, 250)
  }

  function toggleVoice() {
    if (!voiceAPI.isRecognitionAvailable) return

    if (isListening()) {
      voiceAPI.stopRecognition()
      setIsListening(false)
      jarvisActions.setStatus("idle")
      return
    }

    jarvisActions.setStatus("listening")
    setIsListening(true)
    voiceAPI.startRecognition((text, isFinal) => {
      jarvisActions.setInputText(text)
      if (isFinal) {
        voiceAPI.stopRecognition()
        setIsListening(false)
        void handleSend()
      }
    })
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div class="flex items-end gap-3 px-6 py-4 border-t border-border-subtle bg-background-base">
      <Show when={voiceAPI.isRecognitionAvailable}>
        <button
          type="button"
          onClick={toggleVoice}
          disabled={isBusy()}
          class={`p-3 rounded-xl transition-colors ${
            isListening()
              ? "bg-status-listening text-white animate-pulse"
              : "bg-surface-elevated text-text-secondary hover:bg-surface-hover"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label={isListening() ? "停止聆听" : "语音输入"}
        >
          {isListening() ? "🎙️" : "🎤"}
        </button>
      </Show>

      <textarea
        value={jarvisStore.inputText}
        onInput={(e) => jarvisActions.setInputText(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={isBusy() ? "Jarvis 正在思考..." : "输入消息..."}
        disabled={isBusy()}
        rows={1}
        class="flex-1 resize-none max-h-32 bg-surface-elevated text-text-primary placeholder:text-text-tertiary rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-60"
      />

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={!canSend()}
        class="px-5 py-3 rounded-xl bg-accent-primary text-white font-medium hover:bg-accent-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        发送
      </button>
    </div>
  )
}
