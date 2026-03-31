from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime


class SummaryCreate(BaseModel):
    """Schema for creating a summary."""
    transcription_id: uuid.UUID
    template_id: Optional[uuid.UUID] = None
    custom_prompt: Optional[str] = None


class SummaryResponse(BaseModel):
    """Schema for summary response."""
    id: uuid.UUID
    transcription_id: uuid.UUID
    template_id: Optional[uuid.UUID] = None
    content: str
    model_used: str
    created_at: datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}
