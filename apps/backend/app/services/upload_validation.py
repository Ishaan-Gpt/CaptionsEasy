"""Upload validation. Source: docs/PRD.md > Upload, contracts/database.md

Accepted: MP4, MOV, WEBM. Max size: 500MB (docs/PRD.md). Reject corrupted
uploads (basic container/magic-byte sniffing — see TODO below).
"""

from app.core.config import Settings
from app.core.errors import (
    CorruptedUploadError,
    UnsupportedMediaTypeError,
    VideoTooLargeError,
)

_EXTENSION_BY_CONTENT_TYPE = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
}

# Minimal container "magic bytes" sniffing to reject obviously corrupted/
# mislabeled uploads. TODO(PRD.md): PRD does not define what "corrupted"
# means precisely; this is a best-effort header check, not full container
# validation (e.g. via ffprobe).
_MP4_QUICKTIME_BOX_TYPES = (b"ftyp", b"moov", b"mdat", b"free", b"wide")
_WEBM_MAGIC = b"\x1a\x45\xdf\xa3"  # EBML header used by WebM/Matroska


def validate_upload(
    *,
    filename: str,
    content_type: str,
    size_bytes: int,
    header_bytes: bytes,
    settings: Settings,
) -> None:
    if content_type not in settings.allowed_upload_content_types:
        raise UnsupportedMediaTypeError(
            f"Unsupported video format '{content_type}'. Accepted: mp4, mov, webm."
        )

    if size_bytes <= 0:
        raise CorruptedUploadError("Uploaded file is empty.")

    if size_bytes > settings.max_upload_size_bytes:
        raise VideoTooLargeError("Maximum upload size exceeded.")

    if not _looks_like_valid_container(content_type, header_bytes):
        raise CorruptedUploadError("Uploaded file does not look like a valid video container.")


def _looks_like_valid_container(content_type: str, header_bytes: bytes) -> bool:
    if content_type == "video/webm":
        return header_bytes.startswith(_WEBM_MAGIC)
    # mp4 / mov (ISO base media file format): box type appears at offset 4.
    return len(header_bytes) >= 8 and header_bytes[4:8] in _MP4_QUICKTIME_BOX_TYPES
