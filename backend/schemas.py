from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from models import SourceEnum

class HCPBase(BaseModel):
    name: str
    specialty: Optional[str] = None
    hospital: Optional[str] = None

class HCPCreate(HCPBase):
    pass

class HCP(HCPBase):
    id: int

    class Config:
        from_attributes = True

class InteractionBase(BaseModel):
    hcp_id: Optional[int] = None
    hcp_name: Optional[str] = None
    interaction_type: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    samples_distributed: Optional[str] = None
    sentiment: Optional[str] = None
    outcomes: Optional[str] = None
    follow_up_actions: Optional[str] = None
    ai_suggested_follow_ups: Optional[str] = None
    source: SourceEnum = SourceEnum.form

class InteractionCreate(InteractionBase):
    pass

class Interaction(InteractionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    current_fields: Optional[dict] = {}

class ChatResponse(BaseModel):
    reply: str
    extracted_fields: dict
    logged: bool = False
    interaction_id: Optional[int] = None
