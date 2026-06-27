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

from context_surfaces import UnifiedClient
from services.models.modules import PublicModule
from services import redis_client

# ── context-surfaces credentials (Redis Cloud backed) ──────────────────
AGENT_URL = os.environ.get("CONTEXT_SURFACES_AGENT_URL")
AGENT_KEY = os.environ.get("CONTEXT_SURFACES_RETRIEVER_AGENT_KEY", "")
ADMIN_KEY = os.environ.get("CONTEXT_SURFACES_ADMIN_KEY", "")
RETRIEVER_SURFACE_ID = os.environ.get("CONTEXT_SURFACES_RETRIEVER_SURFACE_ID", "")

# ── Low-level ─────────────────────────────────────────────────────────────────

async def _call_tool(tool: str, args: dict) -> dict:
    async with UnifiedClient(api_url=AGENT_URL) as client:
        res = await client.query_tool(
            agent_key=AGENT_KEY,
            tool_name=tool,
            arguments=args,
        )
        content = res.get("content", [])
        if content and content[0].get("type") == "text":
            import json
            text_val = content[0].get("text", "{}")
            try:
                return json.loads(text_val)
            except json.JSONDecodeError as e:
                print(f"DEBUG: JSONDecodeError parsing text: {repr(text_val)}")
                raise e
        return {}


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
    parts = []
    if subject:
        parts.append(f"@subject:{{{subject}}}")
    if fields:
        for f in fields:
            parts.append(f"@fields:{{{f}}}")
    if domains:
        for d in domains:
            parts.append(f"@domains:{{{d}}}")
    if query and query != "*":
        parts.append(query)

    redis_query = " ".join(parts) if parts else "*"
    result = await _call_tool("search_publicmodule_by_text", {
        "query": redis_query,
        "limit": limit,
    })
    return result.get("results", [])


async def search_modules_by_tag(
    tag: str,
    limit: int = 5,
) -> list[dict]:
    """
    Tag-based module search — useful for browsing by domain or field.
    """
    result = await _call_tool("filter_publicmodule_by_tags", {
        "value": tag,
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
    record = PublicModule(
        id=int(module["id"]),
        title=module.get("title", ""),
        description=module.get("description", ""),
        subject=module.get("subject", ""),
        fields=module.get("fields", []),
        domains=module.get("domains", []),
        tags=module.get("tags", []),
        star_count=module.get("star_count", 0),
        chapter_count=module.get("chapter_count", 0),
        use_count=module.get("use_count", 0),
        created_at=module.get("created_at", ""),
    )
    async with UnifiedClient(api_url=AGENT_URL) as client:
        res = await client.import_data(
            admin_key=ADMIN_KEY,
            context_surface_id=RETRIEVER_SURFACE_ID,
            records=[record],
        )
    if res.failed > 0:
        err_msg = res.errors[0].message if res.errors else "Unknown import error"
        raise RuntimeError(f"Failed to sync module to Redis surface: {err_msg}")
    return {"status": "success", "imported": res.imported}


async def delete_module(module_id: int) -> dict:
    """
    Remove a module from the Redis surface (e.g. when unpublished).
    """
    r = redis_client.get_redis()
    key = f"openbalc:module:{module_id}"
    deleted_count = r.delete(key)
    return {"status": "success", "deleted": deleted_count}
