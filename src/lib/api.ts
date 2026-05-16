import { supabase } from "./supabase";
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
    onProgress?: (steps: { id: string, type: any, status: any, label: string, detail?: string }[]) => void;
  },
  signal?: AbortSignal
): Promise<{
  answer: string;
  reasoning?: string;
  sources: Source[];
  webSearch?: WebSearchMeta;
  contentBankItems?: ContentBankItem[];
  aiActionId?: string;
  newCredits?: number;
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

  if (processedAttachments && import.meta.env.DEV) {
    console.log("Attachments processed for LLM:", processedAttachments.length);
  }

  const steps: { id: string, type: any, status: any, label: string, detail?: string }[] = [];
  const reportProgress = () => payload.onProgress?.([...steps]);

  // ── Content Bank Tool ──────────────────────────────────────────────────────
  let contentBankItems: ContentBankItem[] = [];
  let contentBankContext: string | undefined;

  if (payload.useContentBank !== false) {
    const stepId = "cb-" + Date.now();
    steps.push({ id: stepId, type: 'content_bank', status: 'active', label: 'Knowledge Base', detail: 'Searching curriculum...' });
    reportProgress();
    
    try {
      const subject = payload.subject !== "General" ? payload.subject : undefined;
      const cbResult = await autoFetchContentBankContext(payload.question, subject);
      contentBankItems = cbResult.items;
      contentBankContext = cbResult.context || undefined;
      
      const step = steps.find(s => s.id === stepId);
      if (step) {
        step.status = 'done';
        step.detail = `Found ${contentBankItems.length} relevant sections`;
      }
    } catch (e) {
      const step = steps.find(s => s.id === stepId);
      if (step) step.status = 'error';
    }
    reportProgress();
  }

  // ── Web Search Tool ────────────────────────────────────────────────────────
  let webSearch: WebSearchMeta | undefined;
  let webSearchContext: string | undefined;

  if (payload.useWebSearch) {
    const stepId = "ws-" + Date.now();
    steps.push({ id: stepId, type: 'web_search', status: 'active', label: 'Web Research', detail: 'Searching the web...' });
    reportProgress();

    try {
      const searchResponse = await runWebSearch(payload.question);
      webSearch = searchResponse;
      webSearchContext = formatSearchContextForPrompt(searchResponse);
      
      const step = steps.find(s => s.id === stepId);
      if (step) {
        step.status = 'done';
        step.detail = `Analyzed ${webSearch.results?.length || 0} sources`;
      }
    } catch (e) {
      const step = steps.find(s => s.id === stepId);
      if (step) step.status = 'error';
    }
    reportProgress();
  }

  // ── AI Reasoning Step ─────────────────────────────────────────────────────
  const reasoningStepId = "ai-" + Date.now();
  steps.push({ id: reasoningStepId, type: 'ai_reasoning', status: 'active', label: 'AI Reasoning', detail: 'Generating response...' });
  reportProgress();

  // ── Route to Backend ──────────────────────────────────────────────────────
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
  const API_URL = backendUrl + "/api/benchrex/chat";

  
  // Combine contexts for the prompt
  let enrichedQuestion = payload.question;
  if (contentBankContext) {
    enrichedQuestion = `${contentBankContext}\n\nQUESTION: ${enrichedQuestion}`;
  }
  if (webSearchContext) {
    enrichedQuestion = `${webSearchContext}\n\nQUESTION: ${enrichedQuestion}`;
  }

  const requestBody = {
    question: enrichedQuestion,
    personality_id: (payload as any).personalityId || "",
    history: payload.history,
    subject: payload.subject,
    system_instructions: payload.systemInstructions,
    student_id: payload.student_id,
    no_of_sources: (contentBankItems?.length || 0) + (webSearch?.results?.length || 0),
    no_of_tools: (payload.useCalendar ? 1 : 0) + (payload.useWebSearch ? 1 : 0),
  };

  if (import.meta.env.DEV) {
    console.log("[API] Sending request to backend:", { url: API_URL, body: requestBody });
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(API_URL, {
    method: "POST",
    signal: signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const reasoningStep = steps.find(s => s.id === reasoningStepId);
    if (reasoningStep) reasoningStep.status = 'error';
    reportProgress();

    const err = await response.json().catch(() => ({ detail: "Chat failed" }));
    if (import.meta.env.DEV) {
      console.error("[API] Backend error:", { status: response.status, err });
    }
    throw new Error(err.detail || `AI call failed: ${response.status}`);
  }

  const result = await response.json();
  
  const reasoningStep = steps.find(s => s.id === reasoningStepId);
  if (reasoningStep) {
    reasoningStep.status = 'done';
    reasoningStep.detail = 'Response complete';
  }
  reportProgress();
  if (import.meta.env.DEV) {
    console.log("[API] Backend response received:", result);
  }

  return { 
    answer: result.answer, 
    reasoning: result.reasoning,
    sources: result.sources || contentBankItems || [], 
    webSearch: result.webSearch || webSearch, 
    contentBankItems: result.contentBankItems || contentBankItems, 
    aiActionId: result.aiActionId,
    newCredits: result.new_credits 
  };
}

