import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

// --------------------------------------------------------
// Supabase Detection & Client Setup
// --------------------------------------------------------
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || "https://placeholder-openbalc.supabase.co", supabaseAnonKey || "placeholder-key", {
  auth: {
    persistSession: true,
    storageKey: "openbalc-auth-session",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  }
});

// Helper to ensure a user has a primary workspace and is a member of it
async function ensureUserPrimaryWorkspace(userId: number, displayName: string): Promise<void> {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (membership) {
    if (typeof window !== "undefined" && !window.localStorage.getItem("openbalc_active_workspace_id")) {
      window.localStorage.setItem("openbalc_active_workspace_id", String(membership.workspace_id));
    }
    return;
  }

  const { data: ownedWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  let workspaceId: number;

  if (ownedWorkspace) {
    workspaceId = ownedWorkspace.id;
  } else {
    const { data: newWorkspace, error } = await supabase
      .from("workspaces")
      .insert({
        owner_id: userId,
        name: `${displayName}'s Workspace`,
        type: "personal",
        credits: 100
      })
      .select("id")
      .single();

    if (error || !newWorkspace) {
      console.error("Error creating primary workspace for user:", error);
      return;
    }
    workspaceId = newWorkspace.id;
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      role: "owner",
      credits_allocated: 100,
      credits_used: 0
    });

  if (memberError) {
    console.error("Error creating workspace membership for user:", memberError);
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem("openbalc_active_workspace_id", String(workspaceId));
  }
}

// Helper to get matching DB User ID
async function getDbUserId(): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: existingUser } = await supabase.from("users").select("id, display_name").eq("email", user.email).maybeSingle();
  if (existingUser) {
    await ensureUserPrimaryWorkspace(existingUser.id, existingUser.display_name || "User");
    return existingUser.id;
  }
  
  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
  const username = user.user_metadata?.username || user.email?.split("@")[0] || "user";
  
  const { data: newUser } = await supabase.from("users").insert({
    email: user.email!,
    display_name: displayName,
    username: username,
    role: "user",
    credits: 100,
    onboarding_complete: false,
  }).select("id").single();
  
  if (newUser) {
    await ensureUserPrimaryWorkspace(newUser.id, displayName);
  }
  
  return newUser ? newUser.id : null;
}

// --------------------------------------------------------
// Local Storage Helper (Fallback Mode)
// --------------------------------------------------------
const isClient = typeof window !== "undefined";

function getStorageItem<T>(key: string, defaultValue: T): T {
  if (!isClient) return defaultValue;
  const val = localStorage.getItem(key);
  if (!val) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (isClient) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// --------------------------------------------------------
// Initial Data Sets (Simulation Fallbacks)
// --------------------------------------------------------
const DEFAULT_USER: any = {
  id: 1,
  email: "user@example.com",
  displayName: "Jane Doe",
  username: "janedoe",
  avatarUrl: null,
  phone: null,
  role: "admin",
  credits: 100,
  onboardingComplete: true,
  bufferMode: "quotes",
  courses: ["Computer Science"],
  microCourses: ["Machine Learning"],
  interests: ["AI & Technology"]
};

const DEFAULT_AI_MODELS = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "Google",
    status: "active",
    temperature: 0.7,
    maxTokens: 2048,
    systemInstruction: "You are an AI learning assistant that structures complex concepts into easy-to-learn outlines.",
    costPerRequest: 1,
    latencyAvg: 280,
    errorRate: 0.5
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    status: "fallback",
    temperature: 0.4,
    maxTokens: 8192,
    systemInstruction: "You are an expert tutor. Provide rich explanations, source citations, and comprehensive tests.",
    costPerRequest: 3,
    latencyAvg: 650,
    errorRate: 1.2
  }
];

const DEFAULT_AI_SERVICES = [
  {
    id: "module-creation",
    name: "Module Creator & Embedding Ingestion",
    description: "Generates outline chapters when a new topic/source is created.",
    activeModelId: "gemini-1.5-flash",
    cost: 5
  },
  {
    id: "chat-assistant",
    name: "Chat Assistant",
    description: "Handles questions in the interactive chat portal.",
    activeModelId: "gemini-1.5-flash",
    cost: 2
  }
];

const DEFAULT_AI_LOGS = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 5000).toISOString(),
    service: "Chat Assistant",
    modelId: "gemini-1.5-flash",
    prompt: "What is the difference between supervised and unsupervised learning?",
    response: "Supervised learning uses labeled training data...",
    status: "success",
    latency: 245,
    tokensUsed: 420,
    cost: 2
  }
];

const DEFAULT_CONVERSATIONS: any[] = [
  {
    id: 1,
    title: "Welcome to OpenBALC",
    pinned: false,
    lastMessage: "How can I help you learn today?",
    taggedModuleIds: [],
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const DEFAULT_MESSAGES: Record<string, any[]> = {
  "1": [
    {
      "id": 1,
      "conversationId": 1,
      "role": "assistant",
      "content": "Hi! I am the OpenBALC assistant. I can help you structure knowledge from uploaded documents, URLs, or custom topics. You can ask me anything about your modules or create tests to challenge yourself!",
      "sources": [],
      "createdAt": new Date(Date.now() - 3600000).toISOString()
    }
  ]
};

const DEFAULT_MODULES: any[] = [
  {
    id: 1,
    title: "Introduction to Machine Learning",
    description: "Basic concepts of machine learning including supervised and unsupervised learning, regressions, and neural networks.",
    subject: "Computer Science",
    method: "topic",
    visibility: "public",
    status: "active",
    creditsValue: 0,
    chapterCount: 3,
    sourceCount: 1,
    starCount: 5,
    useCount: 20,
    isStarred: false,
    processingPct: 100,
    fields: ["engineering"],
    domains: ["software"],
    tags: ["machine learning", "artificial intelligence"],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const DEFAULT_SOURCES: Record<string, any[]> = {
  "1": [
    {
      id: 1,
      moduleId: 1,
      type: "url",
      name: "Wikipedia - Machine Learning",
      url: "https://en.wikipedia.org/wiki/Machine_learning",
      processed: true,
      createdAt: new Date(Date.now() - 86300000).toISOString()
    }
  ]
};

const DEFAULT_CONTENT: Record<string, any[]> = {
  "1": [
    {
      id: 1,
      moduleId: 1,
      chapter: "Chapter 1",
      topic: "What is Machine Learning?",
      content: "Machine learning (ML) is a field of study in artificial intelligence concerned with the development and study of statistical algorithms that can learn from data and generalize to unseen data and perform tasks without explicit instructions.",
      createdAt: new Date(Date.now() - 86200000).toISOString()
    }
  ]
};

const DEFAULT_NOTES: any[] = [
  {
    id: 1,
    title: "ML Definition Note",
    content: "Machine learning focuses on statistical algorithms that learn from data and generalize to unseen data.",
    color: "#6366f1",
    pinned: true,
    starred: true,
    sourceTitle: "Wikipedia - Machine Learning",
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 1800000).toISOString()
  }
];

const DEFAULT_TESTS: any[] = [
  {
    id: 1,
    moduleId: 1,
    title: "Machine Learning Basics Quiz",
    difficulty: "medium",
    questionCount: 1,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    bestScore: 100,
    questions: [
      {
        id: 1,
        type: "mcq",
        question: "What is the primary difference between supervised and unsupervised learning?",
        options: {
          "A": "Supervised learning uses labeled training data.",
          "B": "Unsupervised learning requires humans to label the outcomes."
        },
        answer: "A"
      }
    ]
  }
];

const DEFAULT_AD_CAMPAIGNS: any[] = [
  {
    id: 1,
    title: "Learn React in 10 Days",
    description: "Master the React ecosystem with our free course starting this week.",
    cardDesign: { color: "bg-gradient-to-br from-blue-600 to-cyan-600" },
    status: "active",
    impressions: 1420,
    creditsDistributed: 710,
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
];

const DEFAULT_ORG: any = {
  id: 1,
  name: "Acme Learning Group",
  description: "Enterprise training workspace for modern engineering standards.",
  plan: "hosted",
  memberCount: 2,
  credits: 2500,
  allowedDomains: "acme.com, acme-corp.com",
  defaultMemberRole: "member",
  defaultMemberCreditCap: 500,
  allowMemberInvites: true,
  restrictSharing: false,
  requireMfa: false,
};

const DEFAULT_ORG_MEMBERS: any[] = [
  {
    userId: 1,
    displayName: "Jane Doe",
    email: "user@example.com",
    role: "admin",
    creditsUsed: 350,
    creditCap: 1000,
    lastActive: new Date(Date.now() - 600000).toISOString()
  }
];

const DEFAULT_CREDIT_TRANSACTIONS: any[] = [
  {
    id: 1,
    type: "earn",
    amount: 100,
    reason: "Welcome credits",
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const DEFAULT_NOTIFICATIONS: any[] = [
  {
    id: 1,
    title: "Welcome to OpenBALC",
    body: "Thank you for joining our platform. Start by building your first module!",
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

const DEFAULT_EXPERT_QUEUE: any[] = [
  {
    id: 1,
    userName: "Jane Doe",
    context: "Need assistance setting up a custom agent for Python Advanced Concepts.",
    status: "open",
    priority: "normal",
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

// --------------------------------------------------------
// Query Keys
// --------------------------------------------------------
export const getListConversationsQueryKey = () => ["listConversations"];
export const getGetConversationQueryKey = (id: number) => ["getConversation", id];
export const getGetMessagesQueryKey = (conversationId: number) => ["getMessages", conversationId];
export const getListNotificationsQueryKey = () => ["listNotifications"];
export const getListModulesQueryKey = () => ["listModules"];
export const getListPublicModulesQueryKey = () => ["listPublicModules"];
export const getListAdCampaignsQueryKey = () => ["listAdCampaigns"];
export const getAdminListAdCampaignsQueryKey = () => ["adminListAdCampaigns"];
export const getListNotesQueryKey = () => ["listNotes"];
export const getGetNoteQueryKey = (id: number) => ["getNote", id];
export const getListTestsQueryKey = () => ["listTests"];
export const getGetModuleSourcesQueryKey = (id: number) => ["getModuleSources", id];
export const getGetModuleContentQueryKey = (id: number) => ["getModuleContent", id];
export const getGetIngestionStatusQueryKey = (sourceId: number) => ["getIngestionStatus", sourceId];
export const getGetOrgQueryKey = () => ["getOrg"];
export const getListOrgMembersQueryKey = () => ["listOrgMembers"];
export const getListExpertQueueQueryKey = () => ["listExpertQueue"];
export const getGetMeQueryKey = () => ["getMe"];
export const getGetCreditsBalanceQueryKey = () => ["getCreditsBalance"];
export const getGetBufferModeQueryKey = () => ["getBufferMode"];
export const getListCreditTransactionsQueryKey = () => ["listCreditTransactions"];

// --------------------------------------------------------
// Auth / Me Hooks
// --------------------------------------------------------
export function useGetMe(options?: any): any {
  return useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_user", DEFAULT_USER);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: dbUser } = await supabase.from("users").select("*").eq("email", user.email).maybeSingle();
      if (dbUser) {
        await ensureUserPrimaryWorkspace(dbUser.id, dbUser.display_name || "User");
        return {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.display_name,
          username: dbUser.username,
          avatarUrl: dbUser.avatar_url,
          phone: dbUser.phone,
          role: dbUser.role,
          credits: dbUser.credits,
          onboardingComplete: dbUser.onboarding_complete,
          bufferMode: dbUser.buffer_mode,
          courses: dbUser.courses || [],
          microCourses: dbUser.micro_courses || [],
          interests: dbUser.interests || []
        };
      }
      
      // Fallback auto-creation inside fetch
      const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";
      const username = user.user_metadata?.username || user.email?.split("@")[0] || "user";
      
      const { data: newUser } = await supabase.from("users").insert({
        email: user.email!,
        display_name: displayName,
        username: username,
        role: "user",
        credits: 100,
        onboarding_complete: false,
      }).select("*").single();
      
      if (newUser) {
        await ensureUserPrimaryWorkspace(newUser.id, displayName);
      }
      
      return newUser ? {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        username: newUser.username,
        avatarUrl: newUser.avatar_url,
        phone: newUser.phone,
        role: newUser.role,
        credits: newUser.credits,
        onboardingComplete: newUser.onboarding_complete,
        bufferMode: newUser.buffer_mode,
        courses: newUser.courses || [],
        microCourses: newUser.micro_courses || [],
        interests: newUser.interests || []
      } : null;
    },
    ...options
  });
}

export function useUpdateMe(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        const updated = { ...user, ...data };
        setStorageItem("openbalc_user", updated);
        return updated;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const mapped: any = {
        display_name: data.displayName,
        username: data.username,
        avatar_url: data.avatarUrl,
        phone: data.phone,
        courses: data.courses,
        micro_courses: data.microCourses,
        interests: data.interests
      };
      
      Object.keys(mapped).forEach(key => mapped[key] === undefined && delete mapped[key]);
      
      const { data: updated, error } = await supabase.from("users").update(mapped).eq("id", userId).select("*").single();
      if (error) throw error;
      return {
        id: updated.id,
        email: updated.email,
        displayName: updated.display_name,
        username: updated.username,
        avatarUrl: updated.avatar_url,
        phone: updated.phone,
        role: updated.role,
        credits: updated.credits,
        onboardingComplete: updated.onboarding_complete,
        bufferMode: updated.buffer_mode,
        courses: updated.courses || [],
        microCourses: updated.micro_courses || [],
        interests: updated.interests || []
      };
    },
    ...options
  });
}

export function useCompleteOnboarding(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        const updated = { ...user, ...data, onboardingComplete: true };
        setStorageItem("openbalc_user", updated);
        return updated;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { data: updated, error } = await supabase.from("users").update({
        onboarding_complete: true,
        courses: data.courses || [],
        micro_courses: data.microCourses || [],
        interests: data.interests || []
      }).eq("id", userId).select("*").single();
      
      if (error) throw error;
      return {
        id: updated.id,
        email: updated.email,
        displayName: updated.display_name,
        username: updated.username,
        avatarUrl: updated.avatar_url,
        phone: updated.phone,
        role: updated.role,
        credits: updated.credits,
        onboardingComplete: updated.onboarding_complete,
        bufferMode: updated.buffer_mode,
        courses: updated.courses || [],
        microCourses: updated.micro_courses || [],
        interests: updated.interests || []
      };
    },
    ...options
  });
}

export function useGetCreditsBalance(options?: any): any {
  return useQuery({
    queryKey: getGetCreditsBalanceQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
        const used = txs
          .filter(t => t.type === "spend" && new Date(t.createdAt).getMonth() === new Date().getMonth())
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          balance: user.credits,
          usedThisMonth: used
        };
      }
      
      const userId = await getDbUserId();
      if (!userId) return { balance: 0, usedThisMonth: 0 };
      
      const { data: user } = await supabase.from("users").select("credits").eq("id", userId).single();
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: txs } = await supabase.from("credit_transactions").select("amount").eq("user_id", userId).eq("type", "spend").gte("created_at", firstDayOfMonth);
      
      const used = txs?.reduce((sum, t) => sum + t.amount, 0) || 0;
      return {
        balance: user?.credits || 0,
        usedThisMonth: used
      };
    },
    ...options
  });
}

export function useListCreditTransactions(options?: any): any {
  return useQuery({
    queryKey: getListCreditTransactionsQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data } = await supabase.from("credit_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return (data || []).map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.created_at
      }));
    },
    ...options
  });
}

export function useGetBufferMode(options?: any): any {
  return useQuery({
    queryKey: getGetBufferModeQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        return { mode: user.bufferMode };
      }
      
      const userId = await getDbUserId();
      if (!userId) return { mode: "quotes" };
      
      const { data } = await supabase.from("users").select("buffer_mode").eq("id", userId).single();
      return { mode: data?.buffer_mode || "quotes" };
    },
    ...options
  });
}

export function useUpdateBufferMode(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: { mode: string } }) => {
      if (!hasSupabase) {
        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        const updated = { ...user, bufferMode: data.mode };
        setStorageItem("openbalc_user", updated);
        return { mode: data.mode };
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      await supabase.from("users").update({ buffer_mode: data.mode }).eq("id", userId);
      return { mode: data.mode };
    },
    ...options
  });
}

// --------------------------------------------------------
// Conversations Hooks
// --------------------------------------------------------
export function useListConversations(options?: any): any {
  return useQuery({
    queryKey: getListConversationsQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data } = await supabase.from("conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
      return (data || []).map(c => ({
        id: c.id,
        title: c.title,
        pinned: c.pinned,
        lastMessage: c.last_message,
        taggedModuleIds: c.tagged_module_ids || [],
        updatedAt: c.updated_at,
        createdAt: c.created_at
      }));
    },
    ...options
  });
}

export function useGetConversation(id: number, options?: any): any {
  return useQuery({
    queryKey: getGetConversationQueryKey(id),
    queryFn: async () => {
      if (!hasSupabase) {
        const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
        const found = convs.find(c => c.id === id);
        if (!found) throw new Error("Conversation not found");
        return found;
      }
      
      const { data, error } = await supabase.from("conversations").select("*").eq("id", id).single();
      if (error || !data) throw new Error("Conversation not found");
      return {
        id: data.id,
        title: data.title,
        pinned: data.pinned,
        lastMessage: data.last_message,
        taggedModuleIds: data.tagged_module_ids || [],
        updatedAt: data.updated_at,
        createdAt: data.created_at
      };
    },
    ...options
  });
}

export function useGetMessages(conversationId: number, options?: any): any {
  return useQuery({
    queryKey: getGetMessagesQueryKey(conversationId),
    queryFn: async () => {
      if (!hasSupabase) {
        const msgs = getStorageItem<Record<string, any[]>>("openbalc_messages", DEFAULT_MESSAGES);
        return msgs[String(conversationId)] || [];
      }
      
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      return (data || []).map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        reasoning: m.reasoning,
        createdAt: m.created_at
      }));
    },
    ...options
  });
}

export function useCreateConversation(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: { title: string; taggedModuleIds?: number[] } }) => {
      if (!hasSupabase) {
        const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
        const newId = convs.length > 0 ? Math.max(...convs.map(c => c.id)) + 1 : 1;
        const newConv = {
          id: newId,
          title: data.title || "New conversation",
          pinned: false,
          lastMessage: "",
          taggedModuleIds: data.taggedModuleIds || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        convs.push(newConv);
        setStorageItem("openbalc_conversations", convs);

        const msgs = getStorageItem<Record<string, any[]>>("openbalc_messages", DEFAULT_MESSAGES);
        msgs[String(newId)] = [
          {
            id: 1000 + newId,
            conversationId: newId,
            role: "assistant",
            content: data.taggedModuleIds && data.taggedModuleIds.length > 0 
              ? `Hello! Let's talk about the tagged module(s). Feel free to ask any questions!` 
              : `Hello! I'm here to chat. Ask me anything!`,
            sources: [],
            createdAt: new Date().toISOString()
          }
        ];
        setStorageItem("openbalc_messages", msgs);
        return newConv;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { data: conv, error } = await supabase.from("conversations").insert({
        user_id: userId,
        title: data.title || "New conversation",
        pinned: false,
        last_message: "",
        tagged_module_ids: data.taggedModuleIds || []
      }).select("*").single();
      
      if (error) throw error;
      
      await supabase.from("messages").insert({
        conversation_id: conv.id,
        role: "assistant",
        content: data.taggedModuleIds && data.taggedModuleIds.length > 0 
          ? `Hello! Let's talk about the tagged module(s). Feel free to ask any questions!` 
          : `Hello! I'm here to chat. Ask me anything!`,
        sources: []
      });
      
      return {
        id: conv.id,
        title: conv.title,
        pinned: conv.pinned,
        lastMessage: conv.last_message,
        taggedModuleIds: conv.tagged_module_ids || [],
        updatedAt: conv.updated_at,
        createdAt: conv.created_at
      };
    },
    ...options
  });
}

export function useDeleteConversation(options?: any): any {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      if (!hasSupabase) {
        const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
        const filtered = convs.filter(c => c.id !== id);
        setStorageItem("openbalc_conversations", filtered);

        const msgs = getStorageItem<Record<string, any[]>>("openbalc_messages", DEFAULT_MESSAGES);
        delete msgs[String(id)];
        setStorageItem("openbalc_messages", msgs);
        return { success: true };
      }
      
      await supabase.from("conversations").delete().eq("id", id);
      return { success: true };
    },
    ...options
  });
}

export function useUpdateConversation(options?: any): any {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!hasSupabase) {
        const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
        const idx = convs.findIndex(c => c.id === id);
        if (idx !== -1) {
          convs[idx] = { ...convs[idx], ...data, updatedAt: new Date().toISOString() };
          setStorageItem("openbalc_conversations", convs);
          return convs[idx];
        }
        throw new Error("Conversation not found");
      }
      
      const mapped: any = {
        title: data.title,
        pinned: data.pinned,
        last_message: data.lastMessage,
        tagged_module_ids: data.taggedModuleIds
      };
      
      Object.keys(mapped).forEach(key => mapped[key] === undefined && delete mapped[key]);
      
      const { data: updated, error } = await supabase.from("conversations").update(mapped).eq("id", id).select("*").single();
      if (error) throw error;
      
      return {
        id: updated.id,
        title: updated.title,
        pinned: updated.pinned,
        lastMessage: updated.last_message,
        taggedModuleIds: updated.tagged_module_ids || [],
        updatedAt: updated.updated_at,
        createdAt: updated.created_at
      };
    },
    ...options
  });
}

function generateDynamicReply(userPrompt: string) {
  const prompt = userPrompt.toLowerCase();
  let content = "";
  let artifactData: { type: string; title: string; content: string } | null = null;

  if (prompt.includes("mindmap") || prompt.includes("mind map") || prompt.includes("diagram")) {
    const mindmapTitle = "Quantum Computing Foundations Mindmap";
    const mindmapJson = JSON.stringify({
      nodes: [
        { id: "1", text: "Quantum Computing", group: "Root" },
        { id: "2", text: "Superposition", group: "Principles" },
        { id: "3", text: "Entanglement", group: "Principles" },
        { id: "4", text: "Qubits", group: "Hardware" },
        { id: "5", text: "Quantum Gates", group: "Operations" }
      ],
      connections: [
        { from: "1", to: "2" },
        { from: "1", to: "3" },
        { from: "1", to: "4" },
        { from: "1", to: "5" }
      ]
    }, null, 2);

    content = `I have generated an interactive mindmap diagram outlining the core components of Quantum Computing. You can explore the nodes and relationships below:

<artifact type="diagram" title="${mindmapTitle}">
${mindmapJson}
</artifact>`;

    artifactData = {
      type: "diagram",
      title: mindmapTitle,
      content: mindmapJson
    };
  } else if (prompt.includes("quiz") || prompt.includes("test") || prompt.includes("question")) {
    const quizTitle = "Quantum Mechanics Basics Quiz";
    const quizJson = JSON.stringify([
      {
        id: 1,
        question: "What is superposition in quantum mechanics?",
        options: {
          A: "A qubit exists in both 0 and 1 states simultaneously until measured",
          B: "The instantaneous correlation between distant qubits",
          C: "The process of copying quantum states exactly"
        },
        answer: "A"
      },
      {
        id: 2,
        question: "Which of the following gates is used to put a qubit into superposition?",
        options: {
          A: "CNOT gate",
          B: "Hadamard (H) gate",
          C: "Pauli-X gate"
        },
        answer: "B"
      }
    ], null, 2);

    content = `Here is a custom practice quiz to test your understanding of Quantum Mechanics basics. Try answering the questions inline:

<artifact type="test" title="${quizTitle}">
${quizJson}
</artifact>`;

    artifactData = {
      type: "test",
      title: quizTitle,
      content: quizJson
    };
  } else if (prompt.includes("code") || prompt.includes("typescript") || prompt.includes("program")) {
    const codeTitle = "Advanced TypeScript Utility Types";
    const codeContent = `// TypeScript Mapped Types Example
type ReadonlyOptional<T> = {
  readonly [P in keyof T]?: T[P];
};

interface User {
  id: number;
  name: string;
  email: string;
}

// Resulting type has all fields as optional and readonly
type ReadonlyUser = ReadonlyOptional<User>;`;

    content = `Here is an example code snippet illustrating advanced TypeScript mapped and utility types:

<artifact type="code" title="${codeTitle}">
${codeContent}
</artifact>`;

    artifactData = {
      type: "code",
      title: codeTitle,
      content: codeContent
    };
  } else if (prompt.includes("flashcard") || prompt.includes("flash card") || prompt.includes("vocab")) {
    const docTitle = "Quantum Computing Terms Flashcards";
    const docJson = JSON.stringify([
      { front: "Qubit", back: "The basic unit of quantum information, capable of superposition of 0 and 1." },
      { front: "Entanglement", back: "A quantum connection where state changes to one particle instantly affect the other." },
      { front: "Shor's Algorithm", back: "A famous quantum algorithm capable of factoring large integers in polynomial time." }
    ], null, 2);

    content = `I have compiled a list of vocabulary flashcards covering key Quantum Computing terms. Click the cards below to flip them:

<artifact type="document" title="${docTitle}">
${docJson}
</artifact>`;

    artifactData = {
      type: "document",
      title: docTitle,
      content: docJson
    };
  } else {
    content = `Let's discuss "${userPrompt.replace(/@\w+/g, "").trim()}". Based on your learning profile and linked study materials, here is a detailed overview. Let me know if you would like me to generate a mindmap, a practice quiz, or custom flashcards on this topic!`;
  }

  return { content, artifactData };
}

export function useSendMessage(options?: any): any {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { content: string; webSearch?: boolean } }) => {
      if (!hasSupabase) {
        const msgs = getStorageItem<Record<string, any[]>>("openbalc_messages", DEFAULT_MESSAGES);
        const conversationMsgs = msgs[String(id)] || [];
        const newMsgId = conversationMsgs.length > 0 ? Math.max(...conversationMsgs.map(m => m.id)) + 1 : 1;

        const sources: string[] = [];
        const modules = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        modules.forEach(m => {
          if (data.content.includes(`@${m.title}`)) {
            sources.push(m.title);
          }
        });

        const userMsg = {
          id: newMsgId,
          conversationId: id,
          role: "user",
          content: data.content,
          sources: [],
          createdAt: new Date().toISOString()
        };
        conversationMsgs.push(userMsg);

        const { content: replyContent, artifactData } = generateDynamicReply(data.content);

        const logs = getStorageItem("openbalc_ai_logs", DEFAULT_AI_LOGS);
        const newLogId = logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1;
        
        logs.unshift({
          id: newLogId,
          timestamp: new Date().toISOString(),
          service: "Chat Assistant",
          modelId: "gemini-1.5-flash",
          prompt: data.content,
          response: replyContent,
          status: "success",
          latency: 280,
          tokensUsed: 450,
          cost: 2
        });
        setStorageItem("openbalc_ai_logs", logs);

        const aiMsg = {
          id: newMsgId + 1,
          conversationId: id,
          role: "assistant",
          content: replyContent,
          sources: sources,
          createdAt: new Date(Date.now() + 1000).toISOString()
        };
        conversationMsgs.push(aiMsg);
        msgs[String(id)] = conversationMsgs;
        setStorageItem("openbalc_messages", msgs);

        if (artifactData) {
          const artList = getStorageItem("openbalc_artifacts", MOCK_ARTIFACTS);
          const newArtId = artList.length > 0 ? Math.max(...artList.map((a: any) => typeof a.id === "number" ? a.id : 0)) + 1 : 1;
          artList.unshift({
            id: newArtId,
            moduleId: null,
            workspaceId: null,
            conversationId: id,
            title: artifactData.title,
            type: artifactData.type,
            content: artifactData.content,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          setStorageItem("openbalc_artifacts", artList);
        }

        const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
        const convIdx = convs.findIndex(c => c.id === id);
        if (convIdx !== -1) {
          convs[convIdx].lastMessage = data.content;
          convs[convIdx].updatedAt = new Date().toISOString();
          setStorageItem("openbalc_conversations", convs);
        }

        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        if (user.credits >= 2) {
          user.credits -= 2;
          setStorageItem("openbalc_user", user);

          const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
          txs.unshift({
            id: txs.length + 1,
            type: "spend",
            amount: 2,
            reason: `Chat Message processing (Gemini 1.5 Flash)`,
            createdAt: new Date().toISOString()
          });
          setStorageItem("openbalc_credit_transactions", txs);
        }

        return aiMsg;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const sources: string[] = [];
      const { data: modules } = await supabase.from("modules").select("title").eq("user_id", userId);
      modules?.forEach(m => {
        if (data.content.includes(`@${m.title}`)) {
          sources.push(m.title);
        }
      });

      // Insert User message
      await supabase.from("messages").insert({
        conversation_id: id,
        role: "user",
        content: data.content,
        sources: []
      });

      const { content: replyContent, artifactData } = generateDynamicReply(data.content);

      // Insert Assistant response
      const { data: aiMsg, error } = await supabase.from("messages").insert({
        conversation_id: id,
        role: "assistant",
        content: replyContent,
        sources: sources
      }).select("*").single();

      if (error) throw error;

      if (artifactData) {
        await supabase.from("artifacts").insert({
          user_id: userId,
          conversation_id: id,
          title: artifactData.title,
          type: artifactData.type,
          content: artifactData.content,
          version: 1
        });
      }

      // Update last message in Conversation
      await supabase.from("conversations").update({
        last_message: data.content
      }).eq("id", id);

      // Deduct Credits & Record Transactions
      const { data: user } = await supabase.from("users").select("credits").eq("id", userId).single();
      if (user && user.credits >= 2) {
        await supabase.from("users").update({ credits: user.credits - 2 }).eq("id", userId);
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          type: "spend",
          amount: 2,
          reason: `Chat Message processing (Gemini 1.5 Flash)`,
          ref_id: String(aiMsg.id)
        });
      }

      return {
        id: aiMsg.id,
        conversationId: aiMsg.conversation_id,
        role: aiMsg.role,
        content: aiMsg.content,
        sources: aiMsg.sources || [],
        createdAt: aiMsg.created_at
      };
    },
    ...options
  });
}

// --------------------------------------------------------
// Notifications Hooks
// --------------------------------------------------------
export function useListNotifications(options?: any): any {
  return useQuery({
    queryKey: getListNotificationsQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_notifications", DEFAULT_NOTIFICATIONS);
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return data || [];
    },
    ...options
  });
}

export function useMarkAllNotificationsRead(options?: any): any {
  return useMutation({
    mutationFn: async () => {
      if (!hasSupabase) {
        const notifs = getStorageItem("openbalc_notifications", DEFAULT_NOTIFICATIONS);
        const updated = notifs.map(n => ({ ...n, read: true }));
        setStorageItem("openbalc_notifications", updated);
        return updated;
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
      const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return data || [];
    },
    ...options
  });
}

// --------------------------------------------------------
// Modules Hooks
// --------------------------------------------------------
export function useListModules(params?: any, options?: any): any {
  return useQuery({
    queryKey: getListModulesQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_modules", DEFAULT_MODULES);
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data } = await supabase.from("modules").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
      return (data || []).map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        subject: m.subject,
        method: m.method,
        visibility: m.visibility,
        status: m.status,
        creditsValue: m.credits_value,
        processingPct: m.processing_pct,
        tags: m.tags || [],
        chapterCount: m.chapter_count,
        topicCount: m.topic_count,
        sourceCount: m.source_count,
        starCount: m.star_count,
        useCount: m.use_count,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }));
    },
    ...options
  });
}

export function useListPublicModules(params?: any, options?: any): any {
  return useQuery({
    queryKey: getListPublicModulesQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        let filtered = mods.filter(m => m.visibility === "public");
        if (params?.search) {
          const query = params.search.toLowerCase();
          filtered = filtered.filter(m => m.title.toLowerCase().includes(query) || m.description?.toLowerCase().includes(query));
        }
        if (params?.sort === "most_used") {
          filtered.sort((a, b) => b.useCount - a.useCount);
        } else if (params?.sort === "stars") {
          filtered.sort((a, b) => b.starCount - a.starCount);
        } else {
          filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return filtered;
      }
      
      let queryBuilder = supabase.from("modules").select("*").eq("visibility", "public");
      if (params?.search) {
        queryBuilder = queryBuilder.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }
      if (params?.sort === "most_used") {
        queryBuilder = queryBuilder.order("use_count", { ascending: false });
      } else if (params?.sort === "stars") {
        queryBuilder = queryBuilder.order("star_count", { ascending: false });
      } else {
        queryBuilder = queryBuilder.order("created_at", { ascending: false });
      }
      
      const { data } = await queryBuilder;
      return (data || []).map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        subject: m.subject,
        method: m.method,
        visibility: m.visibility,
        status: m.status,
        creditsValue: m.credits_value,
        processingPct: m.processing_pct,
        tags: m.tags || [],
        chapterCount: m.chapter_count,
        topicCount: m.topic_count,
        sourceCount: m.source_count,
        starCount: m.star_count,
        useCount: m.use_count,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }));
    },
    ...options
  });
}

export function useGetModule(id: number, options?: any): any {
  return useQuery({
    queryKey: ["getModule", id],
    queryFn: async () => {
      if (!hasSupabase) {
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        const found = mods.find(m => m.id === id);
        if (!found) throw new Error("Module not found");
        return found;
      }
      
      const { data, error } = await supabase.from("modules").select("*").eq("id", id).single();
      if (error || !data) throw new Error("Module not found");
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        subject: data.subject,
        method: data.method,
        visibility: data.visibility,
        status: data.status,
        creditsValue: data.credits_value,
        processingPct: data.processing_pct,
        tags: data.tags || [],
        chapterCount: data.chapter_count,
        topicCount: data.topic_count,
        sourceCount: data.source_count,
        starCount: data.star_count,
        useCount: data.use_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },
    ...options
  });
}

export function useCreateModule(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        const newId = mods.length > 0 ? Math.max(...mods.map(m => m.id)) + 1 : 1;
        const newMod = {
          id: newId,
          title: data.title,
          description: data.description || "",
          subject: data.subject || "General Study",
          method: data.method || "topic",
          visibility: "private",
          status: data.method === "topic" ? "active" : "processing",
          creditsValue: 0,
          chapterCount: data.method === "topic" ? 2 : 0,
          sourceCount: 0,
          starCount: 0,
          useCount: 0,
          isStarred: false,
          processingPct: data.method === "topic" ? 100 : 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        mods.push(newMod);
        setStorageItem("openbalc_modules", mods);

        const srcs = getStorageItem<Record<string, any[]>>("openbalc_module_sources", DEFAULT_SOURCES);
        srcs[String(newId)] = [];
        setStorageItem("openbalc_module_sources", srcs);

        const content = getStorageItem<Record<string, any[]>>("openbalc_module_content", DEFAULT_CONTENT);
        if (data.method === "topic") {
          content[String(newId)] = [
            {
              id: newId * 100 + 1,
              moduleId: newId,
              chapter: "Chapter 1",
              topic: `Core concepts of ${data.title}`,
              content: `Here is a comprehensive breakdown of the core concepts relating to ${data.title}. This includes fundamental principles, frameworks, and key methodologies used in the industry today.`,
              createdAt: new Date().toISOString()
            },
            {
              id: newId * 100 + 2,
              moduleId: newId,
              chapter: "Chapter 2",
              topic: `Practical applications of ${data.title}`,
              content: `In this section, we review the practical execution and industry applications of ${data.title}. We look at practical code frameworks, design architectures, and common real-world usage scenarios.`,
              createdAt: new Date().toISOString()
            }
          ];
        } else {
          content[String(newId)] = [];
        }
        setStorageItem("openbalc_module_content", content);
        return newMod;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { data: newMod, error } = await supabase.from("modules").insert({
        user_id: userId,
        title: data.title,
        description: data.description || "",
        subject: data.subject || "General Study",
        method: data.method || "topic",
        visibility: "private",
        status: data.method === "topic" ? "active" : "processing",
        credits_value: 0,
        processing_pct: data.method === "topic" ? 100 : 10,
        chapter_count: data.method === "topic" ? 2 : 0,
        source_count: 0,
        star_count: 0,
        use_count: 0
      }).select("*").single();

      if (error) throw error;

      if (data.method === "topic") {
        await supabase.from("module_content").insert([
          {
            module_id: newMod.id,
            chapter: "Chapter 1",
            topic: `Core concepts of ${data.title}`,
            content: `Here is a comprehensive breakdown of the core concepts relating to ${data.title}. This includes fundamental principles, frameworks, and key methodologies used in the industry today.`,
          },
          {
            module_id: newMod.id,
            chapter: "Chapter 2",
            topic: `Practical applications of ${data.title}`,
            content: `In this section, we review the practical execution and industry applications of ${data.title}. We look at practical code frameworks, design architectures, and common real-world usage scenarios.`,
          }
        ]);
      }

      return {
        id: newMod.id,
        title: newMod.title,
        description: newMod.description,
        subject: newMod.subject,
        method: newMod.method,
        visibility: newMod.visibility,
        status: newMod.status,
        creditsValue: newMod.credits_value,
        processingPct: newMod.processing_pct,
        chapterCount: newMod.chapter_count,
        sourceCount: newMod.source_count,
        starCount: newMod.star_count,
        useCount: newMod.use_count,
        createdAt: newMod.created_at,
        updatedAt: newMod.updated_at
      };
    },
    ...options
  });
}

export function useDeleteModule(options?: any): any {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      if (!hasSupabase) {
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        const filtered = mods.filter(m => m.id !== id);
        setStorageItem("openbalc_modules", filtered);
        return { success: true };
      }
      
      await supabase.from("modules").delete().eq("id", id);
      return { success: true };
    },
    ...options
  });
}

export function usePublishModule(options?: any): any {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data?: { fields?: string[], domains?: string[], tags?: string[] } }) => {
      if (!hasSupabase) {
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        const idx = mods.findIndex(m => m.id === id);
        if (idx !== -1) {
          mods[idx].visibility = "public";
          if (data) {
            mods[idx].fields = data.fields ?? [];
            mods[idx].domains = data.domains ?? [];
            mods[idx].tags = data.tags ?? [];
          }
          setStorageItem("openbalc_modules", mods);
          return mods[idx];
        }
        throw new Error("Module not found");
      }
      
      const mapped = {
        visibility: "public",
        tags: data?.tags || []
      };
      
      const { data: updated, error } = await supabase.from("modules").update(mapped).eq("id", id).select("*").single();
      if (error) throw error;
      
      return {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        subject: updated.subject,
        method: updated.method,
        visibility: updated.visibility,
        status: updated.status,
        creditsValue: updated.credits_value,
        processingPct: updated.processing_pct,
        tags: updated.tags || [],
        chapterCount: updated.chapter_count,
        sourceCount: updated.source_count,
        starCount: updated.star_count,
        useCount: updated.use_count,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
    },
    ...options
  });
}

export function useStarModule(options?: any): any {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      if (!hasSupabase) {
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        const idx = mods.findIndex(m => m.id === id);
        if (idx !== -1) {
          const current = mods[idx].isStarred;
          mods[idx].isStarred = !current;
          mods[idx].starCount += !current ? 1 : -1;
          setStorageItem("openbalc_modules", mods);
          return mods[idx];
        }
        throw new Error("Module not found");
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { data: existingStar } = await supabase.from("module_stars").select("id").eq("module_id", id).eq("user_id", userId).maybeSingle();
      const { data: mod } = await supabase.from("modules").select("star_count").eq("id", id).single();
      const starCount = mod?.star_count || 0;

      if (existingStar) {
        await supabase.from("module_stars").delete().eq("id", existingStar.id);
        const { data: updated } = await supabase.from("modules").update({ star_count: Math.max(0, starCount - 1) }).eq("id", id).select("*").single();
        return { ...updated, isStarred: false };
      } else {
        await supabase.from("module_stars").insert({ module_id: id, user_id: userId });
        const { data: updated } = await supabase.from("modules").update({ star_count: starCount + 1 }).eq("id", id).select("*").single();
        return { ...updated, isStarred: true };
      }
    },
    ...options
  });
}

export function useGetModuleSources(id: number, options?: any): any {
  return useQuery({
    queryKey: getGetModuleSourcesQueryKey(id),
    queryFn: async () => {
      if (!hasSupabase) {
        const srcs = getStorageItem<Record<string, any[]>>("openbalc_module_sources", DEFAULT_SOURCES);
        return srcs[String(id)] || [];
      }
      
      const { data } = await supabase.from("module_sources").select("*").eq("module_id", id);
      return (data || []).map(s => ({
        id: s.id,
        moduleId: s.module_id,
        type: s.type,
        name: s.name,
        url: s.url,
        processed: s.processed,
        createdAt: s.created_at
      }));
    },
    ...options
  });
}

export function useGetModuleContent(id: number, options?: any): any {
  return useQuery({
    queryKey: getGetModuleContentQueryKey(id),
    queryFn: async () => {
      if (!hasSupabase) {
        const content = getStorageItem<Record<string, any[]>>("openbalc_module_content", DEFAULT_CONTENT);
        return content[String(id)] || [];
      }
      
      const { data } = await supabase.from("module_content").select("*").eq("module_id", id);
      return (data || []).map(c => ({
        id: c.id,
        moduleId: c.module_id,
        chapter: c.chapter,
        topic: c.topic,
        content: c.content,
        createdAt: c.created_at
      }));
    },
    ...options
  });
}

export function useAddModuleSource(options?: any): any {
  const qc = hasSupabase ? useQueryClient() : null;
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!hasSupabase) {
        const cost = 7; // Simulated cost
        const srcs = getStorageItem<Record<string, any[]>>("openbalc_module_sources", DEFAULT_SOURCES);
        const moduleSrcs = srcs[String(id)] || [];
        const sourceId = moduleSrcs.length > 0 ? Math.max(...moduleSrcs.map(s => s.id)) + 1 : 1;
        const newSrc = {
          id: sourceId,
          moduleId: id,
          type: data.type,
          name: data.name,
          url: data.url || null,
          processed: false,
          ingestionStatus: "processing",
          createdAt: new Date().toISOString()
        };
        moduleSrcs.push(newSrc);
        srcs[String(id)] = moduleSrcs;
        setStorageItem("openbalc_module_sources", srcs);
   
        const content = getStorageItem<Record<string, any[]>>("openbalc_module_content", DEFAULT_CONTENT);
        const moduleContent = content[String(id)] || [];
        const nextChNum = moduleContent.length > 0 ? Math.max(...moduleContent.map(c => parseInt(c.chapter.replace("Chapter ", "")) || 0)) + 1 : 1;

        moduleContent.push({
          id: id * 100 + nextChNum,
          moduleId: id,
          chapter: `Chapter ${nextChNum}`,
          topic: `Summary of ${data.name}`,
          content: `This chapter covers content ingested from the source "${data.name}". It is organized as an outline summarizing key facts, definitions, and references found in the document.`,
          createdAt: new Date().toISOString()
        });
        content[String(id)] = moduleContent;
        setStorageItem("openbalc_module_content", content);
   
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        const mIdx = mods.findIndex(m => m.id === id);
        if (mIdx !== -1) {
          mods[mIdx].sourceCount += 1;
          mods[mIdx].chapterCount += 1;
          mods[mIdx].status = "active";
          mods[mIdx].processingPct = 100;
          setStorageItem("openbalc_modules", mods);
        }

        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        if (user.credits >= cost) {
          user.credits -= cost;
          setStorageItem("openbalc_user", user);

          const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
          txs.unshift({
            id: txs.length + 1,
            type: "spend",
            amount: cost,
            reason: `Document embedding (Gemini text-embedding-004)`,
            createdAt: new Date().toISOString()
          });
          setStorageItem("openbalc_credit_transactions", txs);
        }
   
        // Mark as done immediately in local-storage mode
        const updatedSrcs = getStorageItem<Record<string, any[]>>("openbalc_module_sources", DEFAULT_SOURCES);
        const srcIdx = (updatedSrcs[String(id)] || []).findIndex((s: any) => s.id === sourceId);
        if (srcIdx !== -1) {
          updatedSrcs[String(id)][srcIdx].processed = true;
          updatedSrcs[String(id)][srcIdx].ingestionStatus = "done";
          setStorageItem("openbalc_module_sources", updatedSrcs);
        }

        return newSrc;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");

      // ── Insert source record with ingestion_status = 'pending' ─────────────
      const { data: newSrc, error } = await supabase.from("module_sources").insert({
        module_id: id,
        type: data.type,
        name: data.name,
        url: data.url || null,
        processed: false,
        ingestion_status: "pending",
      }).select("*").single();

      if (error) throw error;

      // ── Fire ingestion pipeline (non-blocking) ─────────────────────────────
      // Dynamic import so the ingestion module is only loaded when needed.
      const geminiApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;

      if (geminiApiKey) {
        import("./ingestion")
          .then(({ ingestSource }) =>
            ingestSource(
              {
                id: newSrc.id,
                moduleId: id,
                type: data.type,
                name: data.name,
                content: data.content,
                url: data.url,
                file: data.file, // File object from AddSourceModal
              },
              geminiApiKey
            )
          )
          .then(() => {
            // Refresh sources list once ingestion completes
            qc?.invalidateQueries({ queryKey: getGetModuleSourcesQueryKey(id) });
            qc?.invalidateQueries({ queryKey: ["getModule", id] });
          })
          .catch((err: unknown) => {
            console.error("[useAddModuleSource] Ingestion pipeline error:", err);
          });
      } else {
        // No Gemini key — mark as done with placeholder content
        await supabase.from("module_sources")
          .update({ processed: true, ingestion_status: "done" })
          .eq("id", newSrc.id);

        await supabase.from("module_content").insert({
          module_id: id,
          chapter: `Chapter Outline`,
          topic: `Summary of ${data.name}`,
          content: `This chapter covers content ingested from the source "${data.name}". Set VITE_GEMINI_API_KEY to enable automatic AI content extraction and embedding.`,
        });

        const { data: mod } = await supabase.from("modules").select("source_count, chapter_count").eq("id", id).single();
        await supabase.from("modules").update({
          source_count: (mod?.source_count || 0) + 1,
          chapter_count: (mod?.chapter_count || 0) + 1,
          status: "active",
          processing_pct: 100
        }).eq("id", id);
      }

      // ── Deduct credits ─────────────────────────────────────────────────────
      const { data: user } = await supabase.from("users").select("credits").eq("id", userId).single();
      if (user && user.credits >= 5) {
        await supabase.from("users").update({ credits: user.credits - 5 }).eq("id", userId);
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          type: "spend",
          amount: 5,
          reason: `Document embedding (Gemini text-embedding-004)`,
          ref_id: String(newSrc.id)
        });
      }

      return {
        id: newSrc.id,
        moduleId: newSrc.module_id,
        type: newSrc.type,
        name: newSrc.name,
        url: newSrc.url,
        processed: newSrc.processed,
        ingestionStatus: newSrc.ingestion_status,
        createdAt: newSrc.created_at
      };
    },
    ...options
  });
}

// --------------------------------------------------------
// Ingestion Status Hook
// --------------------------------------------------------

/**
 * Polls the ingestion_status column on a module_source row.
 * Refetches every 3 seconds while status is 'pending' or 'processing'.
 * Returns: 'pending' | 'processing' | 'done' | 'failed' | null
 */
export function useIngestionStatus(sourceId: number | null, options?: any): any {
  return useQuery({
    queryKey: getGetIngestionStatusQueryKey(sourceId ?? 0),
    enabled: !!sourceId && hasSupabase,
    refetchInterval: (query: any) => {
      const status = query.state.data;
      if (status === "processing" || status === "pending") return 3000;
      return false; // stop polling once done/failed
    },
    queryFn: async () => {
      if (!hasSupabase || !sourceId) return null;
      const { data } = await supabase
        .from("module_sources")
        .select("ingestion_status")
        .eq("id", sourceId)
        .single();
      return (data?.ingestion_status ?? null) as string | null;
    },
    ...options,
  });
}

// --------------------------------------------------------
// Ad Portal Hooks
// --------------------------------------------------------
export function useListAdCampaigns(options?: any): any {
  return useQuery({
    queryKey: getListAdCampaignsQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS);
      }
      
      const { data } = await supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false });
      return (data || []).map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        cardDesign: c.card_design || {},
        status: c.status,
        impressions: c.impressions,
        creditsDistributed: c.credits_distributed,
        createdAt: c.created_at
      }));
    },
    ...options
  });
}

export function useRegisterAdBusiness(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        return { success: true, business: data };
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { data: business } = await supabase.from("ad_businesses").insert({
        auth_id: userId,
        name: data.name,
        email: data.email,
        website: data.website || null,
        description: data.description || null,
        industry: data.industry || null
      }).select("*").single();
      
      return { success: true, business };
    },
    ...options
  });
}

export function useCreateAdCampaign(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const campaigns = getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS);
        const newId = campaigns.length > 0 ? Math.max(...campaigns.map(c => c.id)) + 1 : 1;
        const newCampaign = {
          id: newId,
          title: data.title,
          description: data.description,
          cardDesign: data.cardDesign,
          status: "pending",
          impressions: 0,
          creditsDistributed: 0,
          createdAt: new Date().toISOString()
        };
        campaigns.unshift(newCampaign);
        setStorageItem("openbalc_ad_campaigns", campaigns);
        return newCampaign;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      let { data: business } = await supabase.from("ad_businesses").select("id").eq("auth_id", userId).maybeSingle();
      if (!business) {
        // Auto register placeholder business
        const { data: createdBiz } = await supabase.from("ad_businesses").insert({
          auth_id: userId,
          name: "My Ad Business",
          email: "ads@business.com"
        }).select("id").single();
        business = createdBiz;
      }
      
      const { data: campaign, error } = await supabase.from("ad_campaigns").insert({
        business_id: business!.id,
        title: data.title,
        description: data.description,
        card_design: data.cardDesign || {},
        status: "pending",
        impressions: 0,
        credits_distributed: 0
      }).select("*").single();
      
      if (error) throw error;
      
      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        cardDesign: campaign.card_design || {},
        status: campaign.status,
        impressions: campaign.impressions,
        creditsDistributed: campaign.credits_distributed,
        createdAt: campaign.created_at
      };
    },
    ...options
  });
}

export function useAdminListAdCampaigns(options?: any): any {
  return useQuery({
    queryKey: getAdminListAdCampaignsQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS);
      }
      
      const { data } = await supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false });
      return (data || []).map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        cardDesign: c.card_design || {},
        status: c.status,
        impressions: c.impressions,
        creditsDistributed: c.credits_distributed,
        createdAt: c.created_at
      }));
    },
    ...options
  });
}

export function useApproveAdCampaign(options?: any): any {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      if (!hasSupabase) {
        const campaigns = getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS);
        const idx = campaigns.findIndex(c => c.id === id);
        if (idx !== -1) {
          campaigns[idx].status = "active";
          setStorageItem("openbalc_ad_campaigns", campaigns);
          return campaigns[idx];
        }
        throw new Error("Campaign not found");
      }
      
      const { data: campaign, error } = await supabase.from("ad_campaigns").update({ status: "active" }).eq("id", id).select("*").single();
      if (error) throw error;
      
      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        cardDesign: campaign.card_design || {},
        status: campaign.status,
        impressions: campaign.impressions,
        creditsDistributed: campaign.credits_distributed,
        createdAt: campaign.created_at
      };
    },
    ...options
  });
}

export function useRejectAdCampaign(options?: any): any {
  return useMutation({
    mutationFn: async ({ id, rejectReason }: { id: number; rejectReason: string }) => {
      if (!hasSupabase) {
        const campaigns = getStorageItem("openbalc_ad_campaigns", DEFAULT_AD_CAMPAIGNS);
        const idx = campaigns.findIndex(c => c.id === id);
        if (idx !== -1) {
          campaigns[idx].status = "rejected";
          (campaigns[idx] as any).rejectReason = rejectReason;
          setStorageItem("openbalc_ad_campaigns", campaigns);
          return campaigns[idx];
        }
        throw new Error("Campaign not found");
      }
      
      const { data: campaign, error } = await supabase.from("ad_campaigns").update({ status: "rejected", reject_reason: rejectReason }).eq("id", id).select("*").single();
      if (error) throw error;
      
      return {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        cardDesign: campaign.card_design || {},
        status: campaign.status,
        rejectReason: campaign.reject_reason,
        impressions: campaign.impressions,
        creditsDistributed: campaign.credits_distributed,
        createdAt: campaign.created_at
      };
    },
    ...options
  });
}

// --------------------------------------------------------
// Notes Hooks
// --------------------------------------------------------
export function useListNotes(options?: any): any {
  return useQuery({
    queryKey: getListNotesQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_notes", DEFAULT_NOTES);
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data } = await supabase.from("notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
      return (data || []).map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        color: n.color,
        pinned: n.pinned,
        starred: n.starred,
        sourceTitle: n.source_title,
        createdAt: n.created_at,
        updatedAt: n.updated_at
      }));
    },
    ...options
  });
}

export function useCreateNote(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const notes = getStorageItem("openbalc_notes", DEFAULT_NOTES);
        const newId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
        const newNote = {
          id: newId,
          title: data.title,
          content: data.content || "",
          color: data.color || "#6366f1",
          pinned: data.pinned || false,
          starred: false,
          sourceTitle: data.sourceTitle || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        notes.push(newNote);
        setStorageItem("openbalc_notes", notes);
        return newNote;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { data: note, error } = await supabase.from("notes").insert({
        user_id: userId,
        title: data.title,
        content: data.content || "",
        color: data.color || "#6366f1",
        pinned: data.pinned || false,
        starred: false,
        source_title: data.sourceTitle || null
      }).select("*").single();

      if (error) throw error;
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        color: note.color,
        pinned: note.pinned,
        starred: note.starred,
        sourceTitle: note.source_title,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      };
    },
    ...options
  });
}

export function useUpdateNote(options?: any): any {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!hasSupabase) {
        const notes = getStorageItem("openbalc_notes", DEFAULT_NOTES);
        const idx = notes.findIndex(n => n.id === id);
        if (idx !== -1) {
          notes[idx] = { ...notes[idx], ...data, updatedAt: new Date().toISOString() };
          setStorageItem("openbalc_notes", notes);
          return notes[idx];
        }
        throw new Error("Note not found");
      }
      
      const mapped: any = {
        title: data.title,
        content: data.content,
        color: data.color,
        pinned: data.pinned,
        starred: data.starred,
        source_title: data.sourceTitle
      };
      
      Object.keys(mapped).forEach(key => mapped[key] === undefined && delete mapped[key]);
      
      const { data: note, error } = await supabase.from("notes").update(mapped).eq("id", id).select("*").single();
      if (error) throw error;
      
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        color: note.color,
        pinned: note.pinned,
        starred: note.starred,
        sourceTitle: note.source_title,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      };
    },
    ...options
  });
}

export function useDeleteNote(options?: any): any {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      if (!hasSupabase) {
        const notes = getStorageItem("openbalc_notes", DEFAULT_NOTES);
        const filtered = notes.filter(n => n.id !== id);
        setStorageItem("openbalc_notes", filtered);
        return { success: true };
      }
      
      await supabase.from("notes").delete().eq("id", id);
      return { success: true };
    },
    ...options
  });
}

// --------------------------------------------------------
// Tests Hooks
// --------------------------------------------------------
export function useListTests(options?: any): any {
  return useQuery({
    queryKey: getListTestsQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_tests", DEFAULT_TESTS);
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data: sets } = await supabase.from("test_sets").select("*").eq("created_by", userId);
      if (!sets) return [];

      const results = [];
      for (const set of sets) {
        const { data: questions } = await supabase.from("test_questions").select("*").eq("test_set_id", set.id);
        const { data: attempts } = await supabase.from("test_attempts").select("score").eq("test_set_id", set.id).order("score", { ascending: false }).limit(1);
        
        results.push({
          id: set.id,
          moduleId: set.module_id,
          title: set.title,
          difficulty: set.difficulty,
          questionCount: questions?.length || 0,
          createdAt: set.created_at,
          bestScore: attempts && attempts.length > 0 ? attempts[0].score : null,
          questions: questions?.map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options || {},
            answer: q.answer
          })) || []
        });
      }
      return results;
    },
    ...options
  });
}

export function useCreateTest(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const tests = getStorageItem("openbalc_tests", DEFAULT_TESTS);
        const newId = tests.length > 0 ? Math.max(...tests.map(t => t.id)) + 1 : 1;
   
        const questions = [
          {
            id: newId * 10 + 1,
            type: "mcq",
            question: `Regarding "${data.title}": Which of the following is a primary consideration for beginner learners?`,
            options: {
              "A": "Starting with complex, custom neural architectures right away.",
              "B": "Focusing on core basics, definitions, and simple algorithms.",
              "C": "Deploying systems to high-concurrency cloud environments immediately.",
              "D": "Leaving hyperparameter tuning entirely to manual intuition without benchmarks."
            },
            answer: "B"
          }
        ];

        const newTest = {
          id: newId,
          moduleId: null,
          title: data.title,
          difficulty: data.difficulty || "medium",
          questionCount: questions.length,
          createdAt: new Date().toISOString(),
          bestScore: null,
          questions: questions
        };
        tests.unshift(newTest);
        setStorageItem("openbalc_tests", tests);
        return newTest;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");

      const { data: set, error } = await supabase.from("test_sets").insert({
        module_id: data.moduleId || null,
        title: data.title,
        difficulty: data.difficulty || "medium",
        created_by: userId
      }).select("*").single();

      if (error) throw error;

      const questionsData = [
        {
          test_set_id: set.id,
          type: "mcq",
          question: `Regarding "${data.title}": Which of the following is a primary consideration for beginner learners?`,
          options: {
            "A": "Starting with complex, custom neural architectures right away.",
            "B": "Focusing on core basics, definitions, and simple algorithms.",
            "C": "Deploying systems to high-concurrency cloud environments immediately.",
            "D": "Leaving hyperparameter tuning entirely to manual intuition without benchmarks."
          },
          answer: "B"
        }
      ];

      const { data: questions } = await supabase.from("test_questions").insert(questionsData).select("*");

      const { data: user } = await supabase.from("users").select("credits").eq("id", userId).single();
      if (user && user.credits >= 5) {
        await supabase.from("users").update({ credits: user.credits - 5 }).eq("id", userId);
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          type: "spend",
          amount: 5,
          reason: `Test Generation (Gemini 1.5 Pro)`,
          ref_id: String(set.id)
        });
      }

      return {
        id: set.id,
        moduleId: set.module_id,
        title: set.title,
        difficulty: set.difficulty,
        questionCount: questions?.length || 0,
        createdAt: set.created_at,
        bestScore: null,
        questions: questions?.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options || {},
          answer: q.answer
        })) || []
      };
    },
    ...options
  });
}

export function useGetTest(id: number, options?: any): any {
  return useQuery({
    queryKey: ["getTest", id],
    queryFn: async () => {
      if (!hasSupabase) {
        const tests = getStorageItem("openbalc_tests", DEFAULT_TESTS);
        const found = tests.find(t => t.id === id);
        if (!found) throw new Error("Test not found");
        return found;
      }
      
      const { data: set } = await supabase.from("test_sets").select("*").eq("id", id).single();
      if (!set) throw new Error("Test not found");
      
      const { data: questions } = await supabase.from("test_questions").select("*").eq("test_set_id", id);
      const { data: attempts } = await supabase.from("test_attempts").select("score").eq("test_set_id", id).order("score", { ascending: false }).limit(1);

      return {
        id: set.id,
        moduleId: set.module_id,
        title: set.title,
        difficulty: set.difficulty,
        questionCount: questions?.length || 0,
        createdAt: set.created_at,
        bestScore: attempts && attempts.length > 0 ? attempts[0].score : null,
        questions: questions?.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options || {},
          answer: q.answer
        })) || []
      };
    },
    ...options
  });
}

export function useDeleteTest(options?: any): any {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      if (!hasSupabase) {
        const tests = getStorageItem("openbalc_tests", DEFAULT_TESTS);
        const filtered = tests.filter(t => t.id !== id);
        setStorageItem("openbalc_tests", filtered);
        return { success: true };
      }
      
      await supabase.from("test_sets").delete().eq("id", id);
      return { success: true };
    },
    ...options
  });
}

export function useSubmitTestAttempt(options?: any): any {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { answers: Record<number, string> } }) => {
      if (!hasSupabase) {
        const tests = getStorageItem("openbalc_tests", DEFAULT_TESTS);
        const tIdx = tests.findIndex(t => t.id === id);
        if (tIdx === -1) throw new Error("Test not found");

        const test = tests[tIdx];
        let correct = 0;
        test.questions.forEach((q: any) => {
          if (data.answers[q.id] === q.answer) {
            correct += 1;
          }
        });

        const score = (correct / test.questions.length) * 100;
        if (test.bestScore === null || score > test.bestScore) {
          tests[tIdx].bestScore = score;
          setStorageItem("openbalc_tests", tests);
        }

        if (score >= 80) {
          const user = getStorageItem("openbalc_user", DEFAULT_USER);
          user.credits += 10;
          setStorageItem("openbalc_user", user);

          const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
          txs.unshift({
            id: txs.length + 1,
            type: "earn",
            amount: 10,
            reason: `High score on test: ${test.title}`,
            createdAt: new Date().toISOString()
          });
          setStorageItem("openbalc_credit_transactions", txs);
        }

        return { score };
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");

      const { data: questions } = await supabase.from("test_questions").select("*").eq("test_set_id", id);
      if (!questions || questions.length === 0) throw new Error("Questions not found");

      let correct = 0;
      questions.forEach(q => {
        if (data.answers[q.id] === q.answer) {
          correct += 1;
        }
      });

      const score = (correct / questions.length) * 100;

      await supabase.from("test_attempts").insert({
        test_set_id: id,
        user_id: userId,
        answers: data.answers,
        score: score
      });

      if (score >= 80) {
        const { data: user } = await supabase.from("users").select("credits").eq("id", userId).single();
        if (user) {
          await supabase.from("users").update({ credits: user.credits + 10 }).eq("id", userId);
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            type: "earn",
            amount: 10,
            reason: `High score on test: ${id}`,
            ref_id: String(id)
          });
          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Credits earned!",
            body: `You scored ${Math.round(score)}% and earned 10 credits!`,
            read: false
          });
        }
      }

      return { score };
    },
    ...options
  });
}

// --------------------------------------------------------
// Dashboard / Summary Hooks
// --------------------------------------------------------
export function useGetDashboardSummary(options?: any): any {
  return useQuery({
    queryKey: ["getDashboardSummary"],
    queryFn: async () => {
      if (!hasSupabase) {
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        const convs = getStorageItem("openbalc_conversations", DEFAULT_CONVERSATIONS);
        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
        
        const weeklyQuestions = txs
          .filter(t => t.type === "spend" && new Date(t.createdAt).getTime() > Date.now() - 7 * 86400000)
          .length;

        return {
          moduleCount: mods.length,
          conversationCount: convs.length,
          credits: user.credits,
          weeklyQuestions: weeklyQuestions,
          recentModules: mods.slice(0, 4),
          recentConversations: convs.slice(0, 3)
        };
      }
      
      const userId = await getDbUserId();
      if (!userId) return { moduleCount: 0, conversationCount: 0, credits: 0, weeklyQuestions: 0, recentModules: [], recentConversations: [] };
      
      const modsCount = await supabase.from("modules").select("id", { count: "exact", head: true }).eq("user_id", userId);
      const convsCount = await supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", userId);
      const { data: userRecord } = await supabase.from("users").select("credits").eq("id", userId).single();
      const { count: weeklyCount } = await supabase.from("credit_transactions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("type", "spend").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      
      const { data: recentMods } = await supabase.from("modules").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(4);
      const { data: recentConvs } = await supabase.from("conversations").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(3);

      return {
        moduleCount: modsCount.count || 0,
        conversationCount: convsCount.count || 0,
        credits: userRecord?.credits || 0,
        weeklyQuestions: weeklyCount || 0,
        recentModules: (recentMods || []).map(m => ({ id: m.id, title: m.title, description: m.description, updatedAt: m.updated_at })),
        recentConversations: (recentConvs || []).map(c => ({ id: c.id, title: c.title, lastMessage: c.last_message, updatedAt: c.updated_at }))
      };
    },
    ...options
  });
}

export function useGetRecentActivity(options?: any): any {
  return useQuery({
    queryKey: ["getRecentActivity"],
    queryFn: async () => {
      if (!hasSupabase) {
        const txs = getStorageItem("openbalc_credit_transactions", DEFAULT_CREDIT_TRANSACTIONS);
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        const activities: any[] = [];

        mods.forEach(m => {
          activities.push({
            id: `mod_${m.id}`,
            description: `Created module: ${m.title}`,
            createdAt: m.createdAt
          });
        });

        txs.forEach(t => {
          activities.push({
            id: `tx_${t.id}`,
            description: `${t.type === "earn" ? "Earned" : "Spent"} ${t.amount} credits for "${t.reason}"`,
            createdAt: t.createdAt
          });
        });

        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return activities;
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data: mods } = await supabase.from("modules").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      const { data: txs } = await supabase.from("credit_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      
      const activities: any[] = [];
      mods?.forEach(m => {
        activities.push({
          id: `mod_${m.id}`,
          description: `Created module: ${m.title}`,
          createdAt: m.created_at
        });
      });

      txs?.forEach(t => {
        activities.push({
          id: `tx_${t.id}`,
          description: `${t.type === "earn" ? "Earned" : "Spent"} ${t.amount} credits for "${t.reason}"`,
          createdAt: t.created_at
        });
      });

      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return activities.slice(0, 15);
    },
    ...options
  });
}

export function useGetTrendingModules(options?: any): any {
  return useQuery({
    queryKey: ["getTrendingModules"],
    queryFn: async () => {
      if (!hasSupabase) {
        const mods = getStorageItem("openbalc_modules", DEFAULT_MODULES);
        return [...mods].sort((a, b) => b.useCount - a.useCount);
      }
      
      const { data } = await supabase.from("modules").select("*").eq("visibility", "public").order("use_count", { ascending: false }).limit(6);
      return data || [];
    },
    ...options
  });
}

// --------------------------------------------------------
// Org Hooks
// --------------------------------------------------------
export function useGetOrg(options?: any): any {
  return useQuery({
    queryKey: getGetOrgQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_org", DEFAULT_ORG);
      }
      
      const userId = await getDbUserId();
      if (!userId) return null;
      
      let workspaceId: number | null = null;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("openbalc_active_workspace_id");
        if (stored) {
          workspaceId = parseInt(stored);
        }
      }
      
      if (workspaceId) {
        const { data: isMember } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("workspace_id", workspaceId)
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        if (!isMember) {
          workspaceId = null;
        }
      }
      
      if (!workspaceId) {
        const { data: memberRecord } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        workspaceId = memberRecord?.workspace_id || null;
      }
      
      if (!workspaceId) {
        const { data: ownerRecord } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", userId)
          .limit(1)
          .maybeSingle();
        workspaceId = ownerRecord?.id || null;
      }
      
      if (!workspaceId) return null;
      
      if (typeof window !== "undefined") {
        window.localStorage.setItem("openbalc_active_workspace_id", String(workspaceId));
      }
      
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();
        
      if (!workspace) return null;
      
      const { count } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id);
        
      return {
        id: workspace.id,
        name: workspace.name,
        description: "Personal study & collaboration workspace",
        plan: workspace.type,
        memberCount: count || 1,
        credits: workspace.credits
      };
    },
    ...options
  });
}

export function useCreateOrg(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const newOrg = {
          id: 2,
          name: data.name,
          description: data.description || "",
          plan: data.plan || "hosted",
          memberCount: 1,
          credits: 1000
        };
        setStorageItem("openbalc_org", newOrg);
        return newOrg;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");

      const { data: ws, error } = await supabase.from("workspaces").insert({
        owner_id: userId,
        name: data.name,
        type: data.plan || "hosted",
        credits: 1000
      }).select("*").single();

      if (error) throw error;

      await supabase.from("workspace_members").insert({
        workspace_id: ws.id,
        user_id: userId,
        role: "owner",
        credits_allocated: 1000,
        credits_used: 0
      });
      
      if (typeof window !== "undefined") {
        window.localStorage.setItem("openbalc_active_workspace_id", String(ws.id));
      }

      return {
        id: ws.id,
        name: ws.name,
        description: "",
        plan: ws.type,
        memberCount: 1,
        credits: ws.credits
      };
    },
    ...options
  });
}

export function useListOrgMembers(options?: any): any {
  return useQuery({
    queryKey: getListOrgMembersQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_org_members", DEFAULT_ORG_MEMBERS);
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      let workspaceId: number | null = null;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("openbalc_active_workspace_id");
        if (stored) workspaceId = parseInt(stored);
      }
      
      if (!workspaceId) {
        const { data: memberRecord } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
        workspaceId = memberRecord?.workspace_id || null;
      }
      
      if (!workspaceId) return [];

      const { data: members } = await supabase.from("workspace_members").select("*, users(*)").eq("workspace_id", workspaceId);
      return (members || []).map(m => ({
        userId: m.user_id,
        displayName: m.users?.display_name || "Unknown",
        email: m.users?.email || "",
        role: m.role,
        creditsUsed: m.credits_used,
        creditCap: m.credits_allocated,
        lastActive: m.joined_at
      }));
    },
    ...options
  });
}

export function useInviteOrgMember(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const members = getStorageItem("openbalc_org_members", DEFAULT_ORG_MEMBERS);
        const newMember = {
          userId: members.length + 1,
          displayName: data.email.split("@")[0],
          email: data.email,
          role: data.role || "member",
          creditsUsed: 0,
          creditCap: 500,
          lastActive: null
        };
        members.push(newMember);
        setStorageItem("openbalc_org_members", members);

        const org = getStorageItem("openbalc_org", DEFAULT_ORG);
        org.memberCount += 1;
        setStorageItem("openbalc_org", org);

        return newMember;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");

      let workspaceId: number | null = null;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("openbalc_active_workspace_id");
        if (stored) workspaceId = parseInt(stored);
      }
      if (!workspaceId) {
        const { data: memberRecord } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
        workspaceId = memberRecord?.workspace_id || null;
      }
      if (!workspaceId) throw new Error("Workspace not found");

      let inviteUser = null;
      const { data: existingUser } = await supabase.from("users").select("*").eq("email", data.email).maybeSingle();
      if (existingUser) {
        inviteUser = existingUser;
      } else {
        const { data: created } = await supabase.from("users").insert({
          email: data.email,
          display_name: data.email.split("@")[0],
          username: data.email.split("@")[0] + "_" + Math.floor(Math.random() * 1000),
          role: "user",
          credits: 100
        }).select("*").single();
        inviteUser = created;
      }

      if (inviteUser) {
        await ensureUserPrimaryWorkspace(inviteUser.id, inviteUser.display_name || "User");
      }

      const { data: newMember } = await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: inviteUser!.id,
        role: data.role || "member",
        credits_allocated: 500,
        credits_used: 0
      }).select("*").single();

      return {
        userId: inviteUser!.id,
        displayName: inviteUser!.display_name,
        email: inviteUser!.email,
        role: newMember.role,
        creditsUsed: newMember.credits_used,
        creditCap: newMember.credits_allocated,
        lastActive: newMember.joined_at
      };
    },
    ...options
  });
}

export function useListWorkspaces(options?: any): any {
  return useQuery({
    queryKey: ["listWorkspaces"],
    queryFn: async () => {
      if (!hasSupabase) {
        return [
          { id: 1, name: "Primary Workspace", plan: "personal", memberCount: 1, credits: 100 }
        ];
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data: memberships, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, workspaces(*)")
        .eq("user_id", userId);
        
      if (error || !memberships) return [];
      
      const list = [];
      for (const m of memberships) {
        if (!m.workspaces) continue;
        const ws = m.workspaces as any;
        const { count } = await supabase
          .from("workspace_members")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", ws.id);
        list.push({
          id: ws.id,
          name: ws.name,
          plan: ws.type,
          memberCount: count || 1,
          credits: ws.credits,
          role: m.role
        });
      }
      return list;
    },
    ...options
  });
}

export function useSwitchWorkspace(options?: any): any {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: number }) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("openbalc_active_workspace_id", String(workspaceId));
      }
      return { success: true, activeWorkspaceId: workspaceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    ...options
  });
}

export function useGetOrgAnalytics(params?: any, options?: any): any {
  return useQuery({
    queryKey: ["getOrgAnalytics", params?.period],
    queryFn: () => {
      const days = params?.period === "7d" ? 7 : params?.period === "90d" ? 90 : 30;
      const questionsPerDay: any[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        questionsPerDay.push({
          date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          count: Math.floor(Math.random() * 15) + 2
        });
      }
      return {
        totalCreditsUsed: questionsPerDay.reduce((sum, d) => sum + d.count * 2, 0),
        questionsPerDay,
        topMembers: [
          { displayName: "Jane Doe", questionsAsked: 48 },
          { displayName: "Alice Smith", questionsAsked: 18 }
        ],
        topModules: [
          { title: "Introduction to Machine Learning", accessCount: 34 }
        ]
      };
    },
    ...options
  });
}

export function useListExpertQueue(params?: any, options?: any): any {
  return useQuery({
    queryKey: getListExpertQueueQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        const queue = getStorageItem("openbalc_expert_queue", DEFAULT_EXPERT_QUEUE);
        return queue.filter(q => q.status === (params?.status || "open"));
      }
      
      const { data } = await supabase.from("expert_queue").select("*, users(*)").eq("status", params?.status || "open");
      return (data || []).map(q => ({
        id: q.id,
        userName: q.users?.display_name || "Unknown User",
        context: q.context,
        status: q.status,
        priority: q.priority,
        createdAt: q.created_at,
        reply: q.reply
      }));
    },
    ...options
  });
}

export function useReplyExpertTicket(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: { ticketId: number; reply: string; resolve: boolean } }) => {
      if (!hasSupabase) {
        const queue = getStorageItem("openbalc_expert_queue", DEFAULT_EXPERT_QUEUE);
        const idx = queue.findIndex(q => q.id === data.ticketId);
        if (idx !== -1) {
          queue[idx].status = data.resolve ? "resolved" : "in_progress";
          queue[idx].reply = data.reply;
          setStorageItem("openbalc_expert_queue", queue);
          return queue[idx];
        }
        throw new Error("Ticket not found");
      }
      
      const { data: updated, error } = await supabase.from("expert_queue").update({
        status: data.resolve ? "resolved" : "in_progress",
        reply: data.reply
      }).eq("id", data.ticketId).select("*, users(*)").single();

      if (error) throw error;
      
      return {
        id: updated.id,
        userName: updated.users?.display_name || "Unknown User",
        context: updated.context,
        status: updated.status,
        priority: updated.priority,
        createdAt: updated.created_at,
        reply: updated.reply
      };
    },
    ...options
  });
}

export function useCreateExpertTicket(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: { conversationId: number; context: string; priority: string } }) => {
      if (!hasSupabase) {
        const queue = getStorageItem("openbalc_expert_queue", DEFAULT_EXPERT_QUEUE);
        const newId = queue.length > 0 ? Math.max(...queue.map(q => q.id)) + 1 : 1;
        const ticket = {
          id: newId,
          userName: "Jane Doe",
          context: data.context,
          status: "open",
          priority: data.priority || "normal",
          createdAt: new Date().toISOString()
        };
        queue.push(ticket);
        setStorageItem("openbalc_expert_queue", queue);
        return ticket;
      }

      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).maybeSingle();
      const orgId = member?.org_id;
      if (!orgId) throw new Error("User must belong to an organization to file an expert ticket.");

      const { data: ticket, error } = await supabase.from("expert_queue").insert({
        conversation_id: data.conversationId,
        org_id: orgId,
        user_id: userId,
        context: data.context || "No context provided",
        status: "open",
        priority: data.priority || "normal"
      }).select("*, users(*)").single();

      if (error) throw error;

      return {
        id: ticket.id,
        userName: ticket.users?.display_name || "Unknown User",
        context: ticket.context,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at,
        reply: ticket.reply
      };
    },
    ...options
  });
}

export function useUpdateOrg(options?: any): any {
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const org = getStorageItem("openbalc_org", DEFAULT_ORG);
        const updated = { ...org, ...data };
        setStorageItem("openbalc_org", updated);
        return updated;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");

      let workspaceId: number | null = null;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("openbalc_active_workspace_id");
        if (stored) workspaceId = parseInt(stored);
      }
      if (!workspaceId) {
        const { data: memberRecord } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
        workspaceId = memberRecord?.workspace_id || null;
      }
      if (!workspaceId) throw new Error("Workspace not found or unauthorized");

      const mapped: any = {
        name: data.name,
        type: data.plan
      };
      Object.keys(mapped).forEach(key => mapped[key] === undefined && delete mapped[key]);
      
      const { data: updated, error } = await supabase.from("workspaces").update(mapped).eq("id", workspaceId).select("*").single();
      if (error) throw error;
      return {
        id: updated.id,
        name: updated.name,
        description: "",
        plan: updated.type,
        credits: updated.credits
      };
    },
    ...options
  });
}

export function useDeleteOrg(options?: any): any {
  return useMutation({
    mutationFn: async () => {
      if (!hasSupabase) {
        localStorage.removeItem("openbalc_org");
        localStorage.removeItem("openbalc_org_members");
        return { success: true };
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");

      let workspaceId: number | null = null;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("openbalc_active_workspace_id");
        if (stored) workspaceId = parseInt(stored);
      }
      if (!workspaceId) {
        const { data: memberRecord } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userId).limit(1).maybeSingle();
        workspaceId = memberRecord?.workspace_id || null;
      }
      if (!workspaceId) throw new Error("Workspace not found or unauthorized");

      const { data: ws } = await supabase.from("workspaces").select("id").eq("id", workspaceId).eq("owner_id", userId).maybeSingle();
      if (!ws) throw new Error("Unauthorized");
      
      await supabase.from("workspaces").delete().eq("id", ws.id);
      
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("openbalc_active_workspace_id");
      }
      
      return { success: true };
    },
    ...options
  });
}

export function useUpdateOrgMember(options?: any): any {
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      if (!hasSupabase) {
        const members = getStorageItem("openbalc_org_members", DEFAULT_ORG_MEMBERS);
        const idx = members.findIndex(m => m.userId === userId);
        if (idx !== -1) {
          members[idx] = { ...members[idx], ...data };
          setStorageItem("openbalc_org_members", members);
          return members[idx];
        }
        throw new Error("Member not found");
      }
      
      const userIdAuth = await getDbUserId();
      if (!userIdAuth) throw new Error("Not authenticated");

      let workspaceId: number | null = null;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("openbalc_active_workspace_id");
        if (stored) workspaceId = parseInt(stored);
      }
      if (!workspaceId) {
        const { data: memberRecord } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userIdAuth).limit(1).maybeSingle();
        workspaceId = memberRecord?.workspace_id || null;
      }
      if (!workspaceId) throw new Error("Workspace not found or unauthorized");

      const mapped: any = {
        role: data.role,
        credits_allocated: data.creditCap,
        credits_used: data.creditsUsed
      };
      Object.keys(mapped).forEach(key => mapped[key] === undefined && delete mapped[key]);

      const { data: updated, error } = await supabase.from("workspace_members").update(mapped).eq("workspace_id", workspaceId).eq("user_id", userId).select("*, users(*)").single();
      if (error) throw error;
      
      return {
        userId: updated.user_id,
        displayName: updated.users?.display_name || "Unknown",
        email: updated.users?.email || "",
        role: updated.role,
        creditsUsed: updated.credits_used,
        creditCap: updated.credits_allocated,
        lastActive: updated.joined_at
      };
    },
    ...options
  });
}

export function useRemoveOrgMember(options?: any): any {
  return useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      if (!hasSupabase) {
        const members = getStorageItem("openbalc_org_members", DEFAULT_ORG_MEMBERS);
        const filtered = members.filter(m => m.userId !== userId);
        setStorageItem("openbalc_org_members", filtered);

        const org = getStorageItem("openbalc_org", DEFAULT_ORG);
        org.memberCount = filtered.length;
        setStorageItem("openbalc_org", org);
        return { success: true };
      }
      
      const userIdAuth = await getDbUserId();
      if (!userIdAuth) throw new Error("Not authenticated");

      let workspaceId: number | null = null;
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("openbalc_active_workspace_id");
        if (stored) workspaceId = parseInt(stored);
      }
      if (!workspaceId) {
        const { data: memberRecord } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userIdAuth).limit(1).maybeSingle();
        workspaceId = memberRecord?.workspace_id || null;
      }
      if (!workspaceId) throw new Error("Workspace not found or unauthorized");

      await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);
      return { success: true };
    },
    ...options
  });
}

// --------------------------------------------------------
// Admin Portal Hooks
// --------------------------------------------------------
export const getGetAIModelsQueryKey = () => ["getAIModels"];
export const getGetAIServicesQueryKey = () => ["getAIServices"];
export const getGetAILogsQueryKey = () => ["getAILogs"];
export const getGetAdminStatsQueryKey = () => ["getAdminStats"];
export const getGetAdminUsersQueryKey = () => ["getAdminUsers"];

export function useGetAIModels(options?: any): any {
  return useQuery({
    queryKey: getGetAIModelsQueryKey(),
    queryFn: () => getStorageItem("openbalc_ai_models", DEFAULT_AI_MODELS),
    ...options
  });
}

export function useUpdateAIModel(options?: any): any {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const models = getStorageItem("openbalc_ai_models", DEFAULT_AI_MODELS);
      const idx = models.findIndex(m => m.id === id);
      if (idx !== -1) {
        models[idx] = { ...models[idx], ...data };
        setStorageItem("openbalc_ai_models", models);
        return models[idx];
      }
      throw new Error("Model not found");
    },
    ...options
  });
}

export function useGetAIServices(options?: any): any {
  return useQuery({
    queryKey: getGetAIServicesQueryKey(),
    queryFn: () => getStorageItem("openbalc_ai_services", DEFAULT_AI_SERVICES),
    ...options
  });
}

export function useUpdateAIServiceModel(options?: any): any {
  return useMutation({
    mutationFn: async ({ id, activeModelId }: { id: string; activeModelId: string }) => {
      const services = getStorageItem("openbalc_ai_services", DEFAULT_AI_SERVICES);
      const idx = services.findIndex(s => s.id === id);
      if (idx !== -1) {
        services[idx].activeModelId = activeModelId;
        setStorageItem("openbalc_ai_services", services);
        return services[idx];
      }
      throw new Error("Service not found");
    },
    ...options
  });
}

export function useGetAILogs(options?: any): any {
  return useQuery({
    queryKey: getGetAILogsQueryKey(),
    queryFn: () => getStorageItem("openbalc_ai_logs", DEFAULT_AI_LOGS),
    ...options
  });
}

export function useClearAILogs(options?: any): any {
  return useMutation({
    mutationFn: async () => {
      setStorageItem("openbalc_ai_logs", []);
      return [];
    },
    ...options
  });
}

export function useGetAdminStats(options?: any): any {
  return useQuery({
    queryKey: getGetAdminStatsQueryKey(),
    queryFn: () => {
      const logs = getStorageItem("openbalc_ai_logs", DEFAULT_AI_LOGS);
      const totalRequests = logs.length;
      const errorCount = logs.filter(l => l.status === "error").length;
      const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
      const successLogs = logs.filter(l => l.status === "success");
      const avgLatency = successLogs.length > 0 ? successLogs.reduce((sum, l) => sum + l.latency, 0) / successLogs.length : 0;
      const creditsSpent = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
      
      const modelStats: Record<string, number> = {};
      logs.forEach(l => {
        modelStats[l.modelId] = (modelStats[l.modelId] || 0) + 1;
      });
      
      const serviceStats: Record<string, number> = {};
      logs.forEach(l => {
        serviceStats[l.service] = (serviceStats[l.service] || 0) + 1;
      });

      return {
        totalRequests,
        errorRate: parseFloat(errorRate.toFixed(1)),
        avgLatency: Math.round(avgLatency),
        creditsSpent,
        modelStats,
        serviceStats
      };
    },
    ...options
  });
}

export function useGetAdminUsers(options?: any): any {
  return useQuery({
    queryKey: getGetAdminUsersQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        const user = getStorageItem("openbalc_user", DEFAULT_USER);
        return [
          {
            id: user.id,
            displayName: user.displayName,
            username: user.username,
            email: user.email,
            role: user.role,
            credits: user.credits,
            signupDate: new Date(Date.now() - 30 * 86400000).toISOString(),
            totalRequests: 84,
            lastActive: new Date().toISOString()
          }
        ];
      }
      
      const { data: users } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      return (users || []).map(u => ({
        id: u.id,
        displayName: u.display_name,
        username: u.username,
        email: u.email,
        role: u.role,
        credits: u.credits,
        signupDate: u.created_at,
        totalRequests: 5,
        lastActive: u.updated_at
      }));
    },
    ...options
  });
}

export function useUpdateUserCredits(options?: any): any {
  return useMutation({
    mutationFn: async ({ userId, credits }: { userId: number; credits: number }) => {
      if (!hasSupabase) {
        if (userId === 1) {
          const user = getStorageItem("openbalc_user", DEFAULT_USER);
          user.credits = credits;
          setStorageItem("openbalc_user", user);
          return { success: true, userId, credits };
        }
        return { success: true, userId, credits };
      }
      
      await supabase.from("users").update({ credits: credits }).eq("id", userId);
      return { success: true, userId, credits };
    },
    ...options
  });
}

// --------------------------------------------------------
// Artifacts Hooks
// --------------------------------------------------------
export const getListArtifactsQueryKey = () => ["listArtifacts"];
export const getGetArtifactQueryKey = (id: number) => ["getArtifact", id];

const MOCK_ARTIFACTS = [
  {
    id: 1,
    moduleId: 1,
    title: "Visual Machine Learning Mindmap",
    type: "diagram",
    content: JSON.stringify({
      name: "Machine Learning Basics",
      children: [
        {
          name: "Supervised Learning",
          children: [
            { name: "Linear Regression", children: [] },
            { name: "Decision Trees", children: [] }
          ]
        },
        {
          name: "Unsupervised Learning",
          children: [
            { name: "K-Means Clustering", children: [] },
            { name: "PCA Dimensionality Reduction", children: [] }
          ]
        }
      ]
    }),
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    moduleId: 1,
    title: "Vocabulary Flashcards - ML Basics",
    type: "document",
    content: JSON.stringify([
      { front: "Supervised Learning", back: "Model is trained on labeled training data containing both inputs and correct outputs." },
      { front: "Unsupervised Learning", back: "Model finds patterns and structures in unlabeled data without explicit outcomes." },
      { front: "Feature Extraction", back: "Selecting or transforming raw variables into informative predictors for ML models." },
      { front: "Overfitting", back: "When a model learns noise in training data too well, failing to generalize to new datasets." },
      { front: "Mean Squared Error (MSE)", back: "A common loss function measuring the average squared difference between true and predicted values." }
    ]),
    createdAt: new Date(Date.now() - 43200000).toISOString()
  },
  {
    id: 3,
    moduleId: 1,
    title: "Linear Regression Python Script",
    type: "code",
    content: `import numpy as np
from sklearn.linear_model import LinearRegression

# Sample data
X = np.array([[1, 1], [1, 2], [2, 2], [2, 3]])
y = np.dot(X, np.array([1, 2])) + 3

# Fit model
reg = LinearRegression().fit(X, y)
print(f"Coefficients: {reg.coef_}")
print(f"Intercept: {reg.intercept_}")`,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 4,
    moduleId: 1,
    title: "Machine Learning Basics Practice Quiz",
    type: "test",
    content: JSON.stringify([
      {
        id: 1,
        type: "mcq",
        question: "What is the primary difference between supervised and unsupervised learning?",
        options: {
          "A": "Supervised learning uses labeled training data.",
          "B": "Unsupervised learning requires humans to label the outcomes."
        },
        answer: "A"
      },
      {
        id: 2,
        type: "mcq",
        question: "Which algorithm is commonly used for supervised regression tasks?",
        options: {
          "A": "K-Means Clustering",
          "B": "Linear Regression",
          "C": "Apriori Association",
          "D": "Principal Component Analysis"
        },
        answer: "B"
      }
    ]),
    createdAt: new Date(Date.now() - 36000000).toISOString()
  },
  {
    id: 5,
    title: "General Study Guidelines & Roadmap",
    type: "markdown",
    content: `# Ultimate Study Roadmap\n\n1. **Define Core Objectives**: Always outline the goal of your module.\n2. **Break Down Concepts**: Map complex ideas to daily study units.\n3. **Assess & Review**: Practice quizzes regularly to reinforce learning.\n4. **Utilize citations**: Connect answers back to source material.`,
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
];

export function useListArtifacts(options?: any): any {
  return useQuery({
    queryKey: getListArtifactsQueryKey(),
    queryFn: async () => {
      if (!hasSupabase) {
        return getStorageItem("openbalc_artifacts", MOCK_ARTIFACTS);
      }
      
      const userId = await getDbUserId();
      if (!userId) return [];
      
      const { data } = await supabase
        .from("artifacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      return (data || []).map(a => ({
        id: a.id,
        userId: a.user_id,
        workspaceId: a.workspace_id,
        conversationId: a.conversation_id,
        title: a.title,
        type: a.type,
        content: a.content,
        version: a.version,
        createdAt: a.created_at,
        updatedAt: a.updated_at
      }));
    },
    ...options
  });
}

export function useGetArtifact(id: number, options?: any): any {
  return useQuery({
    queryKey: getGetArtifactQueryKey(id),
    queryFn: async () => {
      if (!hasSupabase) {
        const list = getStorageItem("openbalc_artifacts", MOCK_ARTIFACTS);
        const found = list.find((a: any) => a.id === id || String(a.id) === String(id));
        if (!found) throw new Error("Artifact not found");
        return found;
      }
      
      const { data, error } = await supabase.from("artifacts").select("*").eq("id", id).single();
      if (error || !data) throw new Error("Artifact not found");
      return {
        id: data.id,
        userId: data.user_id,
        workspaceId: data.workspace_id,
        conversationId: data.conversation_id,
        title: data.title,
        type: data.type,
        content: data.content,
        version: data.version,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    },
    ...options
  });
}

export function useCreateArtifact(options?: any): any {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => {
      if (!hasSupabase) {
        const list = getStorageItem("openbalc_artifacts", MOCK_ARTIFACTS);
        const newId = list.length > 0 ? Math.max(...list.map((a: any) => typeof a.id === "number" ? a.id : 0)) + 1 : 1;
        const newArtifact = {
          id: newId,
          moduleId: data.moduleId || null,
          workspaceId: data.workspaceId || null,
          conversationId: data.conversationId || null,
          title: data.title,
          type: data.type,
          content: data.content,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        list.unshift(newArtifact);
        setStorageItem("openbalc_artifacts", list);
        return newArtifact;
      }
      
      const userId = await getDbUserId();
      if (!userId) throw new Error("Not authenticated");
      
      const { data: newArt, error } = await supabase.from("artifacts").insert({
        user_id: userId,
        workspace_id: data.workspaceId || null,
        conversation_id: data.conversationId || null,
        title: data.title,
        type: data.type,
        content: data.content,
        version: 1
      }).select("*").single();
      
      if (error) throw error;
      return {
        id: newArt.id,
        userId: newArt.user_id,
        workspaceId: newArt.workspace_id,
        conversationId: newArt.conversation_id,
        title: newArt.title,
        type: newArt.type,
        content: newArt.content,
        version: newArt.version,
        createdAt: newArt.created_at,
        updatedAt: newArt.updated_at
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListArtifactsQueryKey() });
    },
    ...options
  });
}

export function useUpdateArtifact(options?: any): any {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!hasSupabase) {
        const list = getStorageItem("openbalc_artifacts", MOCK_ARTIFACTS);
        const idx = list.findIndex((a: any) => a.id === id || String(a.id) === String(id));
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
          setStorageItem("openbalc_artifacts", list);
          return list[idx];
        }
        throw new Error("Artifact not found");
      }
      
      const mapped: any = {
        title: data.title,
        type: data.type,
        content: data.content,
        version: data.version
      };
      Object.keys(mapped).forEach(key => mapped[key] === undefined && delete mapped[key]);
      
      const { data: updated, error } = await supabase.from("artifacts").update(mapped).eq("id", id).select("*").single();
      if (error) throw error;
      return {
        id: updated.id,
        userId: updated.user_id,
        workspaceId: updated.workspace_id,
        conversationId: updated.conversation_id,
        title: updated.title,
        type: updated.type,
        content: updated.content,
        version: updated.version,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getListArtifactsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetArtifactQueryKey(variables.id) });
    },
    ...options
  });
}

export function useDeleteArtifact(options?: any): any {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      if (!hasSupabase) {
        const list = getStorageItem("openbalc_artifacts", MOCK_ARTIFACTS);
        const filtered = list.filter((a: any) => a.id !== id && String(a.id) !== String(id));
        setStorageItem("openbalc_artifacts", filtered);
        return { success: true };
      }
      
      const { error } = await supabase.from("artifacts").delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListArtifactsQueryKey() });
    },
    ...options
  });
}
