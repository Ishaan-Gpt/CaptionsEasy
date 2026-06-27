"""Project repository. Source: contracts/database.md > projects"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.project import Project


class ProjectRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, *, owner_id: uuid.UUID, title: str, description: str | None = None) -> Project:
        project = Project(owner_id=owner_id, title=title, description=description)
        self._db.add(project)
        await self._db.commit()
        await self._db.refresh(project)
        return project

    async def get_by_id(self, project_id: uuid.UUID) -> Project | None:
        result = await self._db.execute(
            select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_owned_by(self, project_id: uuid.UUID, owner_id: uuid.UUID) -> Project | None:
        result = await self._db.execute(
            select(Project).where(
                Project.id == project_id,
                Project.owner_id == owner_id,
                Project.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def update_status(self, project: Project, status: str) -> Project:
        project.status = status
        await self._db.commit()
        await self._db.refresh(project)
        return project
