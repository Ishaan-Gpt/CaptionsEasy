"""Projects endpoints. Source: contracts/api.md > Projects, AI Processing

Implements every documented Projects endpoint (list/create/get/rename-or-
archive/soft-delete) plus POST /projects/{id}/process, which queues the AI
pipeline job (app.worker.ai_pipeline_stage) for the project's latest video —
this sprint wires that job to real speech recognition only (Sprint 1.4/1.5),
not creative/caption/render planning (out of scope, see docs/ROADMAP.md
Phases 7+).
"""

import uuid
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from app.auth.dependencies import get_current_profile
from app.core.errors import NotFoundError, ForbiddenError, AppError
from app.core.responses import success_response
from app.storage.base import StorageClient
from app.storage.dependencies import get_storage_client
from app.db.models.profile import Profile
from app.db.models.project import Project
from app.db.schemas.project import ProjectRead
from app.services.job_repository import JobRepository
from app.services.project_repository import ProjectRepository
from app.services.video_repository import VideoRepository
from app.worker.ai_pipeline_stage import AI_PIPELINE_JOB_TYPE
from app.worker.dispatcher import JobDispatcherProtocol

from .deps import (
    get_job_dispatcher,
    get_job_repository,
    get_owned_project,
    get_project_repository,
    get_video_repository,
    get_creative_plan_repository,
    get_caption_plan_repository,
    get_motion_script_repository,
    get_export_repository,
    get_transcript_repository,
)
from app.services.creative_plan_repository import CreativePlanRepository
from app.services.caption_plan_repository import CaptionPlanRepository
from app.services.motion_script_repository import MotionScriptRepository
from app.services.export_repository import ExportRepository
from app.services.transcript_repository import TranscriptRepository


router = APIRouter(tags=["projects"])


class CreateProjectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)


class UpdateProjectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: str | None = None
    thumbnail_url: str | None = None
    style: str | None = None


@router.get("/projects")
async def list_projects(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    include_archived: bool = Query(default=False),
    profile: Profile = Depends(get_current_profile),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    projects, total = await project_repository.get_all_by_owner(
        profile.id, limit=limit, offset=offset, include_archived=include_archived
    )
    return success_response(
        [ProjectRead.model_validate(p).model_dump(mode="json") for p in projects],
        meta={"total": total, "limit": limit, "offset": offset},
    )


@router.post("/projects", status_code=201)
async def create_project(
    body: CreateProjectRequest,
    profile: Profile = Depends(get_current_profile),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    project = await project_repository.create(owner_id=profile.id, title=body.title)
    return success_response(ProjectRead.model_validate(project).model_dump(mode="json"), status_code=201)


@router.get("/projects/{project_id}")
async def get_project(project: Project = Depends(get_owned_project)):
    return success_response(ProjectRead.model_validate(project).model_dump(mode="json"))


@router.patch("/projects/{project_id}")
async def update_project(
    body: UpdateProjectRequest,
    project: Project = Depends(get_owned_project),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    updated = await project_repository.update_fields(
        project,
        title=body.title,
        description=body.description,
        status=body.status,
        thumbnail_url=body.thumbnail_url,
        style=body.style,
    )
    return success_response(ProjectRead.model_validate(updated).model_dump(mode="json"))


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project: Project = Depends(get_owned_project),
    project_repository: ProjectRepository = Depends(get_project_repository),
    dispatcher: JobDispatcherProtocol = Depends(get_job_dispatcher),
):
    await project_repository.soft_delete(project)
    
    # Dispatch storage cleanup task via the dispatcher
    dispatcher.dispatch_cleanup(str(project.id))
    
    return success_response(None, status_code=204)


@router.post("/projects/{project_id}/archive")
async def archive_project(
    project: Project = Depends(get_owned_project),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    updated = await project_repository.set_archived(project, archived=True)
    return success_response(ProjectRead.model_validate(updated).model_dump(mode="json"))


@router.post("/projects/{project_id}/unarchive")
async def unarchive_project(
    project: Project = Depends(get_owned_project),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    updated = await project_repository.set_archived(project, archived=False)
    return success_response(ProjectRead.model_validate(updated).model_dump(mode="json"))


@router.post("/projects/{project_id}/duplicate", status_code=201)
async def duplicate_project(
    project: Project = Depends(get_owned_project),
    profile: Profile = Depends(get_current_profile),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    """Clones project metadata (title/description/style) only — a real,
    minimal duplicate. It does not copy video/job/transcript/export rows;
    the duplicate starts at CREATED and the user re-uploads, same as any new
    project. Cloning multi-GB video storage objects silently behind a
    "duplicate" button would be a surprising, slow, and storage-costly
    operation to hide from the user."""
    copy = await project_repository.create(
        owner_id=profile.id, title=f"{project.title} (Copy)", description=project.description
    )
    if project.style is not None:
        copy = await project_repository.update_fields(copy, style=project.style)
    return success_response(ProjectRead.model_validate(copy).model_dump(mode="json"), status_code=201)


@router.post("/projects/{project_id}/process", status_code=202)
async def process_project(
    project: Project = Depends(get_owned_project),
    video_repository: VideoRepository = Depends(get_video_repository),
    job_repository: JobRepository = Depends(get_job_repository),
    job_dispatcher: JobDispatcherProtocol = Depends(get_job_dispatcher),
):
    video = await video_repository.get_latest_for_project(project.id)
    if video is None:
        raise NotFoundError("Upload a video before starting processing.")

    job = await job_repository.create_queued(project_id=project.id, job_type=AI_PIPELINE_JOB_TYPE)
    job_dispatcher.dispatch(str(job.id))
    return success_response({"jobId": str(job.id)}, status_code=202)


@router.get("/projects/{project_id}/creative-plan")
async def get_creative_plan(
    project: Project = Depends(get_owned_project),
    creative_plan_repository: CreativePlanRepository = Depends(get_creative_plan_repository),
):
    creative_plan = await creative_plan_repository.get_latest_for_project(project.id)
    if creative_plan is None:
        raise NotFoundError("No creative plan found for this project yet.")
    return success_response(creative_plan.creative_plan)


@router.get("/projects/{project_id}/caption-plan")
async def get_caption_plan(
    project: Project = Depends(get_owned_project),
    caption_plan_repository: CaptionPlanRepository = Depends(get_caption_plan_repository),
):
    caption_plan = await caption_plan_repository.get_latest_for_project(project.id)
    if caption_plan is None:
        raise NotFoundError("No caption plan found for this project yet.")
    return success_response(caption_plan.caption_json)


@router.get("/projects/{project_id}/motion-script")
async def get_motion_script(
    project: Project = Depends(get_owned_project),
    motion_script_repository: MotionScriptRepository = Depends(get_motion_script_repository),
):
    motion_script = await motion_script_repository.get_latest_for_project(project.id)
    if motion_script is None:
        raise NotFoundError("No motion script found for this project yet.")
    return success_response(motion_script.motion_script_json)


@router.post("/projects/{project_id}/motion-script")
async def generate_motion_script(
    project: Project = Depends(get_owned_project),
    transcript_repository: TranscriptRepository = Depends(get_transcript_repository),
    creative_plan_repository: CreativePlanRepository = Depends(get_creative_plan_repository),
    caption_plan_repository: CaptionPlanRepository = Depends(get_caption_plan_repository),
    motion_script_repository: MotionScriptRepository = Depends(get_motion_script_repository),
):
    transcript = await transcript_repository.get_latest_for_project(project.id)
    creative_plan = await creative_plan_repository.get_latest_for_project(project.id)
    caption_plan = await caption_plan_repository.get_latest_for_project(project.id)
    
    if not transcript or not creative_plan or not caption_plan:
        raise AppError("Complete transcript and caption planning first.", code="BAD_REQUEST", status_code=400)

    from app.ai.providers.dummy.render_plan import DummyRenderPlanProvider
    from packages.contracts.python import Transcript as TranscriptModel, CreativePlan as CreativePlanModel, CaptionPlan as CaptionPlanModel
    
    parsed_transcript = TranscriptModel.model_validate(transcript.transcript_json)
    parsed_creative = CreativePlanModel.model_validate(creative_plan.creative_plan)
    parsed_caption = CaptionPlanModel.model_validate(caption_plan.caption_json)

    provider = DummyRenderPlanProvider()
    output = await provider.plan(
        transcript=parsed_transcript,
        creative_plan=parsed_creative,
        caption_plan=parsed_caption,
        project_id=str(project.id),
        video_id=str(project.id),
        style=project.style,
    )
    
    motion_script = await motion_script_repository.create(
        project_id=project.id,
        motion_script_json=output.data,
    )
    return success_response(motion_script.motion_script_json)


class ExportRequest(BaseModel):
    resolution: str
    quality: str


@router.post("/projects/{project_id}/export", status_code=202)
async def export_project(
    body: ExportRequest,
    project: Project = Depends(get_owned_project),
    job_repository: JobRepository = Depends(get_job_repository),
    job_dispatcher: JobDispatcherProtocol = Depends(get_job_dispatcher),
    motion_script_repository: MotionScriptRepository = Depends(get_motion_script_repository),
):
    motion_script = await motion_script_repository.get_latest_for_project(project.id)
    if motion_script is None:
        raise AppError("Generate a MotionScript before exporting.", code="BAD_REQUEST", status_code=400)

    job = await job_repository.create_queued(project_id=project.id, job_type="render")
    job_dispatcher.dispatch(str(job.id))
    return success_response({"jobId": str(job.id)}, status_code=202)


@router.get("/projects/{project_id}/exports")
async def get_exports(
    project: Project = Depends(get_owned_project),
    export_repository: ExportRepository = Depends(get_export_repository),
    storage_client: StorageClient = Depends(get_storage_client),
):
    exports = await export_repository.get_all_by_project(project.id)
    results = []
    for exp in exports:
        download_url = await storage_client.get_signed_url(path=exp.storage_path)
        data = {
            "id": str(exp.id),
            "resolution": exp.resolution,
            "quality": exp.quality,
            "download_url": download_url,
            "render_time_ms": exp.render_duration_ms,
            "file_size": exp.file_size or 0,
            "style": exp.style or "minimal",
            "duration_ms": exp.duration_ms or 0,
            "status": exp.status or "completed",
            "created_at": exp.created_at.isoformat() if exp.created_at else None,
        }
        results.append(data)
    return success_response(results)


@router.get("/exports/{export_id}")
async def get_export_by_id(
    export_id: uuid.UUID,
    profile: Profile = Depends(get_current_profile),
    project_repository: ProjectRepository = Depends(get_project_repository),
    export_repository: ExportRepository = Depends(get_export_repository),
    storage_client: StorageClient = Depends(get_storage_client),
):
    export = await export_repository.get_by_id(export_id)
    if export is None:
        raise NotFoundError("Export not found.")
        
    project = await project_repository.get_by_id(export.project_id)
    if project is None or project.owner_id != profile.id:
        raise ForbiddenError("You do not have access to this export.")
        
    download_url = await storage_client.get_signed_url(path=export.storage_path)
    
    return success_response({
        "id": str(export.id),
        "resolution": export.resolution,
        "quality": export.quality,
        "download_url": download_url,
        "render_time_ms": export.render_duration_ms,
        "file_size": export.file_size or 0,
        "style": export.style or "minimal",
        "duration_ms": export.duration_ms or 0,
        "status": export.status or "completed",
        "created_at": export.created_at.isoformat() if export.created_at else None,
    })



