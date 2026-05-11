import { sendAIQuestion } from "./groq";
import { runWebSearch, formatSearchContextForPrompt } from "./tools/webSearch";
import { autoFetchContentBankContext } from "./tools/contentBank";
import type { ContentBankItem } from "./tools/contentBank";
import { getModelProvider, PROVIDER_BASE_URLS } from "./models";
import { CALENDAR_TOOLS, executeCalendarTool } from "./tools/calendar";
import type { Attachment, Source, WebSearchMeta } from "../types";

async function fileToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function sendQuestion(
  payload: {
    question: string;
    subject: string;
    grade: string;
    mode: string;
    student_id: string;
    student_name?: string;
    systemInstructions?: string;
    history?: { role: string; content: string }[];
    attachments?: Attachment[];
    useWebSearch?: boolean;
    useContentBank?: boolean;
    useCalendar?: boolean;
    // API Keys for different providers
    groqApiKey?: string | null;
    openaiApiKey?: string | null;
    anthropicApiKey?: string | null;
    googleApiKey?: string | null;
    xaiApiKey?: string | null;
  },
  signal?: AbortSignal
): Promise<{
  answer: string;
  reasoning?: string;
  sources: Source[];
  webSearch?: WebSearchMeta;
  contentBankItems?: ContentBankItem[];
  aiActionId?: string;
}> {
  // Pre-process attachments
  const processedAttachments = payload.attachments
    ? await Promise.all(
        payload.attachments.map(async (a) => {
          if (a.type === "image") {
            const base64 = await fileToBase64(a.url);
            return { ...a, base64 };
          }
          return a;
        })
      )
    : undefined;

  if (processedAttachments) {
    console.log("Attachments processed for LLM:", processedAttachments.length);
  }

  // ── Content Bank Tool ──────────────────────────────────────────────────────
  let contentBankItems: ContentBankItem[] = [];
  let contentBankContext: string | undefined;

  if (payload.useContentBank !== false) {
    const subject = payload.subject !== "General" ? payload.subject : undefined;
    const cbResult = await autoFetchContentBankContext(payload.question, subject);
    contentBankItems = cbResult.items;
    contentBankContext = cbResult.context || undefined;
  }

  // ── Web Search Tool ────────────────────────────────────────────────────────
  let webSearch: WebSearchMeta | undefined;
  let webSearchContext: string | undefined;

  if (payload.useWebSearch) {
    const searchResponse = await runWebSearch(payload.question);
    webSearch = searchResponse;
    webSearchContext = formatSearchContextForPrompt(searchResponse);
  }

  // ── Route to Backend ──────────────────────────────────────────────────────
  const API_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000") + "/api/benchrex/chat";
  
  const requestBody = {
    question: payload.question,
    personality_id: (payload as any).personalityId || "",
    history: payload.history,
    subject: payload.subject,
    system_instructions: payload.systemInstructions,
    model_override: payload.mode,
  };

  console.log("[API] Sending request to backend:", { url: API_URL, body: requestBody });

  const response = await fetch(API_URL, {
    method: "POST",
    signal: signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Chat failed" }));
    console.error("[API] Backend error:", { status: response.status, err });
    throw new Error(err.detail || `AI call failed: ${response.status}`);
  }

  const result = await response.json();
  console.log("[API] Backend response received:", result);

  return { 
    answer: result.answer, 
    reasoning: result.reasoning,
    sources: result.sources || [], 
    webSearch: result.webSearch, 
    contentBankItems: result.contentBankItems, 
    aiActionId: result.aiActionId 
  };
}

