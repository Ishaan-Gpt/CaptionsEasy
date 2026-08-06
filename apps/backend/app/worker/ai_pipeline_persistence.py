"""Shared row-builders for AI pipeline results.

Used by both the dormant Celery path (app.worker.ai_pipeline_stage) and the
local-worker callback endpoint (app.api.v1.worker_callbacks) so both persist
identically-shaped data from one place. `.add()` is sync on both SQLAlchemy
`Session` and `AsyncSession` — only `commit()` differs — so callers add
these rows themselves and commit in whichever style their session needs.
"""

import uuid

from app.db.models.caption_plan import CaptionPlan as CaptionPlanRow
from app.db.models.creative_plan import CreativePlan as CreativePlanRow
from app.db.models.motion_script import MotionScript as MotionScriptRow
from app.db.models.transcript import Transcript as TranscriptRow

TRANSCRIPT_SCHEMA_VERSION = 1


def build_ai_pipeline_rows(
    *,
    project_id: str,
    speech_provider_name: str,
    transcript_json: dict,
    creative_plan_json: dict,
    caption_json: dict,
    motion_script_json: dict,
) -> tuple[TranscriptRow, CreativePlanRow, CaptionPlanRow, MotionScriptRow]:
    pid = uuid.UUID(str(project_id))
    return (
        TranscriptRow(
            project_id=pid,
            language=transcript_json.get("language"),
            provider=speech_provider_name,
            version=TRANSCRIPT_SCHEMA_VERSION,
            transcript_json=transcript_json,
        ),
        CreativePlanRow(project_id=pid, creative_plan=creative_plan_json),
        CaptionPlanRow(project_id=pid, caption_json=caption_json),
        MotionScriptRow(project_id=pid, motion_script_json=motion_script_json, version=1),
    )
