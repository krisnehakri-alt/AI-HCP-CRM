# AI-First CRM — HCP Module

A premium, full-stack conceptual AI-first CRM designed for pharmaceutical field representatives to log interactions with Healthcare Professionals (HCPs). It features a polished, enterprise-ready UI with two ways to log data: a structured form or an intelligent conversational chat panel powered by LangGraph.

## Architecture

- **Frontend**: React + Vite + Redux Toolkit. Uses Vanilla CSS with CSS variables to achieve a modern, crisp B2B SaaS design system (Google Inter font, semantic colors, and micro-interactions).
- **Backend**: Python + FastAPI + SQLAlchemy + SQLite (configurable to MySQL/Postgres).
- **AI Agent Framework**: LangGraph running ReAct loop with a stateful conversation memory.
- **LLM**: Groq API (Defaulting to `gemma2-9b-it`, with optional `llama-3.3-70b-versatile` support).

## LangGraph Agent & Tools

The agent resides in `backend/agent.py`. It uses a `StateGraph` to act as the assistant behind the chat panel. It reads natural language, extracts structured interaction details into the form (via live JSON extraction), and can invoke specific tools before finally persisting the record.

**The 5 integrated tools:**
1. `search_hcp(name)`: Looks up an HCP in the SQLite DB by name and returns their specialty/hospital. Maps to the "HCP Name" form field.
2. `summarize_voice_note(raw_transcript)`: Condenses raw dictated text into concise bullet points. Used by the "Summarize from Voice Note" button.
3. `suggest_follow_ups(topics_discussed, sentiment, outcomes)`: Proposes 2-4 actionable follow-ups based on the conversation tone. Maps to the "AI Suggested Follow-ups" panel.
4. `check_sample_compliance(materials_shared, samples_distributed)`: A compliance check that flags if too many samples are given out. Maps to the materials/samples section.
5. `log_interaction(...)`: A marker tool called when the agent confirms the user wants to persist the finalized record. It triggers the backend to save the data to the SQLite DB.

## Setup & Run Instructions

### 1. Backend

1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Configure environment variables in `backend/.env`:
   ```
   GROQ_API_KEY=your_actual_groq_api_key_here
   # Optional: Set PRIMARY_MODEL to llama-3.3-70b-versatile for advanced reasoning
   # PRIMARY_MODEL=llama-3.3-70b-versatile
   # Optional: To use Postgres/MySQL, uncomment and change DATABASE_URL
   # DATABASE_URL=postgresql://user:password@localhost/dbname
   ```
6. Run the FastAPI server: `uvicorn main:app --reload`
   - Note: The SQLite database (`hcp_crm.db`) is automatically created and seeded with 3 mock doctors upon the first startup.

### 2. Frontend

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`
4. Open your browser to the local URL provided by Vite (usually `http://localhost:5173`).
