"""Executes one job (the full AI pipeline, or a render) on this machine and
reports progress/results back to the backend over HTTPS. Reuses the
backend's own pure-compute code unmodified — app.ai.orchestration and
app.render.engine have no Celery/DB coupling, so they run here exactly as
they would inside the (now-dormant) Celery worker.
"""

import asyncio
import os
import tempfile
import uuid

import httpx

from app.ai.orchestration.factory import build_default_engine
from app.ai.types import PipelineContext, PipelineStage
from app.render.engine import RenderEngine
from packages.contracts.python import validate_motion_script  # type: ignore[import-not-found]

from local_worker.settings import get_local_worker_settings
from local_worker.storage_client import PresignedVideoStorageClient

settings = get_local_worker_settings()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _post_progress(
    http_client: httpx.AsyncClient, callback_base: str, job_id: str, token: str, stage: str, percentage: int
) -> None:
    try:
        await http_client.post(
            f"{callback_base}/internal/jobs/{job_id}/progress",
            json={"stage": stage, "percentage": percentage},
            headers=_auth_headers(token),
        )
    except Exception:
        pass  # progress updates are best-effort, same as the Celery path's Redis writes


async def _report_failed(
    http_client: httpx.AsyncClient, callback_base: str, job_id: str, token: str, error_message: str
) -> None:
    try:
        await http_client.post(
            f"{callback_base}/internal/jobs/{job_id}/failed",
            json={"error_message": error_message[:2000]},
            headers=_auth_headers(token),
        )
    except Exception:
        pass


async def run_job(payload: dict, worker_token: str) -> None:
    job_id = payload["jobId"]
    job_type = payload["jobType"]
    callback_base = payload["callbackBaseUrl"].rstrip("/")
    video_signed_url = payload["videoSignedUrl"]

    async with httpx.AsyncClient(timeout=600.0) as http_client:
        try:
            if job_type == "ai_pipeline":
                await _run_ai_pipeline(http_client, callback_base, job_id, worker_token, payload, video_signed_url)
            elif job_type == "render":
                await _run_render(http_client, callback_base, job_id, worker_token, payload, video_signed_url)
            else:
                raise ValueError(f"Unknown job type: {job_type!r}")
        except Exception as exc:  # noqa: BLE001 — must always report failure, never crash silently
            await _report_failed(http_client, callback_base, job_id, worker_token, str(exc))


async def _run_ai_pipeline(
    http_client: httpx.AsyncClient,
    callback_base: str,
    job_id: str,
    worker_token: str,
    payload: dict,
    video_signed_url: str,
) -> None:
    storage_client = PresignedVideoStorageClient(video_signed_url=video_signed_url, http_client=http_client)

    engine, _recorder = build_default_engine(
        speech_provider_name=payload.get("speechProviderName") or "groq",
        creative_provider_name=payload.get("creativeProviderName") or "groq",
        caption_provider_name=payload.get("captionProviderName") or "groq",
        render_plan_provider_name=payload.get("renderPlanProviderName") or "dummy",
        storage_client=storage_client,
        # Without this, each Groq provider's own get_settings() fallback
        # fires and crashes on the local worker (it requires
        # DATABASE_URL_ASYNC/SUPABASE_* fields this worker never has) —
        # caught live: "AI Pipeline Failed" / Speech Transcription stage
        # failing with 4 pydantic validation errors for Settings.
        settings=settings,
    )

    loop = asyncio.get_running_loop()

    def _on_stage_complete(stage: PipelineStage, completed: int, total: int) -> None:
        # Called synchronously by the orchestration engine (see
        # app.ai.orchestration.engine.run) — schedule the async POST rather
        # than block the pipeline on it.
        percentage = min(95, round(completed / total * 95))
        loop.create_task(_post_progress(http_client, callback_base, job_id, worker_token, stage.value, percentage))

    ctx = PipelineContext(
        project_id=payload.get("projectId") or "",
        video_id="local",
        job_id=job_id,
        video=None,
        config={
            # PresignedVideoStorageClient.download() ignores this value —
            # it's only here because run_speech()'s lookup expects a string.
            "video_storage_path": "video.mp4",
            "style": payload.get("style") or "kalakar",
            "caption_template": payload.get("captionTemplate"),
            "prompt": payload.get("prompt"),
        },
        extra={"on_stage_complete": _on_stage_complete},
    )

    outcome = await engine.run(ctx)
    if not outcome.success:
        raise RuntimeError(f"AI pipeline failed at {outcome.failed_stage}: {outcome.reason}")

    transcript = ctx.stage_outputs[PipelineStage.TRANSCRIPT_VALIDATION]
    creative_plan = ctx.stage_outputs[PipelineStage.CREATIVE_VALIDATION]
    caption_plan = ctx.stage_outputs[PipelineStage.CAPTION_VALIDATION]
    motion_script = ctx.stage_outputs[PipelineStage.RENDER_VALIDATION]

    response = await http_client.post(
        f"{callback_base}/internal/jobs/{job_id}/complete",
        json={
            "transcript": transcript.model_dump(mode="json"),
            "creative_plan": creative_plan.model_dump(mode="json"),
            "caption_plan": caption_plan.model_dump(mode="json"),
            "motion_script": motion_script.model_dump(mode="json"),
        },
        headers=_auth_headers(worker_token),
    )
    response.raise_for_status()


async def _run_render(
    http_client: httpx.AsyncClient,
    callback_base: str,
    job_id: str,
    worker_token: str,
    payload: dict,
    video_signed_url: str,
) -> None:
    await _post_progress(http_client, callback_base, job_id, worker_token, "Preparing", 10)

    motion_script = validate_motion_script(payload["motionScript"])

    video_resp = await http_client.get(video_signed_url)
    video_resp.raise_for_status()

    with tempfile.TemporaryDirectory(prefix="captionseasy_render_") as tmp_dir:
        video_local_path = os.path.join(tmp_dir, f"input_{uuid.uuid4()}.mp4")
        with open(video_local_path, "wb") as f:
            f.write(video_resp.content)

        await _post_progress(http_client, callback_base, job_id, worker_token, "Rendering", 40)

        engine = RenderEngine(ffmpeg_binary=settings.ffmpeg_binary, ffprobe_binary=settings.ffprobe_binary)
        output_local_path = os.path.join(tmp_dir, f"output_{uuid.uuid4()}.mp4")
        render_meta = engine.render(
            motion_script=motion_script, video_path=video_local_path, output_path=output_local_path
        )

        await _post_progress(http_client, callback_base, job_id, worker_token, "Uploading", 85)

        with open(output_local_path, "rb") as f:
            output_bytes = f.read()

        response = await http_client.post(
            f"{callback_base}/internal/jobs/{job_id}/complete-render",
            files={"file": ("export.mp4", output_bytes, "video/mp4")},
            data={
                "resolution_width": str(render_meta.get("width", 1080)),
                "resolution_height": str(render_meta.get("height", 1920)),
                "quality": (motion_script.export_settings.quality if motion_script.export_settings else "high"),
                "render_duration_ms": str(render_meta.get("render_duration_ms", 0)),
                "duration_s": str(render_meta.get("duration_s", 0.0)),
            },
            headers=_auth_headers(worker_token),
            timeout=180.0,
        )
        response.raise_for_status()
