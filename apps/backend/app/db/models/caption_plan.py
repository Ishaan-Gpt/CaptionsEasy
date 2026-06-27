import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class CaptionPlan(UUIDPKMixin, TimestampMixin, Base):
    """contracts/database.md > caption_plans — caption segmentation.

    Contains caption_json. Every caption references timestamps.
    No rendering information.
    """

    __tablename__ = "caption_plans"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    caption_json: Mapped[dict] = mapped_column(JSONB, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="caption_plans")  # noqa: F821
