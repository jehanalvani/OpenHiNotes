"""Add transcription queue fields, audio retention, and timestamps

Revision ID: 008_transcription_queue
Revises: 007_registration_controls
Create Date: 2026-04-04
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "008_transcription_queue"
down_revision = "007_registration_controls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new status value to transcriptionstatus enum
    op.execute("ALTER TYPE transcriptionstatus ADD VALUE IF NOT EXISTS 'queued'")

    # Add queue-related columns
    op.add_column(
        "transcriptions",
        sa.Column("queue_position", sa.Integer, nullable=True),
    )
    op.add_column(
        "transcriptions",
        sa.Column("progress", sa.Float, nullable=True),
    )
    op.add_column(
        "transcriptions",
        sa.Column("progress_stage", sa.String(50), nullable=True),
    )
    op.add_column(
        "transcriptions",
        sa.Column("queued_at", sa.DateTime, nullable=True),
    )
    op.add_column(
        "transcriptions",
        sa.Column("started_at", sa.DateTime, nullable=True),
    )
    op.add_column(
        "transcriptions",
        sa.Column("completed_at", sa.DateTime, nullable=True),
    )

    # Audio retention columns
    op.add_column(
        "transcriptions",
        sa.Column("keep_audio", sa.Boolean, nullable=False, server_default="false"),
    )
    op.add_column(
        "transcriptions",
        sa.Column("audio_available", sa.Boolean, nullable=False, server_default="true"),
    )


def downgrade() -> None:
    # Drop the new columns
    op.drop_column("transcriptions", "audio_available")
    op.drop_column("transcriptions", "keep_audio")
    op.drop_column("transcriptions", "completed_at")
    op.drop_column("transcriptions", "started_at")
    op.drop_column("transcriptions", "queued_at")
    op.drop_column("transcriptions", "progress_stage")
    op.drop_column("transcriptions", "progress")
    op.drop_column("transcriptions", "queue_position")

    # Note: We cannot easily remove the 'queued' value from the PostgreSQL enum
    # once it's added, so we leave it in place. Future migrations can handle cleanup.
