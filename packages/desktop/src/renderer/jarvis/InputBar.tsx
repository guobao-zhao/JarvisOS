import { jarvisActions, jarvisStore } from "./Store"
import { processUserInput } from "./consciousness"

export function InputBar() {
  const isBusy = () => jarvisStore.status === "thinking"

  async function handleSend() {
    const text = jarvisStore.inputText.trim()
    if (!text || isBusy()) return
    await processUserInput(text)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const placeholder = () => {
    if (jarvisStore.isListening) return "聆听中..."
    if (isBusy()) return "Jarvis 正在思考..."
    return "等待输入指令..."
  }

  return (
    <footer class="pointer-events-auto fixed bottom-6 left-1/2 z-40 w-full max-w-3xl -translate-x-1/2 px-6">
      <div class="relative flex items-center rounded-xl border border-[#00f2ff]/25 bg-white/[0.03] h-10 px-4 transition-colors focus-within:border-[#00f2ff]/60 focus-within:bg-white/[0.05]">
        <textarea
          value={jarvisStore.inputText}
          onInput={(e) => jarvisActions.setInputText(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder()}
          disabled={isBusy()}
          rows={1}
          class="h-full w-full resize-none bg-transparent py-2 text-sm text-[#00f2ff] placeholder:text-[#00f2ff]/30 outline-none disabled:opacity-60"
        />
      </div>
    </footer>
  )
}
