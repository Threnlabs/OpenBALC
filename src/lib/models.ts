/**
 * Central model registry for all supported AI providers.
 *
 * ─── Providers ───────────────────────────────────────────────────────────────
 *  "groq"   → Groq Cloud    (api.groq.com)     key: VITE_GROQ_API_KEY
 *  "mock"   → Mock fallback (no key needed)
 */

export type ModelProvider = "groq" | "xai" | "openai" | "anthropic" | "google" | "mock";

export interface ModelDef {
  id: string;            // exact API model ID to send to the provider
  name: string;          // human-readable display name
  provider: ModelProvider;
  badge?: string;        // short tag shown on the badge (e.g. "Llama", "Mistral")
  description?: string;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
}

export const MODELS: ModelDef[] = [
  // ── Groq Cloud — Meta Llama Models ───────────────────────────────────────
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    badge: "Llama",
    description: "Meta's latest flagship open-source model. Very capable.",
    supportsVision: false,
    supportsReasoning: false,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B (Fast)",
    provider: "groq",
    badge: "Llama",
    description: "Ultra-fast, low-cost model. Good for quick answers.",
    supportsVision: false,
    supportsReasoning: false,
  },
  {
    id: "llama3-70b-8192",
    name: "Llama 3 70B",
    provider: "groq",
    badge: "Llama",
    description: "Powerful Llama 3 model with 8192 context window.",
    supportsVision: false,
    supportsReasoning: false,
  },
  {
    id: "llama3-8b-8192",
    name: "Llama 3 8B",
    provider: "groq",
    badge: "Llama",
    description: "Lightweight, fast Llama 3 model.",
    supportsVision: false,
    supportsReasoning: false,
  },

  // ── Groq Cloud — Other Open-Source Models ────────────────────────────────
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    provider: "groq",
    badge: "Mistral",
    description: "High quality MoE model with 32K context.",
    supportsVision: false,
    supportsReasoning: false,
  },
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B",
    provider: "groq",
    badge: "Google",
    description: "Google's efficient open-source model.",
    supportsVision: false,
    supportsReasoning: false,
  },

  // ── xAI — Grok Models ────────────────────────────────────────────────────
  {
    id: "grok-4-20",
    name: "Grok 4.20",
    provider: "xai",
    badge: "xAI",
    description: "xAI's latest flagship model.",
    supportsVision: true,
    supportsReasoning: true,
  },
  {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    provider: "xai",
    badge: "xAI",
    description: "Efficient and fast version of Grok.",
    supportsVision: false,
    supportsReasoning: false,
  },

  // ── Anthropic — Claude Models ──────────────────────────────────────────
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    badge: "Anthropic",
    description: "Anthropic's most intelligent model.",
    supportsVision: true,
    supportsReasoning: false,
  },

  // ── OpenAI — GPT Models ────────────────────────────────────────────────
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    badge: "OpenAI",
    description: "OpenAI's versatile flagship model.",
    supportsVision: true,
    supportsReasoning: false,
  },
  {
    id: "o1-mini",
    name: "o1-mini",
    provider: "openai",
    badge: "OpenAI",
    description: "OpenAI's reasoning model.",
    supportsVision: false,
    supportsReasoning: true,
  },
];

/** Get provider for a given model ID — used by the router in api.ts */
export function getModelProvider(modelId: string): ModelProvider {
  const model = MODELS.find((m) => m.id === modelId);
  return model?.provider ?? "mock";
}

/** Group models by provider for rendering grouped dropdowns */
export const MODELS_BY_PROVIDER: Record<string, ModelDef[]> = MODELS.reduce(
  (acc, m) => {
    const key = m.provider;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  },
  {} as Record<string, ModelDef[]>
);

export const PROVIDER_LABELS: Record<ModelProvider, string> = {
  groq: "Groq Cloud (Llama, Mixtral…)",
  xai: "xAI (Grok)",
  openai: "OpenAI (GPT-4o, o1)",
  anthropic: "Anthropic (Claude)",
  google: "Google (Gemini/Gemma)",
  mock: "Mock / Fallback",
};

export const PROVIDER_BASE_URLS: Record<ModelProvider, string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages", // Note: Anthropic has a different format
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", // Google now supports OpenAI-compatible endpoint
  mock: "",
};
