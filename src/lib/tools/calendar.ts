import { supabase } from "../supabase";

const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000/api/ai";

/**
 * Interface for calendar tool definitions to be sent to Groq
 */
export const CALENDAR_TOOLS = [
    {
        type: "function",
        function: {
            name: "get_schedule",
            description: "Retrieve calendar events for a given time window to see what is already booked.",
            parameters: {
                type: "object",
                properties: {
                    start_time: { type: "string", description: "ISO 8601 start time, e.g. '2026-04-14T00:00:00+05:30'" },
                    end_time: { type: "string", description: "ISO 8601 end time, e.g. '2026-04-15T00:00:00+05:30'" }
                },
                required: ["start_time", "end_time"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_entities",
            description: "List all faculty, batches, branches, and subjects. Call this first to get IDs for names.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "book_meeting",
            description: "Create a new calendar event after checking for conflicts.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    start_time: { type: "string", description: "ISO 8601" },
                    end_time: { type: "string", description: "ISO 8601" },
                    description: { type: "string" },
                    faculty_id: { type: "string" },
                    batch_id: { type: "string" }
                },
                required: ["title", "start_time", "end_time"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "run_scheduling_optimization",
            description: "Advanced: Run the CP-SAT solver to generate an optimal schedule for specific dates. Result goes to SANDBOX.",
            parameters: {
                type: "object",
                properties: {
                    dates: { type: "array", items: { type: "string" }, description: "YYYY-MM-DD list" },
                    batch_ids: { type: "array", items: { type: "string" } }
                },
                required: ["dates"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "publish_schedule",
            description: "Make a sandbox schedule (from optimization) live for everyone.",
            parameters: {
                type: "object",
                properties: {
                    session_id: { type: "string", description: "The session ID returned by run_scheduling_optimization" }
                },
                required: ["session_id"]
            }
        }
    }
];

/**
 * Execute a tool call against the backend AI tools API
 */
export async function executeCalendarTool(name: string, args: any): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let url = `${API_BASE}`;
    let method = "POST";

    switch (name) {
        case "get_schedule":
            url += `/schedule?start_time=${encodeURIComponent(args.start_time)}&end_time=${encodeURIComponent(args.end_time)}`;
            method = "GET";
            break;
        case "list_entities":
            url += "/entities";
            method = "GET";
            break;
        case "book_meeting":
            url += "/book";
            break;
        case "run_scheduling_optimization":
            url += "/schedule/run-optimization";
            break;
        case "publish_schedule":
            url += "/schedule/publish";
            break;
        default:
            throw new Error(`Unknown tool: ${name}`);
    }

    const response = await fetch(url, {
        method,
        headers,
        body: method === "POST" ? JSON.stringify(args) : undefined
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { error: err.detail || `Tool execution failed: ${response.status}` };
    }

    return response.json();
}
