import os
import json
from typing import TypedDict, Annotated, Sequence, Any, Optional
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.tools import tool
import sqlite3
from dotenv import load_dotenv

load_dotenv()

# We need access to the db in tools, simplified with a direct connection for simplicity in agent context
DB_URL = os.getenv("DATABASE_URL", "sqlite:///./hcp_crm.db")
db_path = DB_URL.replace("sqlite:///", "")

# 1. Tool: search_hcp
@tool
def search_hcp(name: str) -> str:
    """Looks up an HCP by name against the territory/HCP list and returns specialty/hospital, or a not-found message."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, specialty, hospital FROM hcps WHERE name LIKE ?", (f"%{name}%",))
        results = cursor.fetchall()
        conn.close()
        
        if not results:
            return f"No HCP found matching '{name}'."
        
        formatted_results = [f"ID: {r[0]}, Name: {r[1]}, Specialty: {r[2]}, Hospital: {r[3]}" for r in results]
        return "Found HCP(s):\n" + "\n".join(formatted_results)
    except Exception as e:
        return f"Error searching HCP: {str(e)}"

# 2. Tool: summarize_voice_note
@tool
def summarize_voice_note(raw_transcript: str) -> str:
    """Condenses a long/raw voice-note transcript into a concise 'Topics Discussed' note."""
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    prompt = f"Summarize the following voice note transcript into a concise, professional 'Topics Discussed' note for a CRM. Extract key points.\n\nTranscript: {raw_transcript}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content

# 3. Tool: suggest_follow_ups
@tool
def suggest_follow_ups(topics_discussed: str, sentiment: str, outcomes: str) -> str:
    """Proposes 2-4 follow-up actions based on sentiment and topics."""
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.7)
    prompt = f"Based on the following interaction details, suggest 2-4 actionable follow-ups for a pharma sales rep. Keep them brief and bulleted.\nTopics: {topics_discussed}\nSentiment: {sentiment}\nOutcomes: {outcomes}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content

# 4. Tool: check_sample_compliance
@tool
def check_sample_compliance(materials_shared: str, samples_distributed: str) -> str:
    """Flags controlled materials or over-limit sample counts before logging."""
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    prompt = f"Act as a compliance checker. Review the following distributed items. Flag if more than 5 samples of any product are distributed, or if 'controlled' materials are shared without consent. If compliant, just return 'COMPLIANT'. Otherwise, list the compliance flags.\nMaterials: {materials_shared}\nSamples: {samples_distributed}"
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content

# 5. Tool: log_interaction
@tool
def log_interaction(
    hcp_name: str,
    interaction_type: str,
    date: str,
    time: str,
    attendees: str,
    topics_discussed: str,
    materials_shared: str,
    samples_distributed: str,
    sentiment: str,
    outcomes: str,
    follow_up_actions: str,
    ai_suggested_follow_ups: str
) -> str:
    """Persists the finalized, rep-confirmed interaction record to the database."""
    # This tool is just a marker for the agent that it's ready to log.
    # The actual logging is handled in the API endpoint by reading the extracted fields.
    # The agent should ONLY call this if the user has EXPLICITLY confirmed they want to log the interaction.
    import json
    return json.dumps({
        "status": "ready_to_log",
        "data": {
            "hcp_name": hcp_name,
            "interaction_type": interaction_type,
            "date": date,
            "time": time,
            "attendees": attendees,
            "topics_discussed": topics_discussed,
            "materials_shared": materials_shared,
            "samples_distributed": samples_distributed,
            "sentiment": sentiment,
            "outcomes": outcomes,
            "follow_up_actions": follow_up_actions,
            "ai_suggested_follow_ups": ai_suggested_follow_ups
        }
    })

tools = [search_hcp, summarize_voice_note, suggest_follow_ups, check_sample_compliance, log_interaction]
tools_by_name = {tool.name: tool for tool in tools}

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    extracted_fields: dict
    ready_to_log: bool

def parse_extracted_fields(messages: Sequence[BaseMessage]) -> dict:
    # Use LLM to extract the current state of fields based on the conversation history
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
    
    # We create a specific prompt to extract JSON
    sys_prompt = """Extract the current state of the interaction form fields from the conversation.
    Return ONLY a JSON object with these keys (use null if not known):
    hcp_name, interaction_type, date, time, attendees, topics_discussed, materials_shared, samples_distributed, sentiment, outcomes, follow_up_actions, ai_suggested_follow_ups.
    Do not wrap in markdown blocks, just return raw JSON."""
    
    # Only send a subset of history to avoid context limits if needed, but for this demo, full is ok
    conversation = "\n".join([f"{'User' if isinstance(m, HumanMessage) else 'Assistant'}: {m.content}" for m in messages if isinstance(m, (HumanMessage, AIMessage))])
    
    try:
        response = llm.invoke([SystemMessage(content=sys_prompt), HumanMessage(content=conversation)])
        content = response.content.replace("```json", "").replace("```", "").strip()
        fields = json.loads(content)
        return fields
    except Exception as e:
        print(f"Error extracting fields: {e}")
        return {}

def should_continue(state: AgentState) -> str:
    messages = state['messages']
    last_message = messages[-1]
    
    if "ready_to_log" in last_message.content and '"status"' in last_message.content:
         return "end"
         
    if not last_message.tool_calls:
        return "end"
        
    return "continue"

def call_model(state: AgentState):
    messages = state['messages']
    extracted = state.get('extracted_fields', {})
    
    model = os.getenv("PRIMARY_MODEL", "llama-3.1-8b-instant")
    # If a reasoning-heavy task is detected or configured, we could switch to llama-3.3-70b-versatile
    # For now we use the primary model.
    llm = ChatGroq(model=model, temperature=0).bind_tools(tools)
    
    system_prompt = f"""You are an AI assistant helping a pharma sales rep log an interaction with a Healthcare Professional (HCP).
Your goal is to extract details from the user's natural language input and fill out a structured form.

Current extracted fields:
{json.dumps(extracted, indent=2)}

Instructions:
1. Extract relevant information from the user's messages to update the form fields.
2. Use tools like `search_hcp` to find doctors, `suggest_follow_ups` if sentiment and topics are known, etc.
3. If you have enough information, present a short structured summary back to the rep and ASK FOR CONFIRMATION to log it.
4. NEVER call `log_interaction` until the user EXPLICITLY says "yes", "log it", or confirms the summary.
5. If the user asks to summarize a voice note, use `summarize_voice_note`.
6. Be concise and professional.
"""
    
    response = llm.invoke([SystemMessage(content=system_prompt)] + messages)
    
    # After LLM responds, we also run the extraction (in parallel or sequentially)
    # to keep the frontend form updated live.
    new_fields = parse_extracted_fields(messages + [response])
    
    return {"messages": [response], "extracted_fields": new_fields}

def call_tool(state: AgentState):
    messages = state['messages']
    last_message = messages[-1]
    
    tool_messages = []
    ready_to_log = False
    
    for tc in last_message.tool_calls:
        tool_instance = tools_by_name.get(tc["name"])
        if tool_instance:
            try:
                response = tool_instance.invoke(tc["args"])
                content = str(response)
            except Exception as e:
                content = f"Error: {e}"
        else:
            content = f"Error: Tool {tc['name']} not found."
            
        tool_messages.append(ToolMessage(
            content=content,
            name=tc["name"],
            tool_call_id=tc["id"]
        ))
        if tc["name"] == "log_interaction":
            ready_to_log = True
            
    return {"messages": tool_messages, "ready_to_log": ready_to_log}

workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("action", call_tool)
workflow.set_entry_point("agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "continue": "action",
        "end": END
    }
)
workflow.add_edge("action", "agent")

app = workflow.compile()
