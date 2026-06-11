/**
 * Web Search Tool — Brave Search API + DuckDuckGo Instant Answer fallback
 *
 * Priority:
 *  1. Brave Search API  (BRAVE_SEARCH_API_KEY)
 *  2. DuckDuckGo Instant Answers  (no key, free, limited)
 *  3. Graceful empty return so AI still responds without search context
 */

import type { WebSearchMeta, WebSearchResult } from "@/types";
export type { WebSearchMeta, WebSearchResult };

export type WebSearchResponse = WebSearchMeta;

const BRAVE_API_KEY = (import.meta.env.BRAVE_SEARCH_API_KEY as string) || "";
const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const DDG_INSTANT_URL = "https://api.duckduckgo.com/";

// ─── Brave Search ────────────────────────────────────────────────────────────

async function searchBrave(query: string, count = 5): Promise<WebSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: String(count),
    result_filter: "web",
    search_lang: "en",
    freshness: "pm",   // past month for recency
  });

  const res = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": BRAVE_API_KEY,
    },
  });

  if (!res.ok) throw new Error(`Brave Search HTTP ${res.status}`);

  const data = await res.json();
  const webResults = data?.web?.results ?? [];

  return webResults.map((r: any): WebSearchResult => ({
    title: r.title || "Untitled",
    url: r.url || "",
    description: r.description || "",
    domain: extractDomain(r.url),
  }));
}

// ─── DuckDuckGo Instant Answers (CORS-limited; best used via a proxy) ────────

async function searchDuckDuckGo(query: string): Promise<WebSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    no_html: "1",
    skip_disambig: "1",
  });

  const res = await fetch(`${DDG_INSTANT_URL}?${params}`);
  if (!res.ok) throw new Error(`DDG HTTP ${res.status}`);
  const data = await res.json();

  const results: WebSearchResult[] = [];

  // Abstract (main answer)
  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      description: data.AbstractText.slice(0, 300),
      domain: extractDomain(data.AbstractURL),
    });
  }

  // Related Topics
  const topics: any[] = data.RelatedTopics ?? [];
  for (const t of topics.slice(0, 4)) {
    if (t.FirstURL && t.Text) {
      results.push({
        title: t.Text.split(" - ")[0]?.slice(0, 80) || "Related",
        url: t.FirstURL,
        description: t.Text.slice(0, 200),
        domain: extractDomain(t.FirstURL),
      });
    }
  }

  return results;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run a web search with automatic provider fallback.
 * Never throws — returns empty results on failure.
 */
export async function runWebSearch(query: string): Promise<WebSearchResponse> {
  // 1. Try Brave if key is configured
  if (BRAVE_API_KEY) {
    try {
      const results = await searchBrave(query);
      return { query, results, provider: "brave" };
    } catch (e) {
      console.warn("[WebSearch] Brave failed, falling back to DDG:", e);
    }
  }

  // 2. DuckDuckGo fallback
  try {
    const results = await searchDuckDuckGo(query);
    return { query, results, provider: "duckduckgo" };
  } catch (e) {
    console.warn("[WebSearch] DuckDuckGo also failed:", e);
  }

  // 3. Empty fallback — let the LLM respond on its own
  return { query, results: [], provider: "none" };
}

/**
 * Format search results into a compact context string for injection into
 * the system / user prompt before sending to the LLM.
 */
export function formatSearchContextForPrompt(search: WebSearchResponse): string {
  if (!search.results.length) return "";

  const lines = [
    `[WEB SEARCH RESULTS for: "${search.query}"]`,
    `Provider: ${search.provider}`,
    "",
    ...search.results.map(
      (r: WebSearchResult, i: number) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}`
    ),
    "",
    "Use the above search results to provide an accurate, up-to-date answer. Cite sources inline with [1], [2], etc.",
  ];

  return lines.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}
