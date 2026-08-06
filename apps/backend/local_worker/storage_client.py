"""A StorageClient stand-in for the local worker.

The local worker never holds Supabase service-role credentials — it only
ever needs to fetch the one video for the job it was just handed, via a
presigned URL the backend already generated. `download()` ignores the
`path` argument entirely and just GETs that URL; `upload()`/`get_signed_url()`
are never called on the local worker's copy of the AI pipeline (rendering
output goes back to the backend via a plain multipart POST instead — see
run_job.py) so they raise if ever reached.
"""

import httpx

from app.storage.base import StorageClient


class PresignedVideoStorageClient(StorageClient):
    def __init__(self, *, video_signed_url: str, http_client: httpx.AsyncClient) -> None:
        self._url = video_signed_url
        self._http = http_client

    async def download(self, *, path: str) -> bytes:
        response = await self._http.get(self._url)
        response.raise_for_status()
        return response.content

    async def upload(self, *, path: str, content: bytes, content_type: str) -> str:
        raise NotImplementedError("local worker never uploads via StorageClient")

    async def get_signed_url(self, *, path: str, expires_in: int = 3600) -> str:
        raise NotImplementedError("local worker never mints signed URLs")
