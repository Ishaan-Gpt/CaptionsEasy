"""Groq-compatible SpeechProvider. Source: Sprint 1.5/1.6 brief.

Video -> download from storage -> extract audio -> Groq Whisper
transcription endpoint (OpenAI-compatible) -> Transcript-shaped raw dict.

No business-rule validation happens here — "every provider output must
validate against the existing JSON Schemas" is enforced one layer up by
app.ai.orchestration.stage_executor (Sprint 1.4, reused unmodified), which
also owns the repair-once/retry-provider-once/fail flow. This provider only
ever raises on hard failures (download/extraction/HTTP errors) or returns a
raw dict on success — it never retries or repairs anything itself.
"""

import math
import time
from pathlib import PurePosixPath
from typing import Any

import httpx

from app.ai.providers.speech.audio_extractor import (
    AudioExtractor,
    FfmpegAudioExtractor,
    UnsupportedMediaTypeError,
)
from app.ai.providers.stage_providers import ProviderOutput, SpeechProvider
from app.ai.types import ProviderUsage
from app.core.config import Settings
from app.storage.base import StorageClient

EXTENSION_TO_CONTENT_TYPE = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
}

TRANSCRIPT_VERSION = "1.0"
# Whisper's verbose_json doesn't return a real per-word confidence; when a
# segment's avg_logprob isn't available we fall back to this constant so the
# Transcript schema's required `confidence` field is still satisfied
# ("Return confidence values when available" — when not available, a neutral
# default is used rather than omitting the field).
FALLBACK_CONFIDENCE = 0.5


class GroqSpeechProvider(SpeechProvider):
    def __init__(
        self,
        *,
        settings: Settings,
        storage_client: StorageClient,
        audio_extractor: AudioExtractor | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._storage_client = storage_client
        self._audio_extractor = audio_extractor or FfmpegAudioExtractor()
        self._http_client = http_client

    async def transcribe(
        self,
        *,
        video_storage_path: str,
        prompt: str | None = None,
        language: str | None = None,
    ) -> ProviderOutput:
        content_type = _content_type_for_path(video_storage_path)

        video_bytes = await self._storage_client.download(path=video_storage_path)
        audio_bytes = await self._audio_extractor.extract(
            video_bytes=video_bytes, content_type=content_type
        )

        start = time.monotonic()
        response_json = await self._call_groq(audio_bytes, prompt=prompt, language=language)
        latency_ms = (time.monotonic() - start) * 1000

        data = _map_response_to_transcript(response_json)
        duration_seconds = data["duration_ms"] / 1000
        usage = ProviderUsage(
            provider="groq",
            model=self._settings.groq_speech_model,
            latency_ms=latency_ms,
            estimated_cost_usd=duration_seconds * self._settings.groq_cost_per_second_usd,
        )
        return ProviderOutput(data=data, usage=usage)

    async def _call_groq(
        self,
        audio_bytes: bytes,
        prompt: str | None = None,
        language: str | None = None,
    ) -> dict[str, Any]:
        url = f"{self._settings.groq_base_url}/audio/transcriptions"
        
        keys_to_try = [self._settings.groq_api_key]
        if getattr(self._settings, "groq_api_key_backup", None):
            keys_to_try.append(self._settings.groq_api_key_backup)

        last_exc = None
        for i, api_key in enumerate(keys_to_try):
            if not api_key:
                continue
            headers = {"Authorization": f"Bearer {api_key}"}
            files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
            data = {
                "model": self._settings.groq_speech_model,
                "response_format": "verbose_json",
                "timestamp_granularities[]": "word",
            }
            if prompt:
                data["prompt"] = prompt
            if language:
                data["language"] = language

            client = self._http_client
            owns_client = client is None
            if owns_client:
                client = httpx.AsyncClient(timeout=self._settings.groq_timeout_seconds)
            try:
                response = await client.post(url, headers=headers, files=files, data=data)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                last_exc = e
                if i < len(keys_to_try) - 1:
                    print(f"[Speech Provider] Call to Groq with primary API key failed: {e}. Trying backup API key...")
                    continue
                else:
                    raise
            finally:
                if owns_client:
                    await client.aclose()


def _content_type_for_path(storage_path: str) -> str:
    extension = PurePosixPath(storage_path).suffix.lower()
    try:
        return EXTENSION_TO_CONTENT_TYPE[extension]
    except KeyError as exc:
        raise UnsupportedMediaTypeError(f"Unsupported video extension: {extension}") from exc


def _map_response_to_transcript(response_json: dict[str, Any]) -> dict[str, Any]:
    duration_seconds = response_json.get("duration") or 0.0
    language = response_json.get("language") or "unknown"

    segment_confidence_by_range: list[tuple[float, float, float]] = []
    for segment in response_json.get("segments", []) or []:
        avg_logprob = segment.get("avg_logprob")
        confidence = _logprob_to_confidence(avg_logprob) if avg_logprob is not None else None
        if confidence is not None:
            segment_confidence_by_range.append((segment["start"], segment["end"], confidence))

    words = []
    for word in response_json.get("words", []) or []:
        start_ms = round(word["start"] * 1000)
        end_ms = round(word["end"] * 1000)
        confidence = _confidence_for_word(start_ms / 1000, segment_confidence_by_range)
        words.append(
            {
                "text": word["word"].strip(),
                "start_ms": start_ms,
                "end_ms": end_ms,
                "confidence": confidence,
            }
        )

    # Robust overlap resolver (non-cascading: pulls back previous end_ms instead of delaying subsequent start_ms)
    if words:
        for w in words:
            w["start_ms"] = max(0, w["start_ms"])
            if w["end_ms"] <= w["start_ms"]:
                w["end_ms"] = w["start_ms"] + 100

        for i in range(1, len(words)):
            prev = words[i - 1]
            curr = words[i]
            if prev["end_ms"] > curr["start_ms"]:
                if curr["start_ms"] > prev["start_ms"]:
                    prev["end_ms"] = curr["start_ms"]
                else:
                    prev["end_ms"] = prev["start_ms"] + 50
                    curr["start_ms"] = prev["end_ms"]
                    if curr["end_ms"] <= curr["start_ms"]:
                        curr["end_ms"] = curr["start_ms"] + 100

    return {
        "version": TRANSCRIPT_VERSION,
        "language": language,
        "duration_ms": round(duration_seconds * 1000),
        "words": words,
    }


def _logprob_to_confidence(avg_logprob: float) -> float:
    return max(0.0, min(1.0, math.exp(avg_logprob)))


def _confidence_for_word(
    start_seconds: float, segment_confidence_by_range: list[tuple[float, float, float]]
) -> float:
    for start, end, confidence in segment_confidence_by_range:
        if start <= start_seconds <= end:
            return confidence
    return FALLBACK_CONFIDENCE
