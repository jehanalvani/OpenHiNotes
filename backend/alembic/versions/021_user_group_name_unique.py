"""Make user_groups.name globally unique (case-insensitive, whitespace-trimmed).

Normalizes existing names (trim, collapse whitespace), renames any
remaining case-insensitive duplicates with a " (N)" suffix, then
applies a unique index on lower(name) so future inserts can't collide
on case or trailing spaces.

Revision ID: 021_user_group_name_unique
Revises: 020_user_group_owner_policy
"""

import sqlalchemy as sa
from alembic import op

revision = "021_user_group_name_unique"
down_revision = "020_user_group_owner_policy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Normalize: trim and collapse internal whitespace runs
    op.execute(r"""
        UPDATE user_groups
        SET name = regexp_replace(btrim(name), '\s+', ' ', 'g')
        WHERE name <> regexp_replace(btrim(name), '\s+', ' ', 'g')
    """)

    # 2. Rename case-insensitive duplicates with " (N)" suffix
    op.execute("""
        WITH ranked AS (
            SELECT id, name,
                   ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at, id) AS rn
            FROM user_groups
        )
        UPDATE user_groups g
        SET name = g.name || ' (' || ranked.rn || ')'
        FROM ranked
        WHERE g.id = ranked.id AND ranked.rn > 1
    """)

    # 3. Functional unique index — case-insensitive
    op.execute("CREATE UNIQUE INDEX uq_user_groups_name_lower ON user_groups (lower(name))")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_user_groups_name_lower")
