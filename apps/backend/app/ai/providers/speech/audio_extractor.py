"""Audio extraction for the speech provider. Source: Sprint 1.5 brief
"Video -> Extract audio if required -> Speech provider -> Transcript".

Scoped strictly to feeding the speech provider — not a general-purpose
media pipeline, not rendering (docs/SYSTEM_OVERVIEW.md's ffmpeg usage for
rendering is a separate, untouched concern).
"""

import asyncio
import tempfile
from abc import ABC, abstractmethod
from pathlib import Path

CONTENT_TYPE_TO_EXTENSION = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
}


class UnsupportedMediaTypeError(Exception):
    pass


class AudioExtractor(ABC):
    @abstractmethod
    async def extract(self, *, video_bytes: bytes, content_type: str) -> bytes:
        """Returns mono 16kHz WAV bytes extracted from `video_bytes`."""
        raise NotImplementedError


class FfmpegAudioExtractor(AudioExtractor):
    """Shells out to the `ffmpeg` binary already used elsewhere in this
    project (docs/SYSTEM_OVERVIEW.md > Technology Stack) to demux audio from
    mp4/mov/webm containers. ffmpeg auto-detects the container format, so no
    per-format branching is needed beyond rejecting unsupported types."""

    def __init__(self, *, ffmpeg_binary: str = "ffmpeg") -> None:
        self._ffmpeg_binary = ffmpeg_binary

    async def extract(self, *, video_bytes: bytes, content_type: str) -> bytes:
        if content_type not in CONTENT_TYPE_TO_EXTENSION:
            raise UnsupportedMediaTypeError(f"Unsupported media type: {content_type}")

        suffix = CONTENT_TYPE_TO_EXTENSION[content_type]
        with tempfile.TemporaryDirectory() as tmp_dir:
            input_path = Path(tmp_dir) / f"input{suffix}"
            output_path = Path(tmp_dir) / "output.wav"
            input_path.write_bytes(video_bytes)

            process = await asyncio.create_subprocess_exec(
                self._ffmpeg_binary,
                "-y",
                "-i",
                str(input_path),
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                str(output_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()
            if process.returncode != 0:
                raise RuntimeError(f"ffmpeg audio extraction failed: {stderr.decode(errors='replace')}")

            return output_path.read_bytes()
