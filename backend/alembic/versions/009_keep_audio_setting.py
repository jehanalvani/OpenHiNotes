"""Add keep_audio_enabled admin setting

Revision ID: 009_keep_audio_setting
Revises: 008_transcription_queue
Create Date: 2026-04-05
"""
from alembic import op

revision = "009_keep_audio_setting"
down_revision = "008_transcription_queue"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        INSERT INTO app_settings (key, value, description, updated_at)
        VALUES ('keep_audio_enabled', 'true', 'Allow users to keep audio files with their transcriptions', NOW())
        ON CONFLICT (key) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DELETE FROM app_settings WHERE key = 'keep_audio_enabled'")
