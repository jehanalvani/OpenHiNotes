"""Add color column to collections

Revision ID: 005_add_collection_color
Revises: 004_add_collections
Create Date: 2026-04-01
"""
from alembic import op
import sqlalchemy as sa

revision = '005_add_collection_color'
down_revision = '004_add_collections'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('collections', sa.Column('color', sa.String(7), nullable=True))

def downgrade() -> None:
    op.drop_column('collections', 'color')
