import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.creative_plan import CreativePlan

class CreativePlanRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_latest_for_project(self, project_id: uuid.UUID) -> CreativePlan | None:
        result = await self._db.execute(
            select(CreativePlan)
            .where(CreativePlan.project_id == project_id)
            .order_by(CreativePlan.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        project_id: uuid.UUID,
        creative_plan_json: dict,
    ) -> CreativePlan:
        creative_plan = CreativePlan(
            project_id=project_id,
            creative_plan=creative_plan_json,
        )
        self._db.add(creative_plan)
        await self._db.commit()
        await self._db.refresh(creative_plan)
        return creative_plan
