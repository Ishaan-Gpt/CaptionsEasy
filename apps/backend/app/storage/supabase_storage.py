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
