import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class Transcript(UUIDPKMixin, TimestampMixin, Base):
    """contracts/database.md > transcripts — speech-to-text output.

    Structured JSON only. Never plain text.
    """

    __tablename__ = "transcripts"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language: Mapped[str | None] = mapped_column(String, nullable=True)
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript_json: Mapped[dict] = mapped_column(JSONB, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="transcripts")  # noqa: F821
