import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class Project(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, Base):
    """contracts/database.md > projects — one editing workspace."""

    __tablename__ = "projects"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # TODO(database.md): no enum values defined for project status.
    # Left as free-form text until contracts/database.md enumerates them.
    status: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String, nullable=True)
    style: Mapped[str | None] = mapped_column(String, nullable=True)
    caption_template: Mapped[str | None] = mapped_column(String, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Sparse map of {"<start_ms_bucket>": {"box": {...}}} — per-caption-card
    # bounding-box overrides, keyed by the card's own start_ms (the most
    # durable anchor available; evt-N timeline IDs are NOT stable across
    # MotionScript regenerations, see docs/REMOTION_REVAMP_HANDOFF.md
    # Phase C). Deliberately its own column, not folded into `style`
    # (CustomStyleRequest/presets.json is a full-replace blob — an
    # unrelated style save would silently wipe a sparse map stored there).
    fragment_overrides_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    owner: Mapped["Profile"] = relationship(back_populates="projects")  # noqa: F821
    videos: Mapped[list["Video"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
    )
    jobs: Mapped[list["Job"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
    )
    transcripts: Mapped[list["Transcript"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
    )
    creative_plans: Mapped[list["CreativePlan"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
    )
    caption_plans: Mapped[list["CaptionPlan"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
    )
    motion_scripts: Mapped[list["MotionScript"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
    )
    exports: Mapped[list["Export"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
    )
