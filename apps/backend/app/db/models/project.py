import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
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
