"""Transcript repository. Source: contracts/database.md > transcripts

Sprint 1.5 brief > Storage: "Persist Transcript. Associate with Video."
contracts/database.md's `transcripts` table only defines `project_id` (no
`video_id` column) — see app/db/models/transcript.py. Video association is
therefore carried via `project_id` (the only FK the contract defines) plus
log/metric correlation in app.ai.orchestration.stage_executor, which already
records `video_id` alongside every stage metric; no column is invented here.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.transcript import Transcript


class TranscriptRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        *,
        project_id: uuid.UUID,
        language: str | None,
        provider: str | None,
        version: int | None,
        transcript_json: dict,
    ) -> Transcript:
        transcript = Transcript(
            project_id=project_id,
            language=language,
            provider=provider,
            version=version,
            transcript_json=transcript_json,
        )
        self._db.add(transcript)
        await self._db.commit()
        await self._db.refresh(transcript)
        return transcript
