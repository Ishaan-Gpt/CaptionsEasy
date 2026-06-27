"""Supabase Storage client. Source: docs/SYSTEM_OVERVIEW.md > Technology Stack (Storage)

Wraps the `supabase` Python SDK's storage API. No business logic lives here —
only the upload call itself.
"""

from supabase import create_client

from app.core.config import Settings
from app.storage.base import StorageClient


class SupabaseStorageClient(StorageClient):
    def __init__(self, settings: Settings) -> None:
        self._bucket = settings.supabase_storage_bucket
        self._client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    async def upload(self, *, path: str, content: bytes, content_type: str) -> str:
        self._client.storage.from_(self._bucket).upload(
            path,
            content,
            {"content-type": content_type},
        )
        return path

    async def download(self, *, path: str) -> bytes:
        return self._client.storage.from_(self._bucket).download(path)

    async def get_signed_url(self, *, path: str, expires_in: int = 3600) -> str:
        res = self._client.storage.from_(self._bucket).create_signed_url(path, expires_in)
        if isinstance(res, dict) and "signedURL" in res:
            return res["signedURL"]
        return str(res)

