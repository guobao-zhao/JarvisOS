#!/usr/bin/env python3
"""JarvisOS TTS wrapper around F5-TTS.

Provides:
- /                 health check / info
- /speak            GET/POST: text + optional speaker -> audio/wav
- /health           simple status

Reuses the Jarvis speaker reference prepared for CosyVoice:
/Users/Zhuanz/JarvisOS/tools/cosyvoice/speakers/{speaker}/prompt.wav
/Users/Zhuanz/JarvisOS/tools/cosyvoice/speakers/{speaker}/prompt.txt
"""
import io
import json
import os
import re
import sys
import logging
from pathlib import Path

import numpy as np
import torch
import scipy.io.wavfile as wavfile
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

ROOT = Path(__file__).resolve().parent
SPEAKERS_DIR = Path("/Users/Zhuanz/JarvisOS/tools/cosyvoice/speakers")
MODEL_PATH = ROOT / "pretrained_models" / "F5TTS_Base" / "model_1200000.pt"
VOCAB_PATH = ROOT / "pretrained_models" / "F5TTS_Base" / "vocab.txt"
VOCODER_PATH = ROOT / "pretrained_models" / "vocos"
PORT = int(os.environ.get("JARVIS_F5TTS_PORT", "50001"))
DEFAULT_SPEAKER = os.environ.get("JARVIS_TTS_DEFAULT_SPEAKER", "jarvis")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="JarvisOS F5-TTS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------
logger.info("Loading F5-TTS model from %s ...", MODEL_PATH)
if not MODEL_PATH.exists():
    raise RuntimeError(f"Model not found: {MODEL_PATH}")
if not VOCAB_PATH.exists():
    raise RuntimeError(f"Vocab not found: {VOCAB_PATH}")

# Import after env is ready
sys.path.insert(0, str(ROOT))
from f5_tts.infer.utils_infer import load_model, infer_process, load_vocoder
from f5_tts.model import DiT

device = "cuda" if torch.cuda.is_available() else "cpu"
model_cfg = dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4)
model = load_model(DiT, model_cfg, str(MODEL_PATH), device=device)
logger.info("F5-TTS model loaded on %s", device)

vocoder = load_vocoder("vocos", is_local=True, local_path=str(VOCODER_PATH), device=device)
logger.info("F5-TTS vocoder loaded from %s", VOCODER_PATH)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def speaker_prompt_wav(name: str) -> Path:
    return SPEAKERS_DIR / name / "prompt.wav"


def speaker_prompt_text(name: str) -> Path:
    return SPEAKERS_DIR / name / "prompt.txt"


def split_sentences(text: str):
    """Split text into sentence chunks by punctuation."""
    # Keep punctuation with the preceding sentence
    chunks = re.split(r"(?<=[。！？.!?])\s+", text.strip())
    return [c.strip() for c in chunks if c.strip()]


def wav_bytes_from_audio(audio, sample_rate: int) -> bytes:
    """Convert generated audio to WAV bytes. scipy expects (samples, channels)."""
    if isinstance(audio, torch.Tensor):
        audio = audio.cpu().numpy()
    if audio.ndim == 1:
        audio = audio[:, np.newaxis]
    elif audio.ndim == 2 and audio.shape[0] < audio.shape[1]:
        # input is (channels, samples); transpose to (samples, channels)
        audio = audio.T

    audio = np.clip(audio, -1.0, 1.0)
    audio_int16 = (audio * 32767).astype(np.int16)
    buf = io.BytesIO()
    wavfile.write(buf, sample_rate, audio_int16)
    buf.seek(0)
    return buf.read()


def synthesize(text: str, speaker: str, nfe_step: int = 16) -> bytes:
    wav_path = speaker_prompt_wav(speaker)
    txt_path = speaker_prompt_text(speaker)
    if not wav_path.exists() or not txt_path.exists():
        raise HTTPException(status_code=404, detail=f"Speaker '{speaker}' not found.")

    ref_text = txt_path.read_text(encoding="utf-8").strip()
    logger.info("F5-TTS synthesizing speaker='%s' text='%s' nfe_step=%d", speaker, text, nfe_step)

    audio, sample_rate, _ = infer_process(
        ref_audio=str(wav_path),
        ref_text=ref_text,
        gen_text=text,
        model_obj=model,
        vocoder=vocoder,
        mel_spec_type="vocos",
        cfg_strength=2.0,
        nfe_step=nfe_step,
        target_rms=0.1,
        device=device,
    )

    return wav_bytes_from_audio(audio, sample_rate)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {
        "ok": True,
        "model": str(MODEL_PATH),
        "device": device,
        "default_speaker": DEFAULT_SPEAKER,
    }


@app.get("/speakers")
def list_speakers():
    result = []
    if SPEAKERS_DIR.exists():
        for d in SPEAKERS_DIR.iterdir():
            if d.is_dir() and (d / "prompt.wav").exists():
                result.append({"speaker": d.name, "has_prompt": True})
    return {"speakers": result}


@app.get("/speak")
@app.post("/speak")
def speak(text: str, speaker: str = DEFAULT_SPEAKER, nfe_step: int = 16):
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    if nfe_step < 1 or nfe_step > 64:
        nfe_step = 16
    audio_bytes = synthesize(text.strip(), speaker, nfe_step=nfe_step)
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/wav")


@app.websocket("/ws")
async def websocket_speak(websocket: WebSocket):
    """Stream TTS by sentence: client sends JSON, server sends WAV bytes per sentence."""
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            text = msg.get("text", "").strip()
            speaker = msg.get("speaker", DEFAULT_SPEAKER)
            nfe_step = int(msg.get("nfe_step", 8))
            if not text:
                await websocket.send_text(json.dumps({"error": "text is required"}))
                continue

            wav_path = speaker_prompt_wav(speaker)
            txt_path = speaker_prompt_text(speaker)
            if not wav_path.exists() or not txt_path.exists():
                await websocket.send_text(json.dumps({"error": f"Speaker '{speaker}' not found"}))
                continue

            ref_text = txt_path.read_text(encoding="utf-8").strip()
            sentences = split_sentences(text)
            logger.info("F5-TTS streaming %d sentences for speaker='%s'", len(sentences), speaker)
            await websocket.send_text(json.dumps({"total": len(sentences)}))

            for idx, sentence in enumerate(sentences):
                if not sentence:
                    continue
                logger.info("F5-TTS streaming sentence %d/%d: %s", idx + 1, len(sentences), sentence)
                try:
                    audio, sample_rate, _ = infer_process(
                        ref_audio=str(wav_path),
                        ref_text=ref_text,
                        gen_text=sentence,
                        model_obj=model,
                        vocoder=vocoder,
                        mel_spec_type="vocos",
                        cfg_strength=2.0,
                        nfe_step=nfe_step,
                        target_rms=0.1,
                        device=device,
                    )
                    wav_bytes = wav_bytes_from_audio(audio, sample_rate)
                    # send metadata first, then binary
                    await websocket.send_text(json.dumps({"idx": idx, "len": len(wav_bytes)}))
                    await websocket.send_bytes(wav_bytes)
                except Exception as exc:
                    logger.exception("F5-TTS streaming sentence failed")
                    await websocket.send_text(json.dumps({"idx": idx, "error": str(exc)}))

            await websocket.send_text(json.dumps({"done": True}))
    except WebSocketDisconnect:
        logger.info("F5-TTS websocket disconnected")
    except Exception as exc:
        logger.exception("F5-TTS websocket error")
        try:
            await websocket.send_text(json.dumps({"error": str(exc)}))
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT)
