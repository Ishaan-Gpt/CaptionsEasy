import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class CreativePlan(UUIDPKMixin, TimestampMixin, Base):
    """contracts/database.md > creative_plans — high-level AI understanding.

    Contains: pacing, emotion, speaking_style, energy_curve, key_moments.
    Stored as JSON. database.md does not name a standalone column per field,
    so all of it lives inside `creative_plan` (JSONB), per the "JSON Columns"
    section of the contract.
    """

    __tablename__ = "creative_plans"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    creative_plan: Mapped[dict] = mapped_column(JSONB, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="creative_plans")  # noqa: F821
