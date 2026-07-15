export interface VoiceAPI {
  startRecognition(onResult: (text: string, isFinal: boolean) => void): void
  stopRecognition(): void
  speak(text: string): void
  stopSpeaking(): void
  isRecognitionAvailable: boolean
  isSynthesisAvailable: boolean
}

const F5TTS_HTTP = "http://127.0.0.1:50001"
const F5TTS_WS = "ws://127.0.0.1:50001/ws"
const COSYVOICE_ENDPOINT = "http://127.0.0.1:50000"
let f5TtsEnabled = true
let cosyVoiceEnabled = true
let currentAudioContext: AudioContext | null = null
let currentAudioSource: AudioBufferSourceNode | null = null
let audioQueue: AudioBuffer[] = []
let isPlayingQueue = false

async function playWavBlob(blob: Blob) {
  voiceAPI.stopSpeaking()

  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new AudioContext()
  currentAudioContext = ctx

  const buffer = await ctx.decodeAudioData(arrayBuffer)
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.onended = () => {
    currentAudioSource = null
  }
  currentAudioSource = source
  source.start()
}

function playNextInQueue(ctx: AudioContext) {
  if (isPlayingQueue || audioQueue.length === 0) return
  isPlayingQueue = true
  const buffer = audioQueue.shift()
  if (!buffer) {
    isPlayingQueue = false
    return
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.onended = () => {
    isPlayingQueue = false
    playNextInQueue(ctx)
  }
  currentAudioSource = source
  source.start()
}

function enqueueWavBlob(blob: Blob) {
  const ctx = currentAudioContext ?? new AudioContext()
  currentAudioContext = ctx
  void blob.arrayBuffer().then((ab) =>
    ctx.decodeAudioData(ab, (buffer) => {
      audioQueue.push(buffer)
      playNextInQueue(ctx)
    }),
  )
}

async function speakWithF5TTS(text: string) {
  try {
    await speakWithF5TTSStream(text)
  } catch (err) {
    console.warn("F5-TTS streaming failed, falling back to HTTP:", err)
    try {
      const response = await fetch(
        `${F5TTS_HTTP}/speak?text=${encodeURIComponent(text)}&nfe_step=8`,
        { method: "GET" },
      )
      if (!response.ok) {
        throw new Error(`F5-TTS HTTP failed: ${response.status}`)
      }
      const blob = await response.blob()
      await playWavBlob(blob)
    } catch (err2) {
      console.warn("F5-TTS unavailable, falling back to CosyVoice:", err2)
      speakWithCosyVoice(text)
    }
  }
}

function speakWithF5TTSStream(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    voiceAPI.stopSpeaking()
    audioQueue = []
    isPlayingQueue = false

    const ws = new WebSocket(F5TTS_WS)
    let totalSentences = 0
    let receivedSentences = 0
    let binaryBuffer: Uint8Array | null = null
    let binaryOffset = 0
    let binaryTargetLen = 0
    let hasError = false

    const timeout = setTimeout(() => {
      hasError = true
      try { ws.close() } catch { /* ignore */ }
      reject(new Error("F5-TTS websocket timeout"))
    }, 120000)

    ws.onopen = () => {
      ws.send(JSON.stringify({ text, speaker: "jarvis", nfe_step: 8 }))
    }

    ws.onmessage = (event) => {
      if (hasError) return

      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data)
        if (msg.error) {
          hasError = true
          clearTimeout(timeout)
          ws.close()
          reject(new Error(msg.error))
          return
        }
        if (msg.total !== undefined) {
          totalSentences = msg.total
        }
        if (msg.idx !== undefined && msg.len !== undefined) {
          binaryTargetLen = msg.len
          binaryBuffer = new Uint8Array(msg.len)
          binaryOffset = 0
        }
        if (msg.done) {
          clearTimeout(timeout)
          ws.close()
          resolve()
        }
      } else if (event.data instanceof Blob) {
        void event.data.arrayBuffer().then((ab) => {
          const chunk = new Uint8Array(ab)
          if (binaryBuffer) {
            binaryBuffer.set(chunk, binaryOffset)
            binaryOffset += chunk.length
            if (binaryOffset >= binaryTargetLen) {
              receivedSentences += 1
              const wavBuffer = binaryBuffer.buffer.slice(
                binaryBuffer.byteOffset,
                binaryBuffer.byteOffset + binaryBuffer.byteLength,
              ) as ArrayBuffer
              enqueueWavBlob(new Blob([wavBuffer]))
              binaryBuffer = null
            }
          }
        })
      }
    }

    ws.onerror = (err) => {
      hasError = true
      clearTimeout(timeout)
      reject(new Error("F5-TTS websocket error"))
    }

    ws.onclose = () => {
      clearTimeout(timeout)
      if (!hasError && receivedSentences < totalSentences) {
        // closed prematurely
        reject(new Error("F5-TTS websocket closed prematurely"))
      } else if (!hasError) {
        resolve()
      }
    }
  })
}

async function speakWithCosyVoice(text: string) {
  try {
    const response = await fetch(
      `${COSYVOICE_ENDPOINT}/speak?text=${encodeURIComponent(text)}`,
      { method: "GET" },
    )
    if (!response.ok) {
      throw new Error(`CosyVoice TTS failed: ${response.status}`)
    }
    const blob = await response.blob()
    await playWavBlob(blob)
  } catch (err) {
    console.warn("CosyVoice TTS unavailable, falling back to system TTS:", err)
    speakWithSystemTTS(text)
  }
}

function speakWithSystemTTS(text: string) {
  if (!isSynthesisAvailable()) return
  voiceAPI.stopSpeaking()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "zh-CN"
  utterance.rate = 0.92
  utterance.pitch = 0.9
  window.speechSynthesis.speak(utterance)
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
    if (!text.trim()) return
    this.stopSpeaking()

    if (f5TtsEnabled) {
      void speakWithF5TTS(text.trim())
      return
    }

    if (cosyVoiceEnabled) {
      void speakWithCosyVoice(text.trim())
      return
    }

    speakWithSystemTTS(text.trim())
  },

  stopSpeaking() {
    if (this.isSynthesisAvailable) {
      window.speechSynthesis.cancel()
    }
    if (currentAudioSource) {
      try {
        currentAudioSource.stop()
      } catch {
        // ignore
      }
      currentAudioSource = null
    }
    if (currentAudioContext) {
      try {
        void currentAudioContext.close()
      } catch {
        // ignore
      }
      currentAudioContext = null
    }
  },
}
