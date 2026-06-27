import uuid

from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin

# Supabase manages `auth.users` itself — we never create/migrate it. But
# `profiles.auth_user_id`'s ForeignKey("auth.users.id") needs *some* Table
# object registered on this Base's MetaData, or SQLAlchemy's unit-of-work
# table-sort (run on every flush, not just ours) raises NoReferencedTableError
# the first time a Profile is inserted. This stub exists purely so that
# resolution succeeds; Alembic never touches it (no create/drop migration
# references this Table) since the real table already exists in Supabase's
# `auth` schema.
auth_users_table = Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
)


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
