"""Video repository. Source: contracts/database.md > videos"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.video import Video


class VideoRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        *,
        project_id: uuid.UUID,
        storage_path: str,
        file_size: int,
    ) -> Video:
        video = Video(project_id=project_id, storage_path=storage_path, file_size=file_size)
        self._db.add(video)
        await self._db.commit()
        await self._db.refresh(video)
        return video

    async def get_latest_for_project(self, project_id: uuid.UUID) -> Video | None:
        result = await self._db.execute(
            select(Video)
            .where(Video.project_id == project_id)
            .order_by(Video.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
