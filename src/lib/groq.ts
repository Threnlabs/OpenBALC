import { Source } from "../types";
import { ModelProvider } from "./models";

export async function sendAIQuestion(payload: {
  question: string;
  mode: string;
  provider: ModelProvider;
  baseUrl: string;
  systemInstructions?: string;
  history?: { role: string; content: string }[];
  contentBankContext?: string;
  webSearchContext?: string;
  userContext?: { name?: string; id?: string };
  apiKey?: string;
  tools?: any[];
}): Promise<{ answer: string; reasoning?: string; sources: Source[]; tool_calls?: any[] }> {
  const activeKey = payload.apiKey;

  if (!activeKey) {
    throw new Error(
      `API key for ${payload.provider} is not configured.`
    );
  }

  const messages: any[] = [];

  if (payload.systemInstructions) {
    messages.push({ role: "system", content: payload.systemInstructions });
  }

  // Inject curriculum content bank context
  if (payload.contentBankContext) {
    messages.push({ role: "system", content: `CURRICULUM CONTEXT:\n${payload.contentBankContext}` });
  }

  if (payload.webSearchContext) {
    messages.push({ role: "system", content: `WEB SEARCH CONTEXT:\n${payload.webSearchContext}` });
  }

  if (payload.userContext) {
    messages.push({ 
      role: "system", 
      content: `USER CONTEXT:\nName: ${payload.userContext.name || "Anonymous"}\nID: ${payload.userContext.id || "N/A"}` 
    });
  }

  messages.push({ 
    role: "system", 
    content: `You are an expert educational assistant. 
    Use rich Markdown formatting in every response.
    
    If you have tools available, use them to get real-time information (calendar, schedule, etc.) 
    or to perform actions. ALWAYS call list_entities before booking any meeting to get the correct IDs.
    
    If the question requires complex reasoning, start your response with <thought>...</thought> blocks.` 
  });

  if (payload.history) {
    messages.push(...payload.history);
  }

  messages.push({ role: "user", content: payload.question });

  // Handle Anthropic specifically if needed
  const isAnthropic = payload.provider === "anthropic";
  
  const response = await fetch(payload.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isAnthropic 
        ? { "x-api-key": activeKey, "anthropic-version": "2023-06-01" } 
        : { Authorization: `Bearer ${activeKey}` }),
    },
    body: JSON.stringify(isAnthropic ? {
      model: payload.mode,
      messages: messages.filter(m => m.role !== 'system'),
      system: messages.find(m => m.role === 'system')?.content,
      max_tokens: 4096,
      tools: payload.tools && payload.tools.length > 0 ? payload.tools.map((t: any) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      })) : undefined,
    } : {
      model: payload.mode,
      messages,
      tools: payload.tools && payload.tools.length > 0 ? payload.tools : undefined,
      tool_choice: payload.tools && payload.tools.length > 0 ? "auto" : undefined,
      stream: false,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `${payload.provider} API error: HTTP ${response.status}`
    );
  }

  const data = await response.json();
  
  let answer = "";
  let tool_calls = undefined;

  if (isAnthropic) {
    answer = data.content.find((c: any) => c.type === 'text')?.text || "";
    const anthropicTools = data.content.filter((c: any) => c.type === 'tool_use');
    if (anthropicTools.length > 0) {
      tool_calls = anthropicTools.map((t: any) => ({
        id: t.id,
        type: 'function',
        function: {
          name: t.name,
          arguments: JSON.stringify(t.input)
        }
      }));
    }
  } else {
    const message = data.choices[0].message;
    answer = message.content || "";
    tool_calls = message.tool_calls;
  }

  let reasoning: string | undefined;

  // Extract <thought> or <reasoning> tags
  const reasoningMatch = answer.match(/<(thought|reasoning)>([\s\S]*?)<\/\1>/i);
  if (reasoningMatch) {
    reasoning = reasoningMatch[2].trim();
    answer = answer.replace(reasoningMatch[0], "").trim();
  }

  return {
    answer,
    reasoning,
    sources: [],
    tool_calls,
  };
}
