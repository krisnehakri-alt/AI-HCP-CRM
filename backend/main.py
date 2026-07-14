import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

import models
import schemas
from database import engine, get_db
from agent import app as agent_app
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-First CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup if empty
@app.on_event("startup")
def on_startup():
    db = next(get_db())
    if db.query(models.HCP).count() == 0:
        mock_hcps = [
            models.HCP(name="Dr. Sarah Smith", specialty="Cardiology", hospital="City General"),
            models.HCP(name="Dr. James Wilson", specialty="Neurology", hospital="Mercy Hospital"),
            models.HCP(name="Dr. Emily Chen", specialty="Oncology", hospital="Memorial Sloan"),
        ]
        db.add_all(mock_hcps)
        db.commit()

@app.get("/api/hcps", response_model=List[schemas.HCP])
def search_hcps(query: str = "", db: Session = Depends(get_db)):
    if query:
        return db.query(models.HCP).filter(models.HCP.name.ilike(f"%{query}%")).all()
    return db.query(models.HCP).all()

@app.post("/api/interactions", response_model=schemas.Interaction)
def create_interaction(interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    db_interaction = models.Interaction(**interaction.model_dump())
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

@app.get("/api/interactions", response_model=List[schemas.Interaction])
def list_interactions(db: Session = Depends(get_db)):
    return db.query(models.Interaction).order_by(models.Interaction.created_at.desc()).all()

@app.post("/api/summarize")
def summarize_note(request: schemas.VoiceNoteRequest):
    from agent import summarize_voice_note
    try:
        # summarize_voice_note is a LangChain Tool, so we use .invoke()
        result = summarize_voice_note.invoke({"raw_transcript": request.raw_transcript})
        return {"summary": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=schemas.ChatResponse)
async def chat_endpoint(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    # Convert incoming dict messages to LangChain message objects
    lc_messages = []
    for msg in request.messages:
        if msg.role == "user":
            lc_messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            lc_messages.append(AIMessage(content=msg.content))
        else:
            # We don't expose tool messages to the frontend directly for simplicity
            pass

    # State for LangGraph
    state = {
        "messages": lc_messages,
        "extracted_fields": request.current_fields or {},
        "ready_to_log": False
    }

    # Run graph
    try:
        final_state = agent_app.invoke(state)
        
        # Extract the last message from agent
        reply_content = ""
        for m in reversed(final_state["messages"]):
            if isinstance(m, AIMessage) and m.content:
                reply_content = m.content
                break
                
        extracted = final_state.get("extracted_fields", {})
        ready_to_log = final_state.get("ready_to_log", False)
        interaction_id = None
        
        # If the agent hit the log_interaction tool, it means we should save to DB now
        if ready_to_log:
            # We use the extracted fields to create the record, marking source as chat
            interaction_data = schemas.InteractionCreate(
                **{k: v for k, v in extracted.items() if hasattr(schemas.InteractionCreate, k)},
                source=models.SourceEnum.chat
            )
            db_interaction = models.Interaction(**interaction_data.model_dump())
            db.add(db_interaction)
            db.commit()
            db.refresh(db_interaction)
            interaction_id = db_interaction.id
            reply_content += "\n\n✅ Interaction successfully logged to CRM."

        return schemas.ChatResponse(
            reply=reply_content,
            extracted_fields=extracted,
            logged=ready_to_log,
            interaction_id=interaction_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
