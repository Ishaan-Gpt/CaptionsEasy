"""workers and worker_pairings (local-worker processing)

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False, server_default="My Computer"),
        sa.Column("worker_url", sa.String(), nullable=True),
        sa.Column("worker_token_hash", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="offline"),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["profiles.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_workers_owner_id", "workers", ["owner_id"])

    op.create_table(
        "worker_pairings",
        sa.Column("code", sa.String(), primary_key=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("worker_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("worker_name", sa.String(), nullable=False, server_default="My Computer"),
        sa.Column("worker_token_hash", sa.String(), nullable=False),
        sa.Column("worker_url", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["worker_id"], ["workers.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_worker_pairings_owner_id", "worker_pairings", ["owner_id"])
    op.create_index("ix_worker_pairings_expires_at", "worker_pairings", ["expires_at"])

    op.add_column("jobs", sa.Column("worker_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_jobs_worker_id", "jobs", "workers", ["worker_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("fk_jobs_worker_id", "jobs", type_="foreignkey")
    op.drop_column("jobs", "worker_id")
    op.drop_table("worker_pairings")
    op.drop_table("workers")
