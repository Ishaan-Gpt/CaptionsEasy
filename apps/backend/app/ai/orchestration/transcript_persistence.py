"""Transcript persistence. Source: Sprint 1.5 brief > Storage.

Deliberately separate from app.ai.orchestration.stage_executor: the
orchestration engine is storage-agnostic by design (Sprint 1.4 — no DB/repo
imports in app/ai/orchestration), so persisting a stage's output is the
caller's responsibility, not something bolted onto the generic executor.
Callers run the engine, then pass the resulting context here once the
TRANSCRIPT_VALIDATION stage has produced a validated Transcript.
"""

import uuid

from app.ai.types import PipelineContext, PipelineStage
from app.db.models.transcript import Transcript as TranscriptRow
from app.services.transcript_repository import TranscriptRepository

SCHEMA_VERSION = 1


async def persist_transcript_if_present(
    ctx: PipelineContext, transcript_repository: TranscriptRepository
) -> TranscriptRow | None:
    transcript = ctx.stage_outputs.get(PipelineStage.TRANSCRIPT_VALIDATION)
    if transcript is None:
        return None

    return await transcript_repository.create(
        project_id=uuid.UUID(str(ctx.project_id)),
        language=transcript.language,
        provider=ctx.config.get("speech_provider_name"),
        version=SCHEMA_VERSION,
        transcript_json=transcript.model_dump(mode="json"),
    )
