"""store worker tokens in plaintext, not a one-way hash

The backend must present a worker's own token back to it when dispatching
jobs (POST .../jobs), which is impossible with only a one-way hash on
file — a one-way hash only supports verifying a token presented *to* the
backend (the worker's callback direction), not the backend authenticating
itself *to* the worker. Renaming rather than re-deriving: no real pairings
existed yet when this was caught (0006 shipped minutes earlier), so this
is a pure rename, not a backfill.

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-07
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("workers", "worker_token_hash", new_column_name="worker_token")
    op.alter_column("worker_pairings", "worker_token_hash", new_column_name="worker_token")


def downgrade() -> None:
    op.alter_column("workers", "worker_token", new_column_name="worker_token_hash")
    op.alter_column("worker_pairings", "worker_token", new_column_name="worker_token_hash")
