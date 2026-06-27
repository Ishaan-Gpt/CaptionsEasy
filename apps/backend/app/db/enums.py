"""Enum definitions for MotionAI database layer.

Source of truth: contracts/database.md
Only the `jobs.status` enum is explicitly defined in that document.
Every other enum-shaped field (project.status, exports.resolution,
exports.quality, jobs.job_type) has no enumerated values in
contracts/database.md, so it is left as a plain string column with a
TODO instead of inventing values.
"""

import enum


class JobStatus(str, enum.Enum):
    """contracts/database.md > jobs > Status Enum"""

    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
