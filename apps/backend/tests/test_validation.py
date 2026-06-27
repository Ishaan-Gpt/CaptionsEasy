import pytest

from app.core.config import Settings
from app.core.errors import CorruptedUploadError, UnsupportedMediaTypeError, VideoTooLargeError
from app.services.upload_validation import validate_upload

MP4_HEADER = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 8
WEBM_HEADER = b"\x1a\x45\xdf\xa3" + b"\x00" * 12
GARBAGE_HEADER = b"not a real video header"


@pytest.fixture
def settings() -> Settings:
    return Settings(
        DATABASE_URL_ASYNC="postgresql+asyncpg://test:test@localhost/test",
        SUPABASE_JWT_SECRET="test-secret",
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="test-key",
    )


def test_accepts_valid_mp4(settings):
    validate_upload(
        filename="clip.mp4",
        content_type="video/mp4",
        size_bytes=1024,
        header_bytes=MP4_HEADER,
        settings=settings,
    )


def test_accepts_valid_webm(settings):
    validate_upload(
        filename="clip.webm",
        content_type="video/webm",
        size_bytes=1024,
        header_bytes=WEBM_HEADER,
        settings=settings,
    )


def test_rejects_unsupported_format(settings):
    with pytest.raises(UnsupportedMediaTypeError):
        validate_upload(
            filename="clip.avi",
            content_type="video/x-msvideo",
            size_bytes=1024,
            header_bytes=GARBAGE_HEADER,
            settings=settings,
        )


def test_rejects_oversized_file(settings):
    with pytest.raises(VideoTooLargeError):
        validate_upload(
            filename="clip.mp4",
            content_type="video/mp4",
            size_bytes=settings.max_upload_size_bytes + 1,
            header_bytes=MP4_HEADER,
            settings=settings,
        )


def test_rejects_empty_file(settings):
    with pytest.raises(CorruptedUploadError):
        validate_upload(
            filename="clip.mp4",
            content_type="video/mp4",
            size_bytes=0,
            header_bytes=b"",
            settings=settings,
        )


def test_rejects_corrupted_container(settings):
    with pytest.raises(CorruptedUploadError):
        validate_upload(
            filename="clip.mp4",
            content_type="video/mp4",
            size_bytes=1024,
            header_bytes=GARBAGE_HEADER,
            settings=settings,
        )
