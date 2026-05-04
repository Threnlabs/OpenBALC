import { sendAIQuestion } from "./groq";
import { runWebSearch, formatSearchContextForPrompt } from "./tools/webSearch";
import { autoFetchContentBankContext, ContentBankItem } from "./tools/contentBank";
import { getModelProvider, PROVIDER_BASE_URLS } from "./models";
import { CALENDAR_TOOLS, executeCalendarTool } from "./tools/calendar";
import { Attachment, Source, WebSearchMeta } from "../types";

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

  // ── Route to LLM ──────────────────────────────────────────────────────────
  const provider = getModelProvider(payload.mode);
  const baseUrl = PROVIDER_BASE_URLS[provider];
  
  // Pick the right key based on provider
  let activeKey: string | null | undefined;
  switch (provider) {
    case "groq": activeKey = payload.groqApiKey; break;
    case "openai": activeKey = payload.openaiApiKey; break;
    case "anthropic": activeKey = payload.anthropicApiKey; break;
    case "google": activeKey = payload.googleApiKey; break;
    case "xai": activeKey = payload.xaiApiKey; break;
  }

  if (provider === "mock") {
    return { answer: "I'm currently in maintenance mode.", sources: [] };
  }

  // ── Tool Calling Loop ─────────────────────────────────────────────────────
  let currentHistory = payload.history ? [...payload.history] : [];
  let tools = payload.useCalendar ? CALENDAR_TOOLS : undefined;
  
  let loopCount = 0;
  const MAX_LOOPS = 3;

  let finalResult: any;
  let lastActionId: string | undefined;

  while (loopCount < MAX_LOOPS) {
    loopCount++;
    
    const result = await sendAIQuestion({
      question: loopCount === 1 ? payload.question : "",
      mode: payload.mode,
      provider: provider,
      baseUrl: baseUrl,
      systemInstructions: payload.systemInstructions,
      history: currentHistory,
      contentBankContext,
      webSearchContext,
      userContext: { name: payload.student_name, id: payload.student_id },
      apiKey: activeKey || undefined,
      tools: tools,
    });

    if (!result.tool_calls || result.tool_calls.length === 0) {
      finalResult = result;
      break;
    }

    // AI wants to use tools
    currentHistory.push({ role: "assistant", content: result.answer, tool_calls: result.tool_calls } as any);

    for (const toolCall of result.tool_calls) {
      const name = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`[AI Tool Call] Executing ${name} with args:`, args);
      const toolResult = await executeCalendarTool(name, args);
      
      if (toolResult?.action_id) {
        lastActionId = toolResult.action_id;
      }

      currentHistory.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: name,
        content: JSON.stringify(toolResult)
      } as any);
    }
    
    // Continue loop to give LLM the results
  }

  return { ...finalResult, webSearch, contentBankItems, aiActionId: lastActionId };
}

