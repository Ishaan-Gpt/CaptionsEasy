"""Shared Export-row builder.

Used by both the dormant Celery path (app.worker.render_stage) and the
local-worker callback endpoint (app.api.v1.worker_callbacks) so a completed
render is persisted identically regardless of who rendered it.
"""

import uuid

from app.db.models.export import Export as ExportRow


def build_export_row(
    *,
    project_id,
    style_name: str | None,
    quality: str | None,
    width: int | None,
    height: int | None,
    render_duration_ms: int | None,
    duration_s: float | None,
    size_bytes: int | None,
    storage_path: str,
    export_id: uuid.UUID | None = None,
) -> ExportRow:
    return ExportRow(
        id=export_id or uuid.uuid4(),
        project_id=project_id,
        resolution=f"{width or 1080}x{height or 1920}",
        quality=quality or "high",
        storage_path=storage_path,
        render_duration_ms=render_duration_ms or 0,
        style=style_name or "minimal",
        duration_ms=int((duration_s or 0.0) * 1000),
        file_size=size_bytes or 0,
        status="completed",
    )
