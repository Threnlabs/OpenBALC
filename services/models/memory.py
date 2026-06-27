"""
services/models/memory.py
────────────────────────────────────────────────────────────────────────────
context-surfaces data models for Redis-backed agent memory.

These models are stored in Redis Cloud (Stack) using:
  - RedisJSON  → structured storage
  - RediSearch → full-text + tag + numeric indexes
  - Vector     → semantic embedding search (when enabled)

Register with:
  ctxctl surface create \\
    --name "OpenBALC Agent Memory" \\
    --models ./services/models/memory.py \\
    --redis-addr "$REDIS_CLOUD_HOST:$REDIS_CLOUD_PORT" \\
    --redis-password "$REDIS_CLOUD_PASSWORD" \\
    --redis-ssl
"""

from context_surfaces.context_model import ContextField, ContextModel


class ConversationMemory(ContextModel):
    """
    Persists a summarised snapshot of each conversation after it ends.
    Enables the agent to recall past discussions and avoid repeating context.
    """
    __redis_key_template__ = "openbalc:memory:conv:{id}"

    id: str = ContextField(
        description="Unique conversation ID (UUID)",
        is_key_component=True
    )
    user_id: int = ContextField(
        description="OpenBALC user ID",
        index="numeric"
    )
    module_ids: list[int] = ContextField(
        description="Module IDs referenced in this conversation",
        default=[]
    )
    summary: str = ContextField(
        description="LLM-generated summary of the conversation",
        index="text"
    )
    key_concepts: list[str] = ContextField(
        description="Core concepts the user learned or asked about",
        index="tag"
    )
    sentiment: str = ContextField(
        description="User sentiment: confused | neutral | confident",
        index="tag",
        default="neutral"
    )
    created_at: str = ContextField(
        description="ISO 8601 timestamp when conversation ended"
    )


class UserLearningProfile(ContextModel):
    """
    Rolling learning profile per user — updated after each conversation.
    The agent reads this at the start of new conversations to personalise responses.
    """
    __redis_key_template__ = "openbalc:profile:{user_id}"

    user_id: int = ContextField(
        description="OpenBALC user ID",
        is_key_component=True
    )
    strengths: list[str] = ContextField(
        description="Topics/concepts the user understands well",
        index="tag",
        default=[]
    )
    weak_areas: list[str] = ContextField(
        description="Topics the user struggles with",
        index="tag",
        default=[]
    )
    recent_topics: list[str] = ContextField(
        description="Most recently studied topics (rolling window)",
        index="tag",
        default=[]
    )
    preferred_style: str = ContextField(
        description="Learning style: visual | textual | quiz-heavy",
        index="tag",
        default="textual"
    )
    total_conversations: int = ContextField(
        description="Lifetime conversation count",
        index="numeric",
        sortable=True,
        default=0
    )
    last_active_at: str = ContextField(
        description="ISO 8601 timestamp of last activity",
        default=""
    )
