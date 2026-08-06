"""persist custom caption styles on the project row, not a shared disk file

save_custom_style (app.api.v1.projects) used to write each project's
"Custom <title>" preset into apps/backend/app/render/presets.json on the
container's local disk. On Render that disk is rebuilt from the git image
on every deploy — with auto-deploy on for every push to main, any custom
template a user built through the live site was silently wiped by the very
next unrelated commit. Storing it on the project row itself makes it as
durable as every other project field.

Revision ID: 0008
Revises: 0007
Create Date: 2026-08-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "custom_style_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "custom_style_json")
