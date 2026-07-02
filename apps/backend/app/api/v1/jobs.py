"""Job status endpoint. Source: contracts/api.md > AI Processing

GET /jobs/{id} -> { "progress": 42, "stage": "Speech Analysis" }

`stage` comes from the live Redis progress cache (app.worker.progress) when
available — the `jobs` table has no stage column (contracts/database.md).
If the cache has expired (e.g. job finished a while ago), `stage` falls back
to the persisted status.
"""

from fastapi import APIRouter, Depends

from app.core.responses import success_response
from app.db.models.job import Job
from app.worker.types import ProgressReporterProtocol

from .deps import get_owned_job, get_progress_reporter

router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}")
async def get_job_status(
    job: Job = Depends(get_owned_job),
    progress_reporter: ProgressReporterProtocol = Depends(get_progress_reporter),
):
    live_progress = progress_reporter.get_progress(str(job.id))

    if live_progress is not None:
        return success_response(
            {
                "progress": live_progress["percentage"],
                "stage": live_progress["stage"],
                "estimated_remaining_ms": live_progress["estimated_remaining_ms"],
                "error_message": job.error_message,
            }
        )

    return success_response(
        {
            "progress": job.progress or 0,
            "stage": job.status.value,
            "estimated_remaining_ms": None,
            "error_message": job.error_message,
        }
    )
