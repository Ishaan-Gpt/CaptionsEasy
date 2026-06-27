import uuid

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class MotionScript(UUIDPKMixin, TimestampMixin, Base):
    """contracts/database.md > motion_scripts — primary AI output.

    Contains motion_script_json, version. Becomes the renderer input.
    No FFmpeg commands stored here.
    """

    __tablename__ = "motion_scripts"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    motion_script_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    version: Mapped[int | None] = mapped_column(Integer, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="motion_scripts")  # noqa: F821
