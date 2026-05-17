export interface AIPersonality {
  id: string;
  name: string;
  model: string;
  systemInstructions: string;
  description?: string;
  icon?: string;
  tool_web_search?: boolean;
  tool_code_interpreter?: boolean;
  tool_image_gen?: boolean;
  tool_calendar_mgmt?: boolean;
  tool_knowledge_retrieval?: boolean;
  tool_chain_of_thought?: boolean;
  category?: string;
  data_access?: {
    tables: Record<string, boolean>;
    databases?: Record<string, boolean>;
  };
}

export type UserRole = 
  | "student" 
  | "doubt_expert" 
  | "super_admin" 
  | "branch_admin" 
  | "batch_admin" 
  | "course_admin" 
  | "content_manager" 
  | "inquiry_admin" 
  | "attendance_manager" 
  | "faculty" 
  | "viewer";

export interface UserProfile {
  id: string; // This will be the DB ID (public.users.id)
  auth_id: string; // This will be the Supabase Auth UID
  name: string;
  email: string;
  grade: string;
  course: string;
  batch: string;
  role: UserRole;
  setupComplete: boolean;
  credits: number;
  team_id: string;
  schema: 'public' | 'scholarsanchor';
}

export interface TopicSection {
  id: string;
  name: string;
}

export interface TopicChapter {
  id: string;
  name: string;
  sections: TopicSection[];
}

export interface Topic {
  id: string;
  subject: string;
  chapter: string;
  category: "school" | "college" | "professional";
  // Optional hierarchy: subject -> chapter -> section
  sections?: TopicSection[];
}

export interface Source {
  chunk_id: number;
  subject: string;
  chapter: string;
  content?: string;
}

export type ContentBankContentType = "text" | "formula" | "definition" | "example" | "question" | "answer";
export type ContentBankDifficulty  = "easy" | "medium" | "hard";

export interface ContentBankItem {
  id:           string;
  subject:      string;
  chapter:      string;
  section?:     string;
  grade?:       string;
  title:        string;
  content:      string;
  content_type: ContentBankContentType;
  difficulty:   ContentBankDifficulty;
  keywords?:    string;
  created_at?:  string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  description: string;
  domain: string;
}

export interface WebSearchMeta {
  query: string;
  results: WebSearchResult[];
  provider: "brave" | "duckduckgo" | "none";
}

export type Feedback = "up" | "down" | null;

export interface FeedbackEntry {
  id: string;
  messageId: string;
  userId?: string;
  userName?: string;
  rating: number;
  type: "incorrect" | "unhelpful" | "praise" | "other";
  comment?: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  url: string;
  name: string;
  type: "image" | "pdf" | "audio" | "other";
  size?: number;
}

export interface Message {
  id: string;
  role: "user" | "ai" | "expert";
  content: string;
  sources?: Source[];
  attachments?: Attachment[];
  tags?: string[];
  topicMentions?: string[];
  personalityIcon?: string;
  personalityId?: string;
  timestamp: number;
  feedback?: Feedback;
  /** Internal Chain of Thought / Reasoning */
  reasoning?: string;
  /** Populated when the web search tool ran for this AI response */
  webSearch?: WebSearchMeta;
  /** Curriculum chunks retrieved from the content bank for this response */
  contentBankItems?: ContentBankItem[];
  aiActionId?: string;
  thoughtProcess?: {
    id: string;
    type: 'content_bank' | 'web_search' | 'ai_reasoning' | 'tool_call';
    status: 'pending' | 'active' | 'done' | 'error';
    label: string;
    detail?: string;
  }[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  pinned?: boolean;
  isExpertSession?: boolean;
  expertId?: string;
  userHasUnread?: boolean;
  expertHasUnread?: boolean;
}

export interface BoardNote {
  id: string;
  title: string;
  content: string;
  color: string; // tailwind bg class suffix or hsl
  createdAt: number;
  source?: "manual" | "ai-pin";
  conversationId?: string;
  isStarred?: boolean;
}

export type ThemeName = "lavender" | "rose" | "mint" | "sky" | "amber";

export const THEMES: { name: ThemeName; label: string; color: string }[] = [
  { name: "lavender", label: "Lavender", color: "hsl(260, 60%, 55%)" },
  { name: "rose", label: "Rose", color: "hsl(350, 65%, 58%)" },
  { name: "mint", label: "Mint", color: "hsl(160, 55%, 42%)" },
  { name: "sky", label: "Sky", color: "hsl(205, 70%, 50%)" },
  { name: "amber", label: "Amber", color: "hsl(38, 80%, 50%)" },
];

export const GRADES = [
  "Class 11", "Class 12",
  "B.Com Year 1", "B.Com Year 2", "B.Com Year 3",
  "M.Com", "CA Foundation", "CA Inter", "CA Final",
  "CMA Foundation", "CMA Inter", "CMA Final",
  "CS Foundation", "CS Executive", "CS Professional",
];

export const COURSES = [
  "Accountancy", "Business Studies", "Economics", "Mathematics",
  "Informatics Practices", "Financial Accounting", "Cost Accounting",
  "Taxation", "Auditing", "Business Law", "Corporate Accounting",
  "Management Accounting", "Financial Management", "Statistics",
];

export const DEFAULT_PERSONALITIES: AIPersonality[] = [
  {
    id: "academic-tutor",
    name: "Academic Tutor",
    model: "llama-3.3-70b-versatile",
    systemInstructions: "You are a patient academic tutor for commerce students. Explain concepts clearly with examples.",
    description: "Best for conceptual clarity",
    icon: "🎓",
    tool_web_search: true,
    tool_chain_of_thought: true,
  },
  {
    id: "groq-analyst",
    name: "Groq Analyst",
    model: "mixtral-8x7b-32768",
    systemInstructions: "You are a sharp AI analyst with deep reasoning capabilities. Provide insightful, data-driven answers.",
    description: "Deep analysis and insights",
    icon: "🧠",
    tool_web_search: true,
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    model: "deepseek-r1-distill-llama-70b",
    systemInstructions: "You are a deep reasoning assistant. Show your full thought process and solve complex problems systematically.",
    description: "Deepest reasoning and CoT",
    icon: "🔬",
    tool_web_search: true,
    tool_chain_of_thought: true,
  },
  {
    id: "problem-solver",
    name: "Problem Solver",
    model: "llama-3.3-70b-versatile",
    systemInstructions: "You are a practical problem solver. Focus on step-by-step solutions for accounting and math problems.",
    description: "Best for practical problems",
    icon: "🧮",
    tool_web_search: false,
  },
  {
    id: "exam-coach",
    name: "Exam Prep Coach",
    model: "llama-3.1-8b-instant",
    systemInstructions: "You are an exam coach. Provide concise summaries, keywords, and likely exam questions.",
    description: "Best for last-minute revision",
    icon: "🎯",
    tool_web_search: true,
  },
  {
    id: "calendar-assistant",
    name: "Calendar Assistant",
    model: "llama-3.3-70b-versatile",
    systemInstructions: "You are the Benchrex Calendar Maestro. Manage schedules and resolve conflicts with precision.",
    description: "Expert in scheduling and event management",
    icon: "📅",
    tool_calendar_mgmt: true,
    category: "utility",
  },
  {
    id: "content-parser",
    name: "Content Parser",
    model: "llama-3.3-70b-versatile",
    systemInstructions: "You are the Benchrex Smart Content Architect. Transform raw knowledge into structured digital assets.",
    description: "Specialized in structuring educational documents",
    icon: "📂",
    tool_calendar_mgmt: false,
    category: "utility",
  },
];

export const NOTE_COLORS = [
  "hsl(45 90% 75%)",   // amber
  "hsl(160 55% 75%)",  // mint
  "hsl(205 75% 78%)",  // sky
  "hsl(350 75% 82%)",  // rose
  "hsl(260 65% 82%)",  // lavender
  "hsl(20 80% 78%)",   // peach
];
