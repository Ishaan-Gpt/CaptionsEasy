"""Project repository. Source: contracts/database.md > projects"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
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

    async def get_all_by_owner(
        self, owner_id: uuid.UUID, *, limit: int = 50, offset: int = 0
    ) -> tuple[list[Project], int]:
        """Returns (page of non-deleted projects, total count) for pagination.
        Source: contracts/api.md > GET /projects ("Returns paginated projects")."""
        base_filter = (Project.owner_id == owner_id, Project.deleted_at.is_(None))

        total = await self._db.execute(select(func.count()).select_from(Project).where(*base_filter))
        result = await self._db.execute(
            select(Project)
            .where(*base_filter)
            .order_by(Project.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total.scalar_one()

    async def update_fields(
        self,
        project: Project,
        *,
        title: str | None = None,
        description: str | None = None,
        status: str | None = None,
        thumbnail_url: str | None = None,
        style: str | None = None,
    ) -> Project:
        """Source: contracts/api.md > PATCH /projects/{id} (Rename / Archive / Favorite)."""
        if title is not None:
            project.title = title
        if description is not None:
            project.description = description
        if status is not None:
            project.status = status
        if thumbnail_url is not None:
            project.thumbnail_url = thumbnail_url
        if style is not None:
            project.style = style
        await self._db.commit()
        await self._db.refresh(project)
        return project

    async def soft_delete(self, project: Project) -> Project:
        project.deleted_at = datetime.now(timezone.utc)
        await self._db.commit()
        await self._db.refresh(project)
        return project
