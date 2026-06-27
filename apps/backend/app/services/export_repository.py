import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.export import Export

class ExportRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, export_id: uuid.UUID) -> Export | None:
        result = await self._db.execute(
            select(Export).where(Export.id == export_id)
        )
        return result.scalar_one_or_none()

    async def get_all_by_project(self, project_id: uuid.UUID) -> list[Export]:
        result = await self._db.execute(
            select(Export)
            .where(Export.project_id == project_id)
            .order_by(Export.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        *,
        id: uuid.UUID | None = None,
        project_id: uuid.UUID,
        resolution: str | None = None,
        quality: str | None = None,
        storage_path: str | None = None,
        render_duration_ms: int | None = None,
        style: str | None = None,
        duration_ms: int | None = None,
        file_size: int | None = None,
        status: str | None = None,
    ) -> Export:
        export = Export(
            id=id or uuid.uuid4(),
            project_id=project_id,
            resolution=resolution,
            quality=quality,
            storage_path=storage_path,
            render_duration_ms=render_duration_ms,
            style=style,
            duration_ms=duration_ms,
            file_size=file_size,
            status=status,
        )
        self._db.add(export)
        await self._db.commit()
        await self._db.refresh(export)
        return export
