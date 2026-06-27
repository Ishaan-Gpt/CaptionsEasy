"""Job repository. Source: contracts/database.md > jobs

Creates jobs in `queued` state with `progress = 0`. This sprint never starts
a worker — see app.services.upload_service.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import JobStatus
from app.db.models.job import Job


class JobRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_queued(self, *, project_id: uuid.UUID, job_type: str) -> Job:
        job = Job(
            project_id=project_id,
            job_type=job_type,
            status=JobStatus.QUEUED,
            progress=0,
        )
        self._db.add(job)
        await self._db.commit()
        await self._db.refresh(job)
        return job

    async def get_by_id(self, job_id: uuid.UUID) -> Job | None:
        result = await self._db.execute(select(Job).where(Job.id == job_id))
        return result.scalar_one_or_none()

    async def get_latest_for_project(self, project_id: uuid.UUID, *, job_type: str) -> Job | None:
        result = await self._db.execute(
            select(Job)
            .where(Job.project_id == project_id, Job.job_type == job_type)
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
