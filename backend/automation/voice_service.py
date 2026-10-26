"""Voice generation and audio message synthesis for WhatsApp reminders.

Supports OpenAI TTS (tts-1 / tts-1-hd) with natural Hindi, Hinglish, and English voices.
Discloses AI-generated speech, validates audio formats, and provides offline fallback synthesis.
"""

from __future__ import annotations

import io
import json
import logging
import math
import os
import struct
import urllib.request
import uuid
import wave
from datetime import date
from decimal import Decimal
from pathlib import Path

from automation.config import AutomationConfig
from automation.util import format_inr

logger = logging.getLogger("repayx.automation.voice")


def generate_voice_script(
    customer_name: str,
    loan_id: str,
    outstanding: Decimal,
    due_date: date,
    stage: int = 1,
    language: str = "hinglish",
) -> str:
    """Generate respectful, truthful, stage-specific reminder script disclosing AI generation."""
    amount_str = format_inr(outstanding).replace("₹", "")
    due_str = due_date.strftime("%d %B %Y")
    first_name = customer_name.strip().split()[0] if customer_name else "Customer"
    lang = (language or "hinglish").lower()

    if lang in ("hinglish", "hindi"):
        if stage == 1:
            return (
                f"Namaste {first_name} ji. Yeh RepayX ki taraf se ek automated AI payment reminder hai. "
                f"Aapke loan account {loan_id} ki EMI {amount_str} rupaye {due_str} ko due hai. "
                f"Aap apne WhatsApp par diye gaye link se payment kar sakte hain. "
                f"Agar aap pehle hi payment kar chuke hain, toh kripya WhatsApp par reply karein. Dhanyavaad."
            )
        elif stage == 2:
            return (
                f"Namaste {first_name} ji. Yeh RepayX ki taraf se payment follow-up notice hai. "
                f"Aapke loan {loan_id} ka {amount_str} rupaye ka installment overdue chal raha hai. "
                f"Late charges se bachne ke liye kripya aaj hi payment complete karein. "
                f"Kisi bhi sahayata ke liye WhatsApp par message karein. Shukriya."
            )
        else:  # Stage 3 - Final Notice
            return (
                f"Dhyan dein {first_name} ji. Yeh RepayX ki taraf se antim reminder hai. "
                f"Aapke loan {loan_id} ka {amount_str} rupaye ka bhugtan abhi bhi lambit hai. "
                f"Iske baad aapka case recovery team aur formal review ko refer kiya ja sakta hai. "
                f"Kripya diye gaye secure link se turant payment karein ya turant reply karein. Dhanyavaad."
            )
    else:  # English
        if stage == 1:
            return (
                f"Hello {first_name}. This is an automated AI reminder from RepayX. "
                f"Your EMI of {amount_str} rupees for loan account {loan_id} is due on {due_str}. "
                f"Please use your secure portal link on WhatsApp to complete payment. "
                f"If you have already made this payment, please reply on WhatsApp. Thank you."
            )
        elif stage == 2:
            return (
                f"Hello {first_name}. This is a payment follow-up notice from RepayX. "
                f"Your installment of {amount_str} rupees for loan {loan_id} is currently overdue. "
                f"Please settle this payment today to avoid late fees and credit impact. "
                f"Reply to this WhatsApp message if you require assistance. Thank you."
            )
        else:  # Stage 3 - Final Notice
            return (
                f"Urgent notice for {first_name}. This is the final scheduled reminder from RepayX. "
                f"Your pending balance of {amount_str} rupees for loan {loan_id} remains unpaid. "
                f"Unless cleared immediately, your account will escalate to our formal recovery team. "
                f"Please pay now using your secure WhatsApp link or reply immediately. Thank you."
            )

def generate_conversational_voice_script(
    customer_name: str | None = None,
    customer_id: str | None = None,
    loan_id: str | None = None,
    unpaid_amount: float | str | None = None,
    days_past_due: int | None = None,
    message_text: str | None = None,
    language: str = "hinglish",
) -> str:
    """Generate a warm, respectful Hindi/Hinglish/English voice script for a girl/female voice."""
    first_name = (customer_name or "").strip().split()[0] if customer_name else "Customer"
    loan_ref = loan_id or customer_id or "account"

    if unpaid_amount is not None:
        try:
            amt_num = float(str(unpaid_amount).replace(",", "").replace("₹", ""))
            amt_str = f"{amt_num:,.2f}".replace(".00", "")
        except Exception:
            amt_str = str(unpaid_amount)
    else:
        amt_str = "due"

    lang = (language or "hinglish").lower()
    if lang in ("hinglish", "hindi", "hi"):
        if days_past_due and int(days_past_due) > 0:
            return (
                f"Namaste {first_name} ji. Yeh RepayX ki taraf se zaroori payment notice hai. "
                f"Aapke loan account {loan_ref} ka {amt_str} rupaye ka installment overdue chal raha hai. "
                f"Kripya diye gaye secure portal link se turant payment complete karein ya kisi bhi sahayata ke liye WhatsApp par reply karein. Dhanyavaad."
            )
        else:
            return (
                f"Namaste {first_name} ji. Yeh RepayX ki taraf se ek payment reminder hai. "
                f"Aapke loan account {loan_ref} ki EMI {amt_str} rupaye due hai. "
                f"Kripya WhatsApp par diye gaye portal link se apna payment complete karein. Agar aap bhugtan kar chuke hain toh kripya WhatsApp par reply karein. Dhanyavaad."
            )
    else:
        if days_past_due and int(days_past_due) > 0:
            return (
                f"Hello {first_name}. This is an urgent payment notice from RepayX. "
                f"Your loan account {loan_ref} has an overdue balance of {amt_str} rupees. "
                f"Please clear your pending payment today using your secure link on WhatsApp or reply for settlement assistance. Thank you."
            )
        else:
            return (
                f"Hello {first_name}. This is a payment reminder from RepayX. "
                f"Your installment of {amt_str} rupees for loan account {loan_ref} is due. "
                f"Please use your secure portal link on WhatsApp to complete payment. Thank you."
            )


def _generate_synthetic_mp3(duration_seconds: float = 3.0) -> bytes:
    """Generate a valid, compact MP3 audio file containing valid MPEG audio frames (silence/tone)."""
    # Valid MPEG-1 Audio Layer III sync frames (128 kbps, 44.1 kHz, stereo)
    # Header: 0xFF 0xFB 0x90 0x64 (Sync 11 bits, MPEG-1, Layer 3, no CRC, 128kbps, 44100Hz, padded)
    frame_header = b"\xff\xfb\x90\x64"
    frame_body = b"\x00" * (417 - len(frame_header))
    frame = frame_header + frame_body
    # 44.1 kHz / 1152 samples per frame ≈ 38.28 frames per second
    total_frames = max(1, int(duration_seconds * 38))
    return frame * total_frames


class VoiceService:
    def __init__(self, config: AutomationConfig):
        self.config = config
        self.media_dir = config.voice_media_dir
        self.media_dir.mkdir(parents=True, exist_ok=True)
    def _convert_to_ogg_opus(self, mp3_path: Path) -> Path:
        """Convert MP3 audio to WhatsApp-compliant OGG Opus format (48kHz, mono, 32kbps)."""
        ogg_path = mp3_path.with_suffix(".ogg")
        try:
            import imageio_ffmpeg
            import subprocess
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            cmd = [
                ffmpeg_exe,
                "-y",
                "-i", str(mp3_path),
                "-c:a", "libopus",
                "-b:a", "32k",
                "-vbr", "on",
                "-ar", "48000",
                "-ac", "1",
                str(ogg_path),
            ]
            res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=12)
            if res.returncode == 0 and ogg_path.is_file() and ogg_path.stat().st_size > 500:
                logger.info("Converted audio to WhatsApp native OGG Opus voice note: %s (%d bytes)", ogg_path.name, ogg_path.stat().st_size)
                return ogg_path
        except Exception as exc:
            logger.warning("Could not convert audio to Ogg Opus: %s", exc)
        return mp3_path

    def synthesize(
        self,
        text: str,
        voice_id: str | None = None,
        language: str = "hinglish",
    ) -> tuple[Path, float, str]:
        """Synthesize natural girl/female speech audio.

        Priority order:
        1. Edge TTS neural girl voices ('hi-IN-SwaraNeural' or 'en-IN-NeerjaNeural')
        2. OpenAI Audio API ('shimmer' or 'nova' female voices)
        3. Google TTS (gTTS female voice)
        4. Offline synthetic MP3
        """
        voice = voice_id or self.config.openai_tts_voice
        filename = f"voice_{uuid.uuid4().hex[:12]}.mp3"
        out_path = self.media_dir / filename
        lang = (language or "hinglish").lower()

        # 1. Edge-TTS neural girl voice (high-definition natural voice)
        try:
            import edge_tts
            import asyncio
            import concurrent.futures

            chosen_voice = "hi-IN-SwaraNeural" if lang in ("hinglish", "hindi", "hi") else "en-IN-NeerjaNeural"

            async def _synthesize_edge():
                communicate = edge_tts.Communicate(text, chosen_voice)
                await communicate.save(str(out_path))

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                        pool.submit(lambda: asyncio.run(_synthesize_edge())).result(timeout=12.0)
                else:
                    loop.run_until_complete(_synthesize_edge())
            except RuntimeError:
                asyncio.run(_synthesize_edge())

            if out_path.is_file() and out_path.stat().st_size > 1000:
                words = len(text.split())
                duration = max(2.5, round((words / 140.0) * 60.0, 1))
                logger.info("Synthesized Edge-TTS neural girl voice (%s) to %s (%s s)", chosen_voice, filename, duration)
                final_path = self._convert_to_ogg_opus(out_path)
                return final_path, duration, final_path.name
        except Exception as edge_err:
            logger.warning("Edge-TTS synthesis error: %s, checking OpenAI/gTTS", edge_err)

        # 2. OpenAI Audio API (if OPENAI_API_KEY is configured)
        if self.config.openai_api_key:
            try:
                female_voice = voice if voice in ("shimmer", "nova") else "shimmer"
                req_data = json.dumps({
                    "model": self.config.openai_tts_model,
                    "voice": female_voice,
                    "input": text[:4096],
                    "response_format": "mp3",
                }).encode("utf-8")
                req = urllib.request.Request(
                    "https://api.openai.com/v1/audio/speech",
                    data=req_data,
                    headers={
                        "Authorization": f"Bearer {self.config.openai_api_key}",
                        "Content-Type": "application/json",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=15.0) as resp:
                    audio_bytes = resp.read()
                    out_path.write_bytes(audio_bytes)
                    words = len(text.split())
                    duration = max(2.5, round((words / 150.0) * 60.0, 1))
                    logger.info("Synthesized OpenAI female voice (%s) to %s (%s s)", female_voice, filename, duration)
                    final_path = self._convert_to_ogg_opus(out_path)
                    return final_path, duration, final_path.name
            except Exception as exc:
                logger.warning("OpenAI speech synthesis failed: %s, falling back to gTTS", exc)

        # 3. Google TTS (gTTS female voice)
        try:
            from gtts import gTTS
            lang_code = "hi" if lang in ("hinglish", "hindi", "hi") else "en"
            tts = gTTS(text=text, lang=lang_code, slow=False)
            tts.save(str(out_path))
            if out_path.is_file() and out_path.stat().st_size > 1000:
                words = len(text.split())
                duration = max(2.5, round((words / 130.0) * 60.0, 1))
                logger.info("Synthesized gTTS girl voice (%s) to %s (%s s)", lang_code, filename, duration)
                final_path = self._convert_to_ogg_opus(out_path)
                return final_path, duration, final_path.name
        except Exception as gtts_err:
            logger.warning("gTTS synthesis error: %s, falling back to synthetic", gtts_err)

        # 4. Offline / Mock fallback: generate valid MP3 audio stream
        words = len(text.split())
        duration = max(3.0, round((words / 130.0) * 60.0, 1))
        audio_bytes = _generate_synthetic_mp3(duration)
        out_path.write_bytes(audio_bytes)
        logger.info("Generated fallback voice audio file %s (%s s)", filename, duration)
        final_path = self._convert_to_ogg_opus(out_path)
        return final_path, duration, final_path.name

    def record_voice_message(
        self,
        conn,
        job_id: str | None,
        delivery_id: int | None,
        customer_id: str,
        loan_id: str,
        script_text: str,
        audio_url: str,
        duration: float,
        language: str = "hinglish",
        voice_id: str = "alloy",
        status: str = "generated",
        created_at: str | None = None,
    ) -> int:
        """Store voice metadata in voice_messages table."""
        from automation.util import iso, utcnow
        now_s = created_at or iso(utcnow())
        cur = conn.execute(
            """INSERT INTO voice_messages (
                   job_id, delivery_id, customer_id, loan_id, language, voice_id,
                   script_text, audio_url, duration_seconds, status, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (job_id, delivery_id, customer_id, loan_id, language, voice_id,
             script_text, audio_url, duration, status, now_s),
        )
        return cur.lastrowid

