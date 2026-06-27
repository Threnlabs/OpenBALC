"""
services/agent_memory.py
────────────────────────────────────────────────────────────────────────────
Agent memory service — reads/writes ConversationMemory and UserLearningProfile
to Redis Cloud via context-surfaces.

This is called by:
  - The FastAPI service (after a conversation ends)
  - The chat handler (at session start, to retrieve context for personalisation)

Usage (from FastAPI endpoint):
    from services.agent_memory import save_conversation, get_user_context

    # After conversation ends:
    await save_conversation(conv_id, user_id, module_ids, summary, concepts)

    # At start of new conversation:
    context = await get_user_context(user_id)
"""

import os
import httpx
from typing import Optional

# ── context-surfaces agent credentials (Redis Cloud backed) ──────────────────
AGENT_URL = os.environ.get("CONTEXT_SURFACES_AGENT_URL", "https://api.context.surfaces.dev")
AGENT_KEY = os.environ.get("CONTEXT_SURFACES_MEMORY_AGENT_KEY", "")

HEADERS = {
    "Content-Type": "application/json",
    "X-Agent-Key": AGENT_KEY,
}

# ── Low-level tool caller ─────────────────────────────────────────────────────

async def _call_tool(tool: str, args: dict) -> dict:
    """Call a context-surfaces agent tool asynchronously."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{AGENT_URL}/tools/call",
            headers=HEADERS,
            json={"tool": tool, "args": args},
        )
        resp.raise_for_status()
        return resp.json()


# ── Public API ────────────────────────────────────────────────────────────────

async def save_conversation(
    conv_id: str,
    user_id: int,
    module_ids: list[int],
    summary: str,
    key_concepts: list[str],
    sentiment: str = "neutral",
    created_at: str = "",
) -> dict:
    """
    Persist a conversation memory entry to Redis Cloud.
    Call this after a conversation session ends.
    """
    from datetime import datetime, timezone
    return await _call_tool("create_conversationmemory", {
        "id": conv_id,
        "user_id": user_id,
        "module_ids": module_ids,
        "summary": summary,
        "key_concepts": key_concepts,
        "sentiment": sentiment,
        "created_at": created_at or datetime.now(timezone.utc).isoformat(),
    })


async def search_past_conversations(query: str, user_id: Optional[int] = None) -> list[dict]:
    """
    Semantic text search over ConversationMemory.
    Optionally filter to a specific user.
    """
    result = await _call_tool("search_conversationmemory_by_text", {
        "query": query,
        **({"user_id": user_id} if user_id is not None else {}),
    })
    return result.get("results", [])


async def get_user_profile(user_id: int) -> Optional[dict]:
    """
    Retrieve the UserLearningProfile for a user.
    Returns None if no profile exists yet.
    """
    result = await _call_tool("get_userlearningprofile", {"user_id": user_id})
    return result.get("result")


async def upsert_user_profile(
    user_id: int,
    strengths: list[str],
    weak_areas: list[str],
    recent_topics: list[str],
    preferred_style: str = "textual",
    total_conversations: int = 0,
    last_active_at: str = "",
) -> dict:
    """
    Create or update a UserLearningProfile.
    Call this after each conversation to keep the profile current.
    """
    from datetime import datetime, timezone
    return await _call_tool("create_userlearningprofile", {
        "user_id": user_id,
        "strengths": strengths,
        "weak_areas": weak_areas,
        "recent_topics": recent_topics,
        "preferred_style": preferred_style,
        "total_conversations": total_conversations,
        "last_active_at": last_active_at or datetime.now(timezone.utc).isoformat(),
    })


async def get_user_context(user_id: int, last_n_conversations: int = 3) -> str:
    """
    Build a concise context string to prepend to a new AI session.
    Combines the user's learning profile + recent conversation summaries.
    """
    profile = await get_user_profile(user_id)
    recent = await _call_tool("search_conversationmemory_by_text", {
        "query": "*",
        "user_id": user_id,
        "limit": last_n_conversations,
    })
    recent_convs = recent.get("results", [])

    lines = []

    if profile:
        if profile.get("strengths"):
            lines.append(f"User strengths: {', '.join(profile['strengths'])}")
        if profile.get("weak_areas"):
            lines.append(f"User struggles with: {', '.join(profile['weak_areas'])}")
        if profile.get("preferred_style"):
            lines.append(f"Preferred learning style: {profile['preferred_style']}")

    if recent_convs:
        lines.append("\nRecent conversation context:")
        for conv in recent_convs:
            lines.append(f"  - {conv.get('summary', '')}")

    return "\n".join(lines) if lines else ""
