"""Shared FastAPI dependencies for v1 routes."""

import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_profile
from app.core.errors import ForbiddenError, NotFoundError
from app.db.models.profile import Profile
from app.db.models.project import Project
from app.db.session import get_db
from app.services.job_repository import JobRepository
from app.services.project_repository import ProjectRepository
from app.services.video_repository import VideoRepository


def get_project_repository(db: AsyncSession = Depends(get_db)) -> ProjectRepository:
    return ProjectRepository(db)


def get_job_repository(db: AsyncSession = Depends(get_db)) -> JobRepository:
    return JobRepository(db)


def get_video_repository(db: AsyncSession = Depends(get_db)) -> VideoRepository:
    return VideoRepository(db)


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
