"""Usage endpoint. Source: contracts/api.md > Usage ("GET /usage" returns
Credits, Uploads, Exports, Storage).

There is no billing/plan system wired up yet (no payment provider
configured) — "credits" has no real source of truth, so it is returned as
`null` rather than a fabricated number. Uploads/exports/storage are real
counts computed from the owner's own projects.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_profile
from app.core.responses import success_response
from app.db.models.export import Export
from app.db.models.profile import Profile
from app.db.models.project import Project
from app.db.models.video import Video
from app.db.session import get_db

router = APIRouter(tags=["usage"])


@router.get("/usage")
async def get_usage(
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    owned_project_ids = select(Project.id).where(Project.owner_id == profile.id)

    uploads_count, uploads_bytes = (
        await db.execute(
            select(func.count(Video.id), func.coalesce(func.sum(Video.file_size), 0)).where(
                Video.project_id.in_(owned_project_ids)
            )
        )
    ).one()

    exports_count, exports_bytes = (
        await db.execute(
            select(func.count(Export.id), func.coalesce(func.sum(Export.file_size), 0)).where(
                Export.project_id.in_(owned_project_ids)
            )
        )
    ).one()

    return success_response(
        {
            "credits": None,
            "uploads": uploads_count,
            "exports": exports_count,
            "storage_bytes": int(uploads_bytes) + int(exports_bytes),
        }
    )
