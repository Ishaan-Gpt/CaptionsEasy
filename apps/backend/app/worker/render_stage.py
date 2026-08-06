import os
import uuid
import asyncio
import tempfile
from pathlib import Path
from sqlalchemy import select
from app.core.config import Settings
from app.db.models.job import Job
from app.db.models.project import Project
from app.db.models.video import Video
from app.db.models.motion_script import MotionScript as MotionScriptRow
from app.storage.dependencies import get_storage_client
from app.worker.export_persistence import build_export_row
from app.worker.stages import Stage
from app.render.engine import RenderEngine
from packages.contracts.python import validate_motion_script

class RenderPipelineContext:
    def __init__(self):
        self.project_id = None
        self.video_storage_path = None
        self.video_local_path = None
        self.output_local_path = None
        self.motion_script = None
        self.meta = {}

def run_async(coro):
    """Helper to run async coroutines synchronously in Celery worker thread."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

def build_render_stages(
    session,
    job_id: str,
    settings: Settings,
) -> list[Stage]:
    ctx = RenderPipelineContext()
    storage_client = get_storage_client(settings)
    engine = RenderEngine(
        ffmpeg_binary=settings.ffmpeg_binary if hasattr(settings, "ffmpeg_binary") else "ffmpeg",
        ffprobe_binary=settings.ffprobe_binary if hasattr(settings, "ffprobe_binary") else "ffprobe",
    )

    # Temporary directory helper to ensure cleanup on error or completion
    temp_dir = tempfile.TemporaryDirectory(prefix="motionai_render_")

    def stage_preparing() -> None:
        # Load Job
        job_row = session.execute(select(Job).where(Job.id == job_id)).scalar_one_or_none()
        if job_row is None:
            raise ValueError(f"Job {job_id} not found.")
        ctx.project_id = job_row.project_id

        # Load latest video
        video = session.execute(
            select(Video).where(Video.project_id == ctx.project_id).order_by(Video.created_at.desc())
        ).scalars().first()
        if video is None:
            raise ValueError(f"No video found for project {ctx.project_id}.")
        ctx.video_storage_path = video.storage_path

        # Load MotionScript
        ms_row = session.execute(
            select(MotionScriptRow).where(MotionScriptRow.project_id == ctx.project_id).order_by(MotionScriptRow.created_at.desc())
        ).scalars().first()
        if ms_row is None:
            raise ValueError(f"No MotionScript found for project {ctx.project_id}.")

        # Hydrate StylePresetManager's in-process cache for this project's
        # custom style before generate_ass() looks it up — this worker may
        # be a fresh process (e.g. a local worker) that never wrote/loaded
        # presets.json, and that file is reset on every Render redeploy
        # anyway. custom_style_json on the project row is the durable copy.
        project_row = session.execute(
            select(Project).where(Project.id == ctx.project_id)
        ).scalar_one_or_none()
        if project_row and project_row.style and project_row.style.startswith("custom_") and project_row.custom_style_json:
            from app.render.presets import StylePresetManager
            StylePresetManager.register(project_row.style, project_row.custom_style_json)

        # Validate MotionScript
        try:
            ctx.motion_script = validate_motion_script(ms_row.motion_script_json)
        except Exception as exc:
            raise ValueError(f"Invalid MotionScript: {exc}") from exc

        # Download Video
        try:
            video_bytes = run_async(storage_client.download(path=ctx.video_storage_path))
        except Exception as exc:
            raise RuntimeError(f"Corrupted or missing video file in storage: {exc}") from exc

        # Save video locally
        ctx.video_local_path = os.path.join(temp_dir.name, f"input_{uuid.uuid4()}.mp4")
        with open(ctx.video_local_path, "wb") as f:
            f.write(video_bytes)

    def stage_generating_ass() -> None:
        if not ctx.motion_script:
            raise ValueError("No MotionScript loaded.")
        # Verified inside generate_ass
        ctx.ass_content = engine.generate_ass(ctx.motion_script)

    def stage_rendering() -> None:
        if not ctx.video_local_path or not os.path.exists(ctx.video_local_path):
            raise FileNotFoundError("Local input video file is missing.")
        
        ctx.output_local_path = os.path.join(temp_dir.name, f"output_{uuid.uuid4()}.mp4")
        
        try:
            # We run the render engine which executes FFmpeg to burn subtitles and apply overlays/typography
            render_meta = engine.render(
                motion_script=ctx.motion_script,
                video_path=ctx.video_local_path,
                output_path=ctx.output_local_path,
            )
            ctx.meta.update(render_meta)
        except Exception as exc:
            raise RuntimeError(f"Rendering failed: {exc}") from exc

    def stage_encoding() -> None:
        # Encoding is done as part of engine.render (H264/AAC MP4 encode stage)
        if not ctx.output_local_path or not os.path.exists(ctx.output_local_path):
            raise FileNotFoundError("Rendered output file was not generated.")
        if os.path.getsize(ctx.output_local_path) == 0:
            raise RuntimeError("Rendered output file is empty (disk exhaustion or write failure).")

    def stage_uploading() -> None:
        # Upload rendered MP4
        export_id = uuid.uuid4()
        export_storage_path = f"projects/{ctx.project_id}/exports/{export_id}.mp4"
        
        try:
            with open(ctx.output_local_path, "rb") as f:
                output_bytes = f.read()
            run_async(
                storage_client.upload(
                    path=export_storage_path,
                    content=output_bytes,
                    content_type="video/mp4"
                )
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to upload rendered output to storage: {exc}") from exc

        # Fetch selected style from project
        from app.db.models.project import Project as ProjectModel
        project_row = session.execute(
            select(ProjectModel).where(ProjectModel.id == ctx.project_id)
        ).scalar_one_or_none()
        style_name = project_row.style if project_row else "minimal"

        # Save Export record to DB
        export_row = build_export_row(
            export_id=export_id,
            project_id=ctx.project_id,
            style_name=style_name,
            quality=ctx.motion_script.export_settings.quality if ctx.motion_script.export_settings else "high",
            width=ctx.meta.get("width", 1080),
            height=ctx.meta.get("height", 1920),
            render_duration_ms=ctx.meta.get("render_duration_ms", 0),
            duration_s=ctx.meta.get("duration_s", 0.0),
            size_bytes=ctx.meta.get("size_bytes", 0),
            storage_path=export_storage_path,
        )
        session.add(export_row)
        session.commit()

        # Cleanup temporary files
        try:
            temp_dir.cleanup()
        except Exception:
            pass

    return [
        Stage("Preparing", stage_preparing),
        Stage("Generating ASS", stage_generating_ass),
        Stage("Rendering", stage_rendering),
        Stage("Encoding", stage_encoding),
        Stage("Uploading", stage_uploading),
    ]
