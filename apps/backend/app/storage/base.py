"""Storage client interface. Source: contracts/database.md > Constraints

"Binary files must live in Supabase Storage." Database stores only metadata
(storage_path). This interface lets the upload service depend on an
abstraction, not the Supabase SDK directly (DI-friendly, testable).
"""

from abc import ABC, abstractmethod


class StorageClient(ABC):
    @abstractmethod
    async def upload(self, *, path: str, content: bytes, content_type: str) -> str:
        """Uploads bytes to `path` in the configured bucket. Returns the
        storage path (never a public URL — ai-context/SHARED_CONTEXT.md:
        "Never expose storage buckets publicly.")."""
        raise NotImplementedError

    @abstractmethod
    async def download(self, *, path: str) -> bytes:
        """Downloads the bytes stored at `path` in the configured bucket."""
        raise NotImplementedError

    @abstractmethod
    async def get_signed_url(self, *, path: str, expires_in: int = 3600) -> str:
        """Generates a temporary signed URL to download/stream the file."""
        raise NotImplementedError

