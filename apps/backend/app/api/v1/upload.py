"""Upload endpoints. Source: contracts/api.md > Upload

POST /projects/{id}/upload   — multipart upload.
GET  /projects/{id}/upload/status — current upload/metadata-extraction status.

api.md's documented response for the upload endpoint is
`{ "videoId": "", "status": "UPLOADED" }`. This sprint's brief explicitly
requires returning a Job ID to the frontend (Upload Flow > "Return Job ID"),
so `jobId` is included alongside the documented fields rather than inventing
a new endpoint.
"""

from fastapi import APIRouter, Depends, UploadFile

from app.core.config import Settings, get_settings
from app.core.errors import NotFoundError
from app.core.responses import success_response
from app.db.models.project import Project
from app.services.job_repository import JobRepository
from app.services.upload_service import METADATA_EXTRACTION_JOB_TYPE, UploadService
from app.services.video_repository import VideoRepository
from app.storage.base import StorageClient
from app.storage.dependencies import get_storage_client
from app.worker.dispatcher import JobDispatcherProtocol

from .deps import get_job_dispatcher, get_job_repository, get_owned_project, get_video_repository

router = APIRouter(tags=["upload"])


def get_upload_service(
    storage_client: StorageClient = Depends(get_storage_client),
    video_repository: VideoRepository = Depends(get_video_repository),
    job_repository: JobRepository = Depends(get_job_repository),
    settings: Settings = Depends(get_settings),
) -> UploadService:
    return UploadService(
        storage_client=storage_client,
        video_repository=video_repository,
        job_repository=job_repository,
        settings=settings,
    )


@router.post("/projects/{project_id}/upload", status_code=202)
async def upload_video(
    file: UploadFile,
    project: Project = Depends(get_owned_project),
    upload_service: UploadService = Depends(get_upload_service),
    job_dispatcher: JobDispatcherProtocol = Depends(get_job_dispatcher),
):
    content = await file.read()
    result = await upload_service.upload_video(
        project=project,
        filename=file.filename or "",
        content_type=file.content_type or "",
        content=content,
    )
    # Sprint 1.3: dispatch the queued metadata-extraction job to the
    # background worker (dummy stages only — see app.worker.stages).
    job_dispatcher.dispatch(str(result.job.id))
    return success_response(
        {
            "videoId": str(result.video.id),
            "jobId": str(result.job.id),
            "status": "UPLOADED",
        },
        status_code=202,
    )


@router.get("/projects/{project_id}/upload/status")
async def get_upload_status(
    project: Project = Depends(get_owned_project),
    job_repository: JobRepository = Depends(get_job_repository),
):
    job = await job_repository.get_latest_for_project(
        project.id, job_type=METADATA_EXTRACTION_JOB_TYPE
    )
    if job is None:
        raise NotFoundError("No upload found for this project.")

    return success_response(
        {
            "jobId": str(job.id),
            "status": job.status.value.upper(),
            "progress": job.progress or 0,
        }
    )
