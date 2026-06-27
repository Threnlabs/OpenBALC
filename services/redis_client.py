"""
services/redis_client.py
────────────────────────────────────────────────────────────────────────────
Shared Redis Cloud connection for all backend services.

Architecture split:
  Browser / Frontend  → Upstash REST (HTTP, no TCP, env: VITE_UPSTASH_*)
  Python Backend      → Redis Cloud TCP (this file, env: REDIS_CLOUD_*)

Redis Cloud is used here because:
  1. context-surfaces needs Redis Stack (RediSearch + RedisJSON + Vector)
  2. LangCache requires Redis Vector Search for semantic dedup
  3. Agent memory needs native HSET / JSON.SET / FT.SEARCH — not REST

Setup:
  1. Create a database at https://app.redislabs.com
  2. Enable "Redis Stack" when creating (includes RediSearch + Vector)
  3. Copy the "Public endpoint" host:port and password
  4. Set env vars in .env.local / your server env (NOT VITE_ prefixed —
     these are server-only and must NEVER be shipped to the browser)
"""

import os
import redis
from redis.connection import SSLConnection

# ── Connection config (set in .env.local / server env) ──────────────────────
REDIS_CLOUD_HOST     = os.environ.get("REDIS_CLOUD_HOST", "")
REDIS_CLOUD_PORT     = int(os.environ.get("REDIS_CLOUD_PORT", "6380"))
REDIS_CLOUD_PASSWORD = os.environ.get("REDIS_CLOUD_PASSWORD", "")
REDIS_CLOUD_USERNAME = os.environ.get("REDIS_CLOUD_USERNAME", "default")
REDIS_CLOUD_SSL      = os.environ.get("REDIS_CLOUD_SSL", "true").lower() == "true"

# ── Singleton connection pool ────────────────────────────────────────────────
_pool: redis.ConnectionPool | None = None

def get_pool() -> redis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool(
            host=REDIS_CLOUD_HOST,
            port=REDIS_CLOUD_PORT,
            password=REDIS_CLOUD_PASSWORD,
            username=REDIS_CLOUD_USERNAME,
            ssl=REDIS_CLOUD_SSL,
            decode_responses=True,
            max_connections=20,
        )
    return _pool


def get_redis() -> redis.Redis:
    """Return a Redis client backed by the shared connection pool."""
    if not REDIS_CLOUD_HOST:
        raise RuntimeError(
            "REDIS_CLOUD_HOST is not set. "
            "Add it to your server environment (.env.local for local dev)."
        )
    return redis.Redis(connection_pool=get_pool())


def ping() -> bool:
    """Health-check: returns True if Redis Cloud is reachable."""
    try:
        return get_redis().ping()
    except Exception:
        return False
