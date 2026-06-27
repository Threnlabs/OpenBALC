// ────────────────────────────────────────────────────────────────────────────
// src/lib/redis-cache.ts
// Browser-safe Redis cache layer powered by Upstash HTTP REST API.
// Standard ioredis/redis packages cannot run in the browser; Upstash exposes
// a plain fetch-compatible REST endpoint that works everywhere.
// ────────────────────────────────────────────────────────────────────────────

/** True only when Upstash Redis is active via server API proxy */
export const hasRedis = true;

// ── Low-level REST helper ────────────────────────────────────────────────────

/**
 * Send a Redis command via the backend proxy endpoint `/api/cache`.
 * Returns `null` on network error or missing credentials.
 */
async function redisCmd<T>(command: (string | number)[]): Promise<T | null> {
  try {
    const res = await fetch("/api/cache", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.result ?? null) as T;
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Write a JSON-serialisable value to Redis with an optional TTL.
 * @param key        Redis key
 * @param value      Any JSON-serialisable value
 * @param ttlSeconds Expiry in seconds (default: 300 = 5 minutes)
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  await redisCmd(["SET", key, JSON.stringify(value), "EX", ttlSeconds]);
}

/**
 * Read a cached value. Returns `null` on cache-miss or deserialisation error.
 * @param key Redis key
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redisCmd<string>(["GET", key]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Delete one or more cache keys (call after mutations to bust stale data).
 * @param keys One or more Redis keys to delete
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  await redisCmd(["DEL", ...keys]);
}

/**
 * Increment a numeric counter (useful for analytics / rate-limiting).
 * Returns the new value, or null if Redis is unavailable.
 */
export async function cacheIncr(key: string): Promise<number | null> {
  return redisCmd<number>(["INCR", key]);
}

// ── Typed cache-key factory ──────────────────────────────────────────────────

/**
 * Centralised key registry — keeps key naming consistent across the codebase.
 * All keys are namespaced under `openbalc:` to avoid collisions in shared DBs.
 */
export const CACHE_KEYS = {
  // Public module library (sorted list)
  publicModules:  (sort = "newest") => `openbalc:public_modules:${sort}`,

  // User-scoped module list
  myModules:      (userId: number | string) => `openbalc:my_modules:${userId}`,

  // User-scoped conversation list
  conversations:  (userId: number | string) => `openbalc:conversations:${userId}`,

  // Per-module chapter content
  moduleContent:  (moduleId: number | string) => `openbalc:module_content:${moduleId}`,

  // Per-module source list
  moduleSources:  (moduleId: number | string) => `openbalc:module_sources:${moduleId}`,

  // User profile
  me:             (userId: number | string) => `openbalc:me:${userId}`,

  // Org data
  org:            () => `openbalc:org`,
  orgMembers:     () => `openbalc:org_members`,

  // Notes
  notes:          (userId: number | string) => `openbalc:notes:${userId}`,

  // Tests
  tests:          (userId: number | string) => `openbalc:tests:${userId}`,
} as const;

// ── TTL constants (seconds) ──────────────────────────────────────────────────

export const CACHE_TTL = {
  /** Public module list — changes infrequently */
  publicModules:  2 * 60,    // 2 minutes
  /** Personal module list — changes on create/delete */
  myModules:      60,        // 1 minute
  /** Conversation list — semi-real-time */
  conversations:  30,        // 30 seconds
  /** Module chapter content — rarely changes once created */
  moduleContent:  10 * 60,   // 10 minutes
  /** Module source list — rarely changes */
  moduleSources:  5 * 60,    // 5 minutes
  /** User profile */
  me:             5 * 60,    // 5 minutes
  /** Org data */
  org:            3 * 60,    // 3 minutes
  /** Notes */
  notes:          2 * 60,    // 2 minutes
  /** Tests */
  tests:          5 * 60,    // 5 minutes
} as const;
