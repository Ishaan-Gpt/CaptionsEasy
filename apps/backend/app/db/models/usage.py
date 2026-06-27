import uuid

from sqlalchemy import BigInteger, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class Usage(UUIDPKMixin, TimestampMixin, Base):
    """contracts/database.md > usage — track SaaS limits."""

    __tablename__ = "usage"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    uploads_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    renders_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    ai_tokens_used: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0, server_default="0")
    storage_used: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0, server_default="0")

    user: Mapped["Profile"] = relationship(back_populates="usage")  # noqa: F821
