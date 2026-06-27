"""style presets and exports columns

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-27
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add style to projects
    op.add_column("projects", sa.Column("style", sa.String(), nullable=True))
    
    # Add new fields to exports
    op.add_column("exports", sa.Column("style", sa.String(), nullable=True))
    op.add_column("exports", sa.Column("duration_ms", sa.Integer(), nullable=True))
    op.add_column("exports", sa.Column("file_size", sa.Integer(), nullable=True))
    op.add_column("exports", sa.Column("status", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("exports", "status")
    op.drop_column("exports", "file_size")
    op.drop_column("exports", "duration_ms")
    op.drop_column("exports", "style")
    op.drop_column("projects", "style")
