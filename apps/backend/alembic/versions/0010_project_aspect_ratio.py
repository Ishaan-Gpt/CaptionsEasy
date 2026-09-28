"""project export aspect ratio

Relays the studio's aspect-ratio selector from POST /export to the render
worker (see app.render.engine.RenderEngine.compute_crop) so the exported
video is cropped to match what the preview showed instead of always
rendering the full uncropped source frame.

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("aspect_ratio", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "aspect_ratio")
