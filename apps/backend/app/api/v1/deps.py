"""Shared FastAPI dependencies for v1 routes."""

import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_profile
from app.core.config import Settings, get_settings
from app.core.errors import ForbiddenError, NotFoundError
from app.db.models.job import Job
from app.db.models.profile import Profile
from app.db.models.project import Project
from app.db.session import get_db
from app.services.job_repository import JobRepository
from app.services.project_repository import ProjectRepository
from app.services.video_repository import VideoRepository
from app.worker.dispatcher import CeleryJobDispatcher, JobDispatcherProtocol
from app.worker.progress import RedisProgressReporter
from app.worker.redis_client import get_redis_client
from app.worker.types import ProgressReporterProtocol


def get_project_repository(db: AsyncSession = Depends(get_db)) -> ProjectRepository:
    return ProjectRepository(db)


def get_job_repository(db: AsyncSession = Depends(get_db)) -> JobRepository:
    return JobRepository(db)


def get_video_repository(db: AsyncSession = Depends(get_db)) -> VideoRepository:
    return VideoRepository(db)


_job_dispatcher = CeleryJobDispatcher()


def get_job_dispatcher() -> JobDispatcherProtocol:
    return _job_dispatcher


def get_progress_reporter(settings: Settings = Depends(get_settings)) -> ProgressReporterProtocol:
    return RedisProgressReporter(
        get_redis_client(settings), ttl_seconds=settings.job_progress_ttl_seconds
    )


async def get_owned_project(
    project_id: uuid.UUID,
    profile: Profile = Depends(get_current_profile),
    project_repository: ProjectRepository = Depends(get_project_repository),
) -> Project:
    """Resolves a project the current profile owns. Source: database.md > RLS
    ("Every authenticated user may access only their own records.")."""
    project = await project_repository.get_by_id(project_id)
    if project is None:
        raise NotFoundError("Project not found.")
    if project.owner_id != profile.id:
        raise ForbiddenError("You do not have access to this project.")
    return project


async def get_owned_job(
    job_id: uuid.UUID,
    profile: Profile = Depends(get_current_profile),
    job_repository: JobRepository = Depends(get_job_repository),
    project_repository: ProjectRepository = Depends(get_project_repository),
) -> Job:
    """Resolves a job whose project the current profile owns. Source:
    contracts/api.md > GET /jobs/{id}; database.md > RLS."""
    job = await job_repository.get_by_id(job_id)
    if job is None:
        raise NotFoundError("Job not found.")
    project = await project_repository.get_by_id(job.project_id)
    if project is None or project.owner_id != profile.id:
        raise ForbiddenError("You do not have access to this job.")
    return job
