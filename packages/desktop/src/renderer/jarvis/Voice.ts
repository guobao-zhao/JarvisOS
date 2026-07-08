export interface VoiceAPI {
  startRecognition(onResult: (text: string, isFinal: boolean) => void): void
  stopRecognition(): void
  speak(text: string): void
  stopSpeaking(): void
  isRecognitionAvailable: boolean
  isSynthesisAvailable: boolean
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    isFinal: boolean
    [0]: {
      transcript: string
    }
  }[]
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

function getWindow(): WindowWithSpeechRecognition | null {
  return typeof window !== "undefined" ? window : null
}

function createRecognition(): SpeechRecognitionLike | null {
  const win = getWindow()
  if (!win) return null

  const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition
  if (!Recognition) return null

  const recognition = new Recognition()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = "zh-CN"
  return recognition
}

let currentRecognition: SpeechRecognitionLike | null = null

function isRecognitionAvailable(): boolean {
  const win = getWindow()
  return win !== null && (win.SpeechRecognition !== undefined || win.webkitSpeechRecognition !== undefined)
}

function isSynthesisAvailable(): boolean {
  const win = getWindow()
  return win !== null && "speechSynthesis" in win
}

export const voiceAPI: VoiceAPI = {
  isRecognitionAvailable: isRecognitionAvailable(),
  isSynthesisAvailable: isSynthesisAvailable(),

  startRecognition(onResult) {
    if (!this.isRecognitionAvailable) return

    this.stopRecognition()

    const recognition = createRecognition()
    if (!recognition) return

    recognition.onresult = (event) => {
      let finalText = ""
      let interimText = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }
      if (finalText) {
        onResult(finalText, true)
      } else if (interimText) {
        onResult(interimText, false)
      }
    }

    recognition.onerror = (_event) => {
      // Silently ignore non-fatal recognition errors
    }

    recognition.start()
    currentRecognition = recognition
  },

  stopRecognition() {
    if (currentRecognition) {
      try {
        currentRecognition.stop()
      } catch {
        // ignore
      }
      currentRecognition = null
    }
  },

  speak(text) {
    if (!this.isSynthesisAvailable || !text.trim()) return
    this.stopSpeaking()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = "zh-CN"
    utterance.rate = 1
    utterance.pitch = 1
    window.speechSynthesis.speak(utterance)
  },

  stopSpeaking() {
    if (this.isSynthesisAvailable) {
      window.speechSynthesis.cancel()
    }
  },
}
