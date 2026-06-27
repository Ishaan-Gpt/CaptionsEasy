import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class Profile(UUIDPKMixin, TimestampMixin, Base):
    """contracts/database.md > profiles — public user information."""

    __tablename__ = "profiles"

    # Supabase-managed identity. References auth.users(id) (Supabase Auth schema).
    auth_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)

    projects: Mapped[list["Project"]] = relationship(  # noqa: F821
        back_populates="owner",
    )
    usage: Mapped["Usage"] = relationship(  # noqa: F821
        back_populates="user",
        uselist=False,
    )
