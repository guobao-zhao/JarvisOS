import { jarvisActions, jarvisStore } from "./Store"
import { processUserInput } from "./consciousness"
import { voiceAPI } from "./Voice"

export function VoiceOrb() {
  const isBusy = () => jarvisStore.status === "thinking"
  const isListening = () => jarvisStore.isListening
  const modeClass = () => {
    if (isListening()) return "voice-orb--listening"
    if (jarvisStore.status === "thinking") return "voice-orb--thinking"
    if (jarvisStore.status === "speaking") return "voice-orb--speaking"
    return "voice-orb--idle"
  }

  function toggleVoice() {
    if (isBusy()) return

    if (isListening()) {
      voiceAPI.stopRecognition()
      jarvisActions.setIsListening(false)
      jarvisActions.setStatus("idle")
      return
    }

    jarvisActions.setStatus("listening")
    jarvisActions.setIsListening(true)
    voiceAPI.startRecognition((text, isFinal) => {
      jarvisActions.setInputText(text)
      if (isFinal) {
        voiceAPI.stopRecognition()
        jarvisActions.setIsListening(false)
        void processUserInput(text)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggleVoice}
      disabled={isBusy() || !voiceAPI.isRecognitionAvailable}
      class={`voice-orb pointer-events-auto z-10 flex h-16 w-16 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-40 ${modeClass()}`}
      aria-label={isListening() ? "停止聆听" : "语音输入"}
    >
      <div class="voice-orb__aura" />
      <div class="voice-orb__core" />
    </button>
  )
}
