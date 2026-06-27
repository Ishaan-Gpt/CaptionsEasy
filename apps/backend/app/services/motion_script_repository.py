import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.motion_script import MotionScript

class MotionScriptRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_latest_for_project(self, project_id: uuid.UUID) -> MotionScript | None:
        result = await self._db.execute(
            select(MotionScript)
            .where(MotionScript.project_id == project_id)
            .order_by(MotionScript.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        project_id: uuid.UUID,
        motion_script_json: dict,
        version: int = 1,
    ) -> MotionScript:
        motion_script = MotionScript(
            project_id=project_id,
            motion_script_json=motion_script_json,
            version=version,
        )
        self._db.add(motion_script)
        await self._db.commit()
        await self._db.refresh(motion_script)
        return motion_script
