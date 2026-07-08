"""Real AI pipeline stage glue. Source: Sprint 1.6 brief > Processing.

Wires the existing Sprint 1.4 orchestration engine and Sprint 1.5/1.6 Groq
speech provider into the Sprint 1.3 worker pipeline (app.worker.pipeline),
restricted to speech recognition only (see
app.ai.orchestration.factory.build_speech_only_engine — creative/caption/
render planning stay out of scope this sprint).

The orchestration engine is async; Celery's worker pool is sync (see
app.worker.db's docstring). This module is the one place that bridges the
two, via `asyncio.run`, rather than spreading asyncio through the worker.
"""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.orchestration.factory import build_default_engine
from app.ai.types import PipelineContext, PipelineStage
from app.core.config import Settings
from app.db.models.transcript import Transcript as TranscriptRow
from app.db.models.creative_plan import CreativePlan as CreativePlanRow
from app.db.models.caption_plan import CaptionPlan as CaptionPlanRow
from app.db.models.motion_script import MotionScript as MotionScriptRow
from app.db.models.video import Video
from app.worker.stages import Stage
from app.worker.types import JobRepositoryProtocol, ProgressReporterProtocol

AI_PIPELINE_JOB_TYPE = "ai_pipeline"

TRANSCRIPT_SCHEMA_VERSION = 1


AI_SUBSTAGE_ESTIMATE_MS = 15_000  # rough per-substage estimate; no real AI timing history yet.


def build_ai_pipeline_stages(
    *,
    job_id: str,
    project_id: str,
    video: Video | None,
    settings: Settings,
    session: Session,
    progress: ProgressReporterProtocol | None = None,
    repo: JobRepositoryProtocol | None = None,
) -> list[Stage]:
    def _on_stage_complete(stage: PipelineStage, completed: int, total: int) -> None:
        # Scaled to leave headroom below 100% — the outer worker pipeline
        # (app.worker.pipeline._run_stages) reports the final 100% itself
        # once this whole macro-stage (incl. DB persistence) finishes.
        percentage = min(95, round(completed / total * 95))
        remaining_ms = (total - completed) * AI_SUBSTAGE_ESTIMATE_MS
        if progress is not None:
            progress.set_progress(
                job_id,
                stage=stage.value,
                percentage=percentage,
                estimated_remaining_ms=remaining_ms,
            )
        if repo is not None:
            repo.update_progress(job_id, percentage)

    def _run_ai_pipeline() -> None:
        if video is None:
            raise ValueError(f"No video found for project {project_id}; cannot run AI pipeline.")

        # Query Project to get selected style and caption template. Falls
        # back to "kalakar" — not StylePresetManager's own "minimal" default
        # — because that's the base preset the frontend's own custom-style
        # editor builds from (see save_custom_style's `base_preset =
        # data.get("kalakar", {})` in app.api.v1.projects) and what
        # test/generate_kalakar_video.py renders with; leaving an
        # unstyled project on "minimal" produced a visibly plainer render
        # (thin font, low-contrast highlight, single-word captions) than
        # what users see previewed/expect by default.
        try:
            from app.db.models.project import Project as ProjectModel
            project_row = session.execute(
                select(ProjectModel).where(ProjectModel.id == uuid.UUID(project_id))
            ).scalar_one_or_none()
            style_name = (project_row.style if project_row else None) or "kalakar"
            caption_template = project_row.caption_template if project_row else None
            
            title = project_row.title if project_row else ""
            desc = project_row.description if project_row else ""
            prompt_parts = []
            if title:
                prompt_parts.append(f"Title: {title}")
            if desc:
                prompt_parts.append(f"Description: {desc}")
            prompt = ". ".join(prompt_parts) if prompt_parts else None
        except AttributeError:
            style_name = "kalakar"
            caption_template = None
            prompt = None

        engine, _recorder = build_default_engine(
            speech_provider_name=settings.speech_provider_name,
            creative_provider_name=settings.creative_provider_name,
            caption_provider_name=settings.caption_provider_name,
            render_plan_provider_name=settings.render_plan_provider_name,
        )
        ctx = PipelineContext(
            project_id=project_id,
            video_id=str(video.id),
            job_id=job_id,
            video=video,
            config={
                "speech_provider_name": settings.speech_provider_name,
                "creative_provider_name": settings.creative_provider_name,
                "caption_provider_name": settings.caption_provider_name,
                "render_plan_provider_name": settings.render_plan_provider_name,
                "style": style_name,
                "caption_template": caption_template,
                "prompt": prompt,
            },
            extra={"on_stage_complete": _on_stage_complete},
        )

        outcome = asyncio.run(engine.run(ctx))
        if not outcome.success:
            raise RuntimeError(f"AI pipeline failed at {outcome.failed_stage}: {outcome.reason}")

        # 1. Persist Transcript
        transcript = ctx.stage_outputs[PipelineStage.TRANSCRIPT_VALIDATION]
        session.add(
            TranscriptRow(
                project_id=uuid.UUID(str(project_id)),
                language=transcript.language,
                provider=settings.speech_provider_name,
                version=TRANSCRIPT_SCHEMA_VERSION,
                transcript_json=transcript.model_dump(mode="json"),
            )
        )

        # 2. Persist Creative Plan
        creative_plan = ctx.stage_outputs[PipelineStage.CREATIVE_VALIDATION]
        session.add(
            CreativePlanRow(
                project_id=uuid.UUID(str(project_id)),
                creative_plan=creative_plan.model_dump(mode="json"),
            )
        )

        # 3. Persist Caption Plan
        caption_plan = ctx.stage_outputs[PipelineStage.CAPTION_VALIDATION]
        session.add(
            CaptionPlanRow(
                project_id=uuid.UUID(str(project_id)),
                caption_json=caption_plan.model_dump(mode="json"),
            )
        )

        # 4. Persist MotionScript
        motion_script = ctx.stage_outputs[PipelineStage.RENDER_VALIDATION]
        session.add(
            MotionScriptRow(
                project_id=uuid.UUID(str(project_id)),
                motion_script_json=motion_script.model_dump(mode="json"),
                version=1,
            )
        )

        session.commit()

    return [Stage("AI Pipeline Execution", _run_ai_pipeline)]


