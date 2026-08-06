import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPKMixin


class Worker(UUIDPKMixin, TimestampMixin, Base):
    """A user's paired local processing worker (running on their machine)."""

    __tablename__ = "workers"

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False, default="My Computer")
    worker_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # Plaintext bearer token, shared secret between this worker and the
    # backend. Must be reversible/retrievable (not a one-way hash) because
    # the backend also presents it back to the worker's own /jobs endpoint
    # when dispatching — the DB is the trust boundary here (service-role
    # only, RLS denies direct user access), same as any server-held API key.
    worker_token: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="offline")
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner: Mapped["Profile"] = relationship()  # noqa: F821


class WorkerPairing(TimestampMixin, Base):
    """Short-lived pairing handshake between a local worker and a user."""

    __tablename__ = "worker_pairings"

    code: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    worker_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workers.id", ondelete="SET NULL"),
        nullable=True,
    )
    worker_name: Mapped[str] = mapped_column(String, nullable=False, default="My Computer")
    worker_token: Mapped[str] = mapped_column(String, nullable=False)
    worker_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
