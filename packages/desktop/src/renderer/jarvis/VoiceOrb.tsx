import { jarvisActions, jarvisStore } from "./Store"
import { processUserInput } from "./consciousness"
import { voiceAPI } from "./Voice"

export function VoiceOrb() {
  const isBusy = () => jarvisStore.status === "thinking"
  const isListening = () => jarvisStore.isListening

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
      class={`pointer-events-auto z-10 flex h-16 w-16 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        isListening()
          ? "voice-orb--listening scale-110 shadow-[0_0_50px_rgba(255,255,255,0.9)]"
          : "shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:shadow-[0_0_45px_rgba(255,255,255,0.7)] hover:scale-105"
      }`}
      aria-label={isListening() ? "停止聆听" : "语音输入"}
    >
      {/* White energy orb core */}
      <div
        class={`h-10 w-10 rounded-full bg-gradient-to-tr from-white via-cyan-50 to-cyan-200 ${
          isListening() ? "animate-pulse" : ""
        }`}
      />
    </button>
  )
}
