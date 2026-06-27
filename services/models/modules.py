"""
services/models/modules.py
────────────────────────────────────────────────────────────────────────────
context-surfaces ContextModel for the public module library.

Synced from Supabase → Redis Cloud on publish / nightly cron.
Enables semantic vector search across all public modules for the AI agent.

Register with:
  ctxctl surface create \\
    --name "OpenBALC Module Library" \\
    --models ./services/models/modules.py \\
    --redis-addr "$REDIS_CLOUD_HOST:$REDIS_CLOUD_PORT" \\
    --redis-password "$REDIS_CLOUD_PASSWORD" \\
    --redis-ssl
"""

from context_surfaces.context_model import ContextField, ContextModel


class PublicModule(ContextModel):
    """
    Searchable representation of a public OpenBALC module.
    Indexed for text, tag, numeric, and (optionally) vector search.
    """
    __redis_key_template__ = "openbalc:module:{id}"

    id: int = ContextField(
        description="Module database ID",
        is_key_component=True
    )
    title: str = ContextField(
        description="Module title",
        index="text"
    )
    description: str = ContextField(
        description="Short module description",
        index="text",
        default=""
    )
    subject: str = ContextField(
        description="Top-level subject area (e.g. 'Computer Science')",
        index="tag",
        default=""
    )
    fields: list[str] = ContextField(
        description="Broad academic fields (e.g. 'engineering', 'arts')",
        index="tag",
        default=[]
    )
    domains: list[str] = ContextField(
        description="Specific domains (e.g. 'software', 'mechanical')",
        index="tag",
        default=[]
    )
    tags: list[str] = ContextField(
        description="Free-form tags added by the publisher",
        index="tag",
        default=[]
    )
    star_count: int = ContextField(
        description="Number of stars (social proof)",
        index="numeric",
        sortable=True,
        default=0
    )
    chapter_count: int = ContextField(
        description="Number of chapters",
        index="numeric",
        sortable=True,
        default=0
    )
    use_count: int = ContextField(
        description="Number of times the module was used/starred",
        index="numeric",
        sortable=True,
        default=0
    )
    created_at: str = ContextField(
        description="ISO 8601 publish timestamp",
        default=""
    )
