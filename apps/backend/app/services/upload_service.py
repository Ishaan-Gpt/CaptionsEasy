"""Upload service. Source: Sprint 1.2 Upload Flow.

Validate -> Store in Supabase Storage -> Insert Video record -> Create Job ->
Return (Video, Job). No AI processing is triggered here. The job created is
metadata-extraction (docs/ROADMAP.md > Phase 4 "Metadata Extraction"), not
the AI pipeline job from contracts/ai.md (that is /projects/{id}/process,
out of scope for this sprint).
"""

import logging
import uuid
from dataclasses import dataclass

from app.core.config import Settings
from app.db.models.job import Job
from app.db.models.project import Project
from app.db.models.video import Video
from app.services.job_repository import JobRepository
from app.services.upload_validation import validate_upload
from app.services.video_repository import VideoRepository
from app.storage.base import StorageClient

logger = logging.getLogger("motionai.upload")

# Not in contracts/database.md's (undefined) job_type enum — chosen to be
# distinct from the AI pipeline's own stage names in contracts/ai.md.
METADATA_EXTRACTION_JOB_TYPE = "video_metadata_extraction"


@dataclass(frozen=True)
class UploadResult:
    video: Video
    job: Job


class UploadService:
    def __init__(
        self,
        *,
        storage_client: StorageClient,
        video_repository: VideoRepository,
        job_repository: JobRepository,
        settings: Settings,
    ) -> None:
        self._storage = storage_client
        self._videos = video_repository
        self._jobs = job_repository
        self._settings = settings

    async def upload_video(
        self,
        *,
        project: Project,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> UploadResult:
        validate_upload(
            filename=filename,
            content_type=content_type,
            size_bytes=len(content),
            header_bytes=content[:16],
            settings=self._settings,
        )

        video_id = uuid.uuid4()
        extension = _extension_for(content_type)
        storage_path = f"projects/{project.id}/videos/{video_id}{extension}"

        await self._storage.upload(path=storage_path, content=content, content_type=content_type)

        video = await self._videos.create(
            project_id=project.id,
            storage_path=storage_path,
            file_size=len(content),
        )

        job = await self._jobs.create_queued(
            project_id=project.id,
            job_type=METADATA_EXTRACTION_JOB_TYPE,
        )

        logger.info(
            "upload_completed",
            extra={"project_id": str(project.id), "video_id": str(video.id), "job_id": str(job.id)},
        )

        return UploadResult(video=video, job=job)


def _extension_for(content_type: str) -> str:
    return {
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/webm": ".webm",
    }.get(content_type, "")
