"""project transcription language

Lets a project pin a spoken-language hint (ISO-639-1) for Whisper
transcription instead of always auto-detecting. None keeps today's
auto-detect behavior.

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("language", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "language")
