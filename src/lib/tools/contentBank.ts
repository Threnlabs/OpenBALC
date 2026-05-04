/**
 * Content Bank Tool — Curriculum-grounded knowledge retrieval
 * ============================================================
 * Queries the backend content bank (PostgreSQL full-text search) to fetch
 * relevant study material chunks. Used by UserAI to ground responses in
 * curriculum-approved definitions, formulas, and examples.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

// ─── Types ─────────────────────────────────────────────────────────────────────

import type { ContentBankItem, ContentBankContentType, ContentBankDifficulty } from "@/types";
export type { ContentBankItem, ContentBankContentType, ContentBankDifficulty };

export interface ContentBankSearchResponse {
  query:   string;
  count:   number;
  results: ContentBankItem[];
}

export interface ContentBankListResponse {
  count: number;
  items: ContentBankItem[];
}

export interface ContentBankSearchOptions {
  subject?:      string;
  chapter?:      string;
  content_type?: ContentBankContentType;
  difficulty?:   ContentBankDifficulty;
  limit?:        number;
}

// ─── Core API Calls ────────────────────────────────────────────────────────────

/**
 * Full-text search over the content bank.
 * Maps to GET /api/benchrex/content-bank/search?q=...
 */
export async function searchContentBank(
  query: string,
  options: ContentBankSearchOptions = {}
): Promise<ContentBankSearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (options.subject)      params.set("subject",      options.subject);
  if (options.chapter)      params.set("chapter",      options.chapter);
  if (options.content_type) params.set("content_type", options.content_type);
  if (options.difficulty)   params.set("difficulty",   options.difficulty);
  if (options.limit)        params.set("limit",        String(options.limit));

  const res = await fetch(`${BACKEND_URL}/api/benchrex/content-bank/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Content bank search failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * List/browse content bank by subject or chapter.
 * Maps to GET /api/benchrex/content-bank
 */
export async function listContentBank(
  options: Omit<ContentBankSearchOptions, "chapter"> & { chapter?: string } = {}
): Promise<ContentBankListResponse> {
  const params = new URLSearchParams();
  if (options.subject)      params.set("subject",      options.subject);
  if (options.chapter)      params.set("chapter",      options.chapter);
  if (options.difficulty)   params.set("difficulty",   options.difficulty);
  if (options.content_type) params.set("content_type", options.content_type);
  if (options.limit)        params.set("limit",        String(options.limit));

  const res = await fetch(`${BACKEND_URL}/api/benchrex/content-bank?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Content bank list failed: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch a single content item by UUID.
 * Maps to GET /api/benchrex/content-bank/:id
 */
export async function getContentBankItem(itemId: string): Promise<ContentBankItem> {
  const res = await fetch(`${BACKEND_URL}/api/benchrex/content-bank/${itemId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Content item not found: HTTP ${res.status}`);
  }
  return res.json();
}

// ─── AI Context Formatter ──────────────────────────────────────────────────────

/**
 * Format a list of content bank results into a system-prompt context string.
 * Injected before the LLM prompt so the AI can cite specific curriculum items.
 */
export function formatContentBankForPrompt(items: ContentBankItem[]): string {
  if (!items.length) return "";

  const lines = [
    `[CONTENT BANK — ${items.length} curriculum item(s) retrieved]`,
    "",
    ...items.map((item, i) => [
      `[${i + 1}] ${item.title}`,
      `Subject: ${item.subject} | Chapter: ${item.chapter}${item.section ? ` | ${item.section}` : ""}`,
      `Type: ${item.content_type} | Difficulty: ${item.difficulty}`,
      item.content,
    ].join("\n")),
    "",
    "Use the above curriculum content to answer accurately. Reference items inline as [1], [2], etc.",
  ];

  return lines.join("\n\n");
}

// ─── Smart Auto-search ──────────────────────────────────────────────────────────

/**
 * Attempt to auto-extract a content bank search from the user's question.
 * Returns the fetched context string (empty if nothing matched or no result).
 * Never throws — gracefully returns "" on failure.
 */
export async function autoFetchContentBankContext(
  question: string,
  subject?: string
): Promise<{ context: string; items: ContentBankItem[] }> {
  try {
    const response = await searchContentBank(question, { subject, limit: 5 });
    if (!response.results.length) return { context: "", items: [] };

    return {
      context: formatContentBankForPrompt(response.results),
      items: response.results,
    };
  } catch (e) {
    console.warn("[ContentBank] Auto-fetch failed:", e);
    return { context: "", items: [] };
  }
}
