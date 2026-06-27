"""Projects endpoints. Source: contracts/api.md > Projects, AI Processing

Implements every documented Projects endpoint (list/create/get/rename-or-
archive/soft-delete) plus POST /projects/{id}/process, which queues the AI
pipeline job (app.worker.ai_pipeline_stage) for the project's latest video —
this sprint wires that job to real speech recognition only (Sprint 1.4/1.5),
not creative/caption/render planning (out of scope, see docs/ROADMAP.md
Phases 7+).
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from app.auth.dependencies import get_current_profile
from app.core.errors import NotFoundError
from app.core.responses import success_response
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
)

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


@router.get("/projects")
async def list_projects(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    profile: Profile = Depends(get_current_profile),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    projects, total = await project_repository.get_all_by_owner(profile.id, limit=limit, offset=offset)
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
    )
    return success_response(ProjectRead.model_validate(updated).model_dump(mode="json"))


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project: Project = Depends(get_owned_project),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    await project_repository.soft_delete(project)
    return success_response(None, status_code=204)


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
