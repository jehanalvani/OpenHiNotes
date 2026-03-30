from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
import uuid
from datetime import datetime
from app.database import Base


class Summary(Base):
    """Summary model for generated transcription summaries."""

    __tablename__ = "summaries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    transcription_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("transcriptions.id"), nullable=False, index=True
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("summary_templates.id"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    transcription: Mapped["Transcription"] = relationship(foreign_keys=[transcription_id])
    template: Mapped["SummaryTemplate"] = relationship(foreign_keys=[template_id])

    def __repr__(self) -> str:
        return f"<Summary(id={self.id}, transcription_id={self.transcription_id})>"
