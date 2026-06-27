"""
services/langcache.py
────────────────────────────────────────────────────────────────────────────
LangCache — semantic LLM response cache backed by Redis Cloud Vector Search.

Instead of caching by exact prompt string (like a normal KV cache), LangCache
finds semantically similar past prompts using cosine similarity. If a past
answer is close enough (score ≥ threshold), it returns the cached response
without calling the LLM at all.

This is the correct tool for this job because:
  - Exact string matching misses near-identical questions
  - Redis Vector Search runs the similarity check server-side in sub-millisecond
  - Saves Gemini API credits on repeated/similar questions

Architecture:
  User prompt → embed with text-embedding-004 → FT.SEARCH in Redis Cloud
      ↳ Hit  (score ≥ threshold) → return cached answer (instant, 0 credits)
      ↳ Miss → call Gemini → store embedding + answer in Redis Cloud

Requirements:
  pip install redis langcache google-generativeai

Setup:
  Set REDIS_CLOUD_* and GEMINI_API_KEY in server env.
"""

import os
import json
import hashlib
import time
from typing import Optional

import redis as redis_lib
from services.redis_client import get_redis

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY          = os.environ.get("GEMINI_API_KEY", "")
LANGCACHE_INDEX_NAME    = "openbalc:langcache:idx"
LANGCACHE_KEY_PREFIX    = "openbalc:langcache:entry:"
LANGCACHE_TTL_SECONDS   = int(os.environ.get("LANGCACHE_TTL", str(7 * 24 * 3600)))  # 7 days
LANGCACHE_SIMILARITY    = float(os.environ.get("LANGCACHE_SIMILARITY_THRESHOLD", "0.92"))
EMBEDDING_DIM           = 768  # text-embedding-004 output dimension

# ── Embedding helper (Google text-embedding-004) ──────────────────────────────

def _get_embedding(text: str) -> list[float]:
    """Generate a 768-dim embedding for the given text using Gemini."""
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="RETRIEVAL_QUERY",
    )
    return result["embedding"]


# ── Index bootstrap ───────────────────────────────────────────────────────────

def ensure_langcache_index() -> None:
    """
    Create the RediSearch vector index if it doesn't exist.
    Safe to call on every startup — no-ops if the index is already there.
    """
    r = get_redis()
    try:
        r.execute_command(
            "FT.CREATE", LANGCACHE_INDEX_NAME,
            "ON", "HASH",
            "PREFIX", "1", LANGCACHE_KEY_PREFIX,
            "SCHEMA",
            "embedding", "VECTOR", "HNSW", "6",
                "TYPE",       "FLOAT32",
                "DIM",        str(EMBEDDING_DIM),
                "DISTANCE_METRIC", "COSINE",
            "prompt_hash", "TAG",
            "user_id",     "TAG",
            "created_at",  "NUMERIC",
        )
    except redis_lib.ResponseError as e:
        if "Index already exists" in str(e):
            pass  # Index is already set up
        else:
            raise


# ── Core cache operations ─────────────────────────────────────────────────────

def cache_lookup(
    prompt: str,
    user_id: Optional[int] = None,
    threshold: float = LANGCACHE_SIMILARITY,
) -> Optional[str]:
    """
    Search for a semantically similar cached response.

    Returns the cached answer string if a match is found above the similarity
    threshold, or None if no close-enough match exists.
    """
    r = get_redis()
    embedding = _get_embedding(prompt)

    # Encode embedding as raw bytes (FLOAT32 little-endian)
    import struct
    embedding_bytes = struct.pack(f"{EMBEDDING_DIM}f", *embedding)

    # FT.SEARCH using KNN vector similarity
    query = f"*=>[KNN 1 @embedding $vec AS score]"
    params = ["PARAMS", "2", "vec", embedding_bytes, "DIALECT", "2"]
    results = r.execute_command(
        "FT.SEARCH", LANGCACHE_INDEX_NAME,
        query,
        *params,
        "RETURN", "3", "answer", "score", "user_id",
        "LIMIT", "0", "1",
    )

    if not results or results[0] == 0:
        return None

    # results format: [count, key, [field, val, ...], ...]
    fields = dict(zip(results[2][::2], results[2][1::2]))
    score = float(fields.get("score", 0.0))

    # COSINE distance: 0 = identical, 2 = opposite → similarity = 1 - distance
    similarity = 1.0 - score
    if similarity >= threshold:
        return fields.get("answer")

    return None


def cache_store(
    prompt: str,
    answer: str,
    user_id: Optional[int] = None,
) -> None:
    """
    Store a prompt+answer pair in the LangCache vector index.
    """
    import struct
    r = get_redis()
    embedding = _get_embedding(prompt)
    embedding_bytes = struct.pack(f"{EMBEDDING_DIM}f", *embedding)

    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:16]
    key = f"{LANGCACHE_KEY_PREFIX}{prompt_hash}"

    mapping = {
        "embedding":   embedding_bytes,
        "prompt":      prompt[:2000],      # store truncated for debugging
        "answer":      answer,
        "prompt_hash": prompt_hash,
        "user_id":     str(user_id or ""),
        "created_at":  int(time.time()),
    }
    r.hset(key, mapping=mapping)  # type: ignore[arg-type]
    r.expire(key, LANGCACHE_TTL_SECONDS)


# ── High-level wrapper ────────────────────────────────────────────────────────

async def cached_llm_call(
    prompt: str,
    llm_fn,                    # async callable(prompt) → str
    user_id: Optional[int] = None,
    threshold: float = LANGCACHE_SIMILARITY,
) -> tuple[str, bool]:
    """
    Semantic-cache wrapper around any async LLM call.

    Args:
        prompt:    The user's prompt / question
        llm_fn:   An async function that accepts a prompt string and returns
                   the LLM answer string (e.g. your Gemini call)
        user_id:  Optional — used for per-user cache scoping
        threshold: Cosine similarity threshold (0.0–1.0)

    Returns:
        (answer: str, was_cached: bool)

    Example:
        answer, from_cache = await cached_llm_call(
            prompt=user_message,
            llm_fn=lambda p: call_gemini(p, system_prompt=sys),
            user_id=current_user_id,
        )
        if from_cache:
            print("Served from LangCache — 0 credits spent")
    """
    # 1. Try cache lookup
    cached = cache_lookup(prompt, user_id=user_id, threshold=threshold)
    if cached:
        return cached, True

    # 2. Call LLM
    answer = await llm_fn(prompt)

    # 3. Store in cache (fire-and-forget — don't block the response)
    try:
        cache_store(prompt, answer, user_id=user_id)
    except Exception:
        pass  # Never let cache writes break the response

    return answer, False
