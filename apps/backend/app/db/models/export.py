import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class Export(UUIDPKMixin, TimestampMixin, Base):
    """contracts/database.md > exports — rendered videos."""

    __tablename__ = "exports"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # TODO(database.md): resolution/quality have no enumerated values
    # in the contract (api.md shows examples like "1080p" / "high",
    # but database.md does not define them as an enum).
    resolution: Mapped[str | None] = mapped_column(String, nullable=True)
    quality: Mapped[str | None] = mapped_column(String, nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String, nullable=True)
    render_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    style: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str | None] = mapped_column(String, nullable=True)

    project: Mapped["Project"] = relationship(back_populates="exports")  # noqa: F821
