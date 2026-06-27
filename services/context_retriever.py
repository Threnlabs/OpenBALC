"""
services/context_retriever.py
────────────────────────────────────────────────────────────────────────────
Context retriever — semantic search over public OpenBALC modules stored in
Redis Cloud (RediSearch + Vector), via the context-surfaces agent.

Two use cases:
  1. AI chat pre-processing: fetch relevant modules before calling Gemini
  2. Admin sync: push Supabase public modules into the Redis surface

Usage:
    from services.context_retriever import search_modules, sync_module

    # In the chat handler, before calling Gemini:
    relevant = await search_modules("what is neural network backpropagation")
    context_block = format_modules_as_context(relevant)

    # When a module is published:
    await sync_module(module_dict)
"""

import os
import httpx
from typing import Optional

# ── context-surfaces agent credentials (Redis Cloud backed) ──────────────────
AGENT_URL = os.environ.get("CONTEXT_SURFACES_AGENT_URL", "https://api.context.surfaces.dev")
AGENT_KEY = os.environ.get("CONTEXT_SURFACES_RETRIEVER_AGENT_KEY", "")

HEADERS = {
    "Content-Type": "application/json",
    "X-Agent-Key": AGENT_KEY,
}

# ── Low-level ─────────────────────────────────────────────────────────────────

async def _call_tool(tool: str, args: dict) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{AGENT_URL}/tools/call",
            headers=HEADERS,
            json={"tool": tool, "args": args},
        )
        resp.raise_for_status()
        return resp.json()


# ── Search ────────────────────────────────────────────────────────────────────

async def search_modules(
    query: str,
    limit: int = 3,
    subject: Optional[str] = None,
    fields: Optional[list[str]] = None,
    domains: Optional[list[str]] = None,
) -> list[dict]:
    """
    Semantic text search over public modules in Redis.

    Args:
        query:   Natural language search string (e.g. user's chat message)
        limit:   Max number of results (default: 3, to keep context window lean)
        subject: Optional filter by subject tag
        fields:  Optional filter by field tags
        domains: Optional filter by domain tags

    Returns:
        List of PublicModule dicts from Redis
    """
    args: dict = {"query": query, "limit": limit}
    if subject:
        args["subject"] = subject
    if fields:
        args["fields"] = fields
    if domains:
        args["domains"] = domains

    result = await _call_tool("search_publicmodule_by_text", args)
    return result.get("results", [])


async def search_modules_by_tag(
    tag: str,
    sort_by: str = "star_count",
    limit: int = 5,
) -> list[dict]:
    """
    Tag-based module search — useful for browsing by domain or field.
    """
    result = await _call_tool("search_publicmodule_by_tag", {
        "tag": tag,
        "sort_by": sort_by,
        "limit": limit,
    })
    return result.get("results", [])


def format_modules_as_context(modules: list[dict]) -> str:
    """
    Format retrieved modules into a concise context block for the LLM system prompt.

    Example output:
        Relevant modules in the knowledge base:
          [1] Machine Learning Fundamentals (⭐ 42) — Basic ML concepts...
          [2] Neural Networks Deep Dive (⭐ 18) — Covers backprop, CNNs...
    """
    if not modules:
        return ""

    lines = ["Relevant modules in the knowledge base:"]
    for i, m in enumerate(modules, 1):
        stars = m.get("star_count", 0)
        title = m.get("title", "Untitled")
        desc  = m.get("description", "")[:120]
        suffix = "..." if len(m.get("description", "")) > 120 else ""
        lines.append(f"  [{i}] {title} (⭐ {stars}) — {desc}{suffix}")

    return "\n".join(lines)


# ── Sync (write) ──────────────────────────────────────────────────────────────

async def sync_module(module: dict) -> dict:
    """
    Push / upsert a single module into the Redis surface.
    Call this when a module is published or updated.
    """
    return await _call_tool("create_publicmodule", {
        "id":            module["id"],
        "title":         module.get("title", ""),
        "description":   module.get("description", ""),
        "subject":       module.get("subject", ""),
        "fields":        module.get("fields", []),
        "domains":       module.get("domains", []),
        "tags":          module.get("tags", []),
        "star_count":    module.get("star_count", 0),
        "chapter_count": module.get("chapter_count", 0),
        "use_count":     module.get("use_count", 0),
        "created_at":    module.get("created_at", ""),
    })


async def delete_module(module_id: int) -> dict:
    """
    Remove a module from the Redis surface (e.g. when unpublished).
    """
    return await _call_tool("delete_publicmodule", {"id": module_id})
