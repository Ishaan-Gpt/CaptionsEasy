from fastapi import Depends

from app.core.config import Settings, get_settings
from app.storage.base import StorageClient
from app.storage.supabase_storage import SupabaseStorageClient

_client: StorageClient | None = None


def get_storage_client(settings: Settings = Depends(get_settings)) -> StorageClient:
    global _client
    if _client is None:
        _client = SupabaseStorageClient(settings)
    return _client
