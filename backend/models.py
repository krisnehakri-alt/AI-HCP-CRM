from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum

class SourceEnum(str, enum.Enum):
    form = "form"
    chat = "chat"

class HCP(Base):
    __tablename__ = "hcps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    specialty = Column(String(255))
    hospital = Column(String(255))
    
    interactions = relationship("Interaction", back_populates="hcp")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_id = Column(Integer, ForeignKey("hcps.id"), nullable=True)
    hcp_name = Column(String(255), nullable=True)
    interaction_type = Column(String(100))
    date = Column(String(50))
    time = Column(String(50))
    attendees = Column(String(255))
    topics_discussed = Column(Text)
    materials_shared = Column(Text)
    samples_distributed = Column(Text)
    sentiment = Column(String(50))
    outcomes = Column(Text)
    follow_up_actions = Column(Text)
    ai_suggested_follow_ups = Column(Text)
    source = Column(Enum(SourceEnum), default=SourceEnum.form)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    hcp = relationship("HCP", back_populates="interactions")
