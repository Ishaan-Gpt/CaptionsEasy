import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.caption_plan import CaptionPlan

class CaptionPlanRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_latest_for_project(self, project_id: uuid.UUID) -> CaptionPlan | None:
        result = await self._db.execute(
            select(CaptionPlan)
            .where(CaptionPlan.project_id == project_id)
            .order_by(CaptionPlan.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        project_id: uuid.UUID,
        caption_json: dict,
    ) -> CaptionPlan:
        caption_plan = CaptionPlan(
            project_id=project_id,
            caption_json=caption_json,
        )
        self._db.add(caption_plan)
        await self._db.commit()
        await self._db.refresh(caption_plan)
        return caption_plan
