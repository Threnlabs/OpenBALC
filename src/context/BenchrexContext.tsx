import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { UserProfile, Conversation, Topic, ThemeName, BoardNote, Feedback, AIPersonality } from "../types";
import { DEFAULT_PERSONALITIES } from "../types";
import { getDefaultTopics } from "../lib/mock-data";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface AppState {
  user: UserProfile | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  topics: Topic[];
  theme: ThemeName;
  darkMode: boolean;
  historyOpen: boolean;
  boardOpen: boolean;
  knowledgeOpen: boolean;
  notes: BoardNote[];
  personalities: AIPersonality[];
  activeModel: string;
  students: any[];
  selectedStudentId: string | null;
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: (clearSession?: boolean) => Promise<void>;
  completeSetup: (grade: string, course: string, batch: string) => Promise<void>;
  setTheme: (t: ThemeName) => void;
  setDarkMode: (v: boolean) => void;
  resetPassword: (current: string, next: string) => boolean;
  setHistoryOpen: (open: boolean) => void;
  setBoardOpen: (open: boolean) => void;
  setKnowledgeOpen: (open: boolean) => void;
  createConversation: () => Promise<string>;
  setActiveConversation: (id: string | null) => void;
  addMessage: (convId: string, msg: Conversation["messages"][0]) => Promise<void>;
  updateMessage: (convId: string, msgId: string, patch: Partial<Conversation["messages"][0]>) => void;
  updateTopics: (topics: Topic[]) => void;
  togglePinConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setMessageFeedback: (convId: string, msgId: string, feedback: Feedback) => Promise<void>;
  decrementCredits: (n?: number) => void;
  updateCredits: (n: number) => void;
  addNote: (note: BoardNote) => Promise<void>;
  updateNote: (id: string, patch: Partial<BoardNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  requestExpert: (convId: string, context: string) => Promise<void>;
  markAsRead: (convId: string, role: 'user' | 'expert') => Promise<void>;
  loadPersonalities: () => Promise<void>;
  setActiveModel: (model: string) => void;
  setSelectedStudentId: (id: string | null) => void;
}

const BenchrexContext = createContext<AppContextType | null>(null);

const DEFAULT_CREDITS = 100;

export function BenchrexProvider({ children, initialActiveConversationId, forcedDarkMode, onDarkModeChange }: { children: ReactNode, initialActiveConversationId?: string | null, forcedDarkMode?: boolean, onDarkModeChange?: (v: boolean) => void }) {
  const [state, setState] = useState<AppState>(() => {
    // Only restore UI preferences from sessionStorage, NOT conversations/messages
    // Conversations and messages are fetched from Supabase on login
    const saved = sessionStorage.getItem("doubt-solver-ui-prefs");
    const prefs = saved ? (() => { try { return JSON.parse(saved); } catch { return {}; } })() : {};

    return {
      user: null,
      conversations: [],
      activeConversationId: initialActiveConversationId || null,
      topics: getDefaultTopics(),
      theme: (prefs.theme || "lavender") as ThemeName,
      darkMode: prefs.darkMode ?? false,
      historyOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
      boardOpen: false,
      knowledgeOpen: false,
      notes: [],
      personalities: prefs.personalities || DEFAULT_PERSONALITIES,
      activeModel: prefs.activeModel || "llama-3.3-70b-versatile",
      students: [],
      selectedStudentId: null,
    };
  });

  // Use localStorage so all tabs in the same browser share the same session ID
  const [currentSessionId] = useState(() => {
    const saved = localStorage.getItem("benchrex-session-id");
    if (saved) return saved;
    const newId = crypto.randomUUID();
    localStorage.setItem("benchrex-session-id", newId);
    return newId;
  });

  useEffect(() => {
    // Only persist UI preferences (NOT conversations, messages, notes — those live in Supabase)
    const uiPrefs = {
      theme: state.theme,
      darkMode: state.darkMode,
      personalities: state.personalities,
      activeModel: state.activeModel,
    };
    sessionStorage.setItem("doubt-solver-ui-prefs", JSON.stringify(uiPrefs));
    // Clean up old full-state cache if present
    sessionStorage.removeItem("doubt-solver-state");
    sessionStorage.removeItem("mock-user");
  }, [state.theme, state.darkMode, state.personalities]);
  
  useEffect(() => {
    if (initialActiveConversationId) {
      setState(s => ({ ...s, activeConversationId: initialActiveConversationId }));
    }
  }, [initialActiveConversationId]);
  
  useEffect(() => {
    if (forcedDarkMode !== undefined) {
      setState(s => ({ ...s, darkMode: forcedDarkMode }));
    }
  }, [forcedDarkMode]);

  // Session enforcement listener — set up AFTER logout is defined (see below).
  // We store a ref to it so the realtime callback always sees the latest version.
  const logoutRef = React.useRef<(clearSession?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [state.darkMode]);

  const isInitializing = React.useRef(false);

  const addMessage = React.useCallback(async (convId: string, msg: Conversation["messages"][0]) => {
    // We need the ACTUAL current state of the conversation to know if it's the first message
    let isFirstMessage = false;
    let currentConv: Conversation | undefined;
    
    // 1. Update local state immediately for UI responsiveness
    setState((s) => {
      currentConv = s.conversations.find((c) => c.id === convId);
      isFirstMessage = currentConv ? currentConv.messages.length === 0 : true;
      
      return {
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: [...c.messages, msg],
                title: isFirstMessage && msg.role === "user"
                  ? msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : "")
                  : c.title,
                updatedAt: Date.now(),
              }
            : c
        ),
      };
    });

    // 2. Persist to Supabase if not mock user
    if (state.user && !state.user.id.startsWith("mock-")) {
      try {
        // If this is the first message, insert the conversation record first
        if (isFirstMessage) {
          const newTitle = msg.role === "user" 
            ? msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : "")
            : "New Chat";
            
          const { error: convError } = await supabase
            .from("conversations")
            .insert({
              id: convId,
              user_id: state.user.id,
              title: newTitle,
              pinned: false,
              team_id: state.user.team_id || null,
              updated_at: new Date().toISOString()
            });
            
          if (convError) {
             console.error("Failed to create conversation in DB:", convError);
             if (convError.code !== '23505') throw convError;
          }
        } else if (currentConv && currentConv.messages.length === 1 && currentConv.messages[0].role === 'user' && msg.role === 'ai') {
           // Optionally update title if needed
        }

        // Prepare unified sources for DB storage (deduplicated)
        const dbSources = [];
        const seenIds = new Set();

        // 1. Add Knowledge/Content Bank items
        const knowledgeItems = [...(msg.sources || []), ...(msg.contentBankItems || [])];
        for (const item of knowledgeItems) {
          const id = (item as any).id || (item as any).chunk_id;
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            dbSources.push({
              type: 'knowledge',
              id: id,
              title: (item as any).title || `${item.subject}: ${item.chapter}`,
              subject: item.subject,
              chapter: item.chapter,
              content: item.content
            });
          }
        }

        // 2. Add Web Search results
        if (msg.webSearch?.results) {
          for (const r of msg.webSearch.results) {
            dbSources.push({
              type: 'web_search',
              title: r.title,
              url: r.url,
              content: r.description
            });
          }
        }

        const { error } = await supabase
          .from("messages")
          .insert({
            id: msg.id,
            conversation_id: convId,
            role: msg.role === "ai" ? "ai" : (msg.role === "expert" ? "expert" : "user"),
            content: msg.content,
            sources: dbSources,
            attachments: msg.attachments || [],
            tags: msg.tags || [],
            topic_mentions: msg.topicMentions || [],
            web_search: msg.webSearch || {},
            personality_id: msg.personalityId || null,
            created_at: new Date(msg.timestamp).toISOString(),
          });
        
        if (error) {
          console.error("Supabase message error:", error);
          throw error;
        }

        // Update conversation updated_at
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);

      } catch (err) {
        console.error("Failed to persist message:", err);
      }
    }
  }, [state.user?.id, state.conversations]);

  const updateMessage = React.useCallback((convId: string, msgId: string, patch: Partial<Conversation["messages"][0]>) => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, ...patch } : m
              ),
            }
          : c
      ),
    }));
  }, []);


  // Sync auth state with Supabase
  useEffect(() => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    console.log("Setting up auth listener...");

    const handleAuth = async (event: any, session: any) => {
      console.log("Auth event:", event);
      if (session?.user) {
        // Fetch profile from benchrex_users (portal users)
        let userSchema: 'public' | 'benchrex' = 'public';
        const { data: profile } = await supabase
          .from("benchrex_users")
          .select("*")
          .eq("auth_id", session.user.id)
          .maybeSingle();

        if (profile && profile.id !== state.user?.id) {
          console.log("Profile loaded:", profile.role);
          setState(s => ({
            ...s,
            user: {
              id: profile.id,
              auth_id: session.user.id,
              name: profile.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || "User",
              email: session.user.email || "",
              role: profile.role || "student",
              credits: profile.credits ?? DEFAULT_CREDITS,
              setupComplete: !!profile.grade,
              grade: profile.grade || "",
              course: profile.course || "",
              batch: profile.batch || "",
              team_id: profile.team_id || "",
              schema: userSchema
            },
          }));

          // Sync with legacy RBAC system
          localStorage.setItem('admin_profile', JSON.stringify({
            id: profile.id,
            auth_id: session.user.id,
            name: profile.name,
            email: session.user.email,
            role: profile.role || "student",
            team_id: profile.team_id || "",
            grade: profile.grade,
            course: profile.course,
            batch: profile.batch,
            access_level: profile.role === 'super_admin' ? 1 : (profile.role === 'doubt_expert' ? 10 : 9)
          }));
          
          loadConversations(profile.id, profile.role);
          loadNotes(profile.id);
          loadPersonalities();

          if (profile.role === 'doubt_expert' || profile.role === 'super_admin' || profile.role === 'faculty') {
            loadStudents();
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setState(s => ({ ...s, user: null, activeConversationId: null, conversations: [] }));
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Use setTimeout to ensure the lock is not held too long in the synchronous part of the listener
      setTimeout(() => handleAuth(event, session), 0);
    });

    return () => {
      subscription.unsubscribe();
      isInitializing.current = false;
    };
  }, []);

  const loadConversations = React.useCallback(async (userId: string, role?: string) => {
    console.log("Loading conversations for user:", userId, "with role:", role);
    try {
      const isExpert = role === 'doubt_expert' || role === 'super_admin' || role === 'faculty';
      const profile = JSON.parse(localStorage.getItem('admin_profile') || '{}');
      const teamId = profile.team_id;
      
      let query = supabase
        .from("conversations")
        .select("*, user:benchrex_users(name, email), messages(*)")
        .order("updated_at", { ascending: false });

      if (teamId) {
          query = query.eq('team_id', teamId);
      }

      if (isExpert) {
        // Experts see their own OR any expert session
        query = query.or(`user_id.eq.${userId},is_expert_session.eq.true`);
      } else {
        query = query.eq("user_id", userId);
      }

      const { data: convs, error } = await query;

      if (error) throw error;

      if (convs) {
        const mappedConvs: Conversation[] = convs.map((c: any) => ({
          id: c.id,
          title: c.title,
          pinned: c.pinned,
          isExpertSession: c.is_expert_session,
          expertId: c.expert_id,
          userHasUnread: c.user_has_unread,
          expertHasUnread: c.expert_has_unread,
          userId: c.user_id,
          userName: c.user?.name,
          userEmail: c.user?.email,
          createdAt: new Date(c.created_at).getTime(),
          updatedAt: new Date(c.updated_at).getTime(),
          messages: (c.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
            feedback: m.feedback,
            sources: m.sources,
            attachments: m.attachments,
            tags: m.tags,
            topicMentions: m.topic_mentions,
            webSearch: m.web_search,
            personalityId: m.personality_id,
          })).sort((a: any, b: any) => a.timestamp - b.timestamp)
        }));

        setState(s => ({ ...s, conversations: mappedConvs }));
      }
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
      toast.error(`Failed to load history: ${err.message}`);
    }
  }, []);

  const loadPersonalities = React.useCallback(async () => {
    try {
      const { data: personas, error } = await supabase
        .from("personalities")
        .select("id, name, model, system_instructions, description, icon, tool_web_search, tool_calendar_mgmt, tool_chain_of_thought")
        .order("name", { ascending: true });

      if (error) throw error;

      if (personas) {
        console.log("[BenchrexContext] Personalities loaded from Supabase:", personas.length);
        const mapped: AIPersonality[] = personas.map((p: any) => ({
          id: p.id,
          name: p.name,
          model: p.model,
          systemInstructions: p.system_instructions,
          description: p.description,
          icon: p.icon,
          tool_web_search: p.tool_web_search,
          tool_code_interpreter: p.tool_code_interpreter,
          tool_image_gen: p.tool_image_gen,
          tool_calendar_mgmt: p.tool_calendar_mgmt,
          tool_chain_of_thought: p.tool_chain_of_thought,
          apiKey: p.api_key,
        }));
        setState(s => ({ ...s, personalities: mapped }));
      }
    } catch (err: any) {
      console.error("Failed to load personalities:", err);
    }
  }, []);

  const loadNotes = React.useCallback(async (userId: string) => {
    try {
      const profile = JSON.parse(localStorage.getItem('admin_profile') || '{}');
      const teamId = profile.team_id;
      let query = supabase
        .from("benchrex_board_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (teamId) query = query.eq('team_id', teamId);
      
      const { data: notes, error } = await query;

      if (error) throw error;

      if (notes) {
        const mappedNotes: BoardNote[] = notes.map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          color: n.color,
          createdAt: new Date(n.created_at).getTime(),
          source: n.source,
          conversationId: n.conversation_id,
        }));

        setState(s => ({ ...s, notes: mappedNotes }));
      }
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }, [addMessage, state.user]);

  const loadStudents = React.useCallback(async () => {
    console.log("Loading students list...");
    try {
      const profile = JSON.parse(localStorage.getItem('admin_profile') || '{}');
      const teamId = profile.team_id;

      const { data: students, error: stuError } = await supabase
        
        .from("users")
        .select("id, name, email, role")
        .eq('team_id', teamId);

      if (stuError) throw stuError;

      if (students) {
        setState(s => ({ ...s, students }));
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    }
  }, [addMessage, state.user]);

  useEffect(() => {
    if (state.user) {
      loadStudents();
    }
  }, [addMessage, state.user]);

  const login = React.useCallback(async (
    email: string,
    password: string,
  ) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Supabase auth failed:", error.message);
        toast.error(error.message);
        return false;
      }

      // Check if user exists in benchrex_users (Benchrex portal users only)
      const { data: bProfileData } = await supabase
        .from("benchrex_users")
        .select("id, team_id")
        .eq("auth_id", data.user.id)
        .maybeSingle();

      if (!bProfileData) {
        console.warn("User not found in benchrex_users — not authorized");
        await supabase.auth.signOut();
        toast.error("You do not have access to the Benchrex portal. Please contact your administrator.");
        return false;
      }

      return true;
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "An unexpected error occurred during login");
      return false;
    }
  }, [addMessage, state.user]);

  const logout = async (clearSession = true) => {
    const userId = state.user?.id;
    if (userId && clearSession) {
      // Clear session token from DB so next login on any device starts fresh
      await supabase
        
        .from("users")
        .update({ current_session_id: null })
        .eq("id", userId);
    }
    await supabase.auth.signOut();
    setState((s) => ({ ...s, user: null, activeConversationId: null }));
    localStorage.removeItem('admin_profile');
    sessionStorage.removeItem("mock-user");
  };

  // Keep the ref up-to-date so the realtime callback never gets stale
  React.useEffect(() => {
    logoutRef.current = logout;
  });

  // ── Single-session enforcement ──────────────────────────────────────────────
  // Stamp DB with our session ID on login; listen for changes to kick us out.
  React.useEffect(() => {
    if (!state.user || state.user.id.startsWith("mock-")) return;

    const userId = state.user.id;

    // Newest login always wins — overwrite whatever is currently in DB.
    supabase
      
      .from("users")
      .update({ current_session_id: currentSessionId })
      .eq("id", userId)
      .then(({ error }) => {
        if (error) console.error("Failed to stamp session ID:", error.message);
      });

    // Subscribe to changes on this user row.
    const channel = supabase
      .channel(`session-guard:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new?.current_session_id;
          if (incoming && incoming !== currentSessionId) {
            toast.error(
              "You've been signed out — another session started on a different device.",
              { duration: 6000 }
            );
            // Call via ref so we always use the latest logout (no stale closure)
            logoutRef.current(false); // false = don't clear DB (new device already wrote its ID)
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.user?.id, currentSessionId]);

  // ── Benchrex Realtime ──────────────────────────────────────────────────────
  // Listen for new messages and conversation updates (unread flags, status changes)
  React.useEffect(() => {
    if (!state.user || state.user.id.startsWith("mock-")) return;

    const userId = state.user.id;

    const channel = supabase
      .channel('benchrex-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as any;
            // Only care if it's our conversation OR if we are an expert
            const isExpert = state.user?.role === 'doubt_expert' || state.user?.role === 'super_admin' || state.user?.role === 'faculty';
            
            if (updated.user_id === userId || isExpert) {
              setState(s => ({
                ...s,
                conversations: s.conversations.some(c => c.id === updated.id)
                  ? s.conversations.map(c => c.id === updated.id ? { 
                      ...c, 
                      title: updated.title,
                      pinned: updated.pinned,
                      isExpertSession: updated.is_expert_session,
                      userHasUnread: updated.user_has_unread,
                      expertHasUnread: updated.expert_has_unread,
                      updatedAt: new Date(updated.updated_at).getTime()
                    } : c)
                  : [{
                      id: updated.id,
                      title: updated.title,
                      pinned: updated.pinned,
                      isExpertSession: updated.is_expert_session,
                      userHasUnread: updated.user_has_unread,
                      expertHasUnread: updated.expert_has_unread,
                      userId: updated.user_id,
                      messages: [],
                      createdAt: new Date(updated.created_at).getTime(),
                      updatedAt: new Date(updated.updated_at).getTime()
                    }, ...s.conversations]
              }));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMsg = payload.new as any;
          // Check if this message belongs to one of our active conversations
          setState(s => {
            const conv = s.conversations.find(c => c.id === newMsg.conversation_id);
            if (!conv) return s;

            // Avoid duplicate messages (e.g. if we sent it ourselves and already added it locally)
            if (conv.messages.some(m => m.id === newMsg.id)) return s;

            const mappedMsg = {
              id: newMsg.id,
              role: newMsg.role,
              content: newMsg.content,
              timestamp: new Date(newMsg.created_at).getTime(),
              feedback: newMsg.feedback,
              sources: newMsg.sources,
              attachments: newMsg.attachments,
              tags: newMsg.tags,
              topicMentions: newMsg.topic_mentions,
              webSearch: newMsg.web_search,
              personalityId: newMsg.personality_id,
            };

            return {
              ...s,
              conversations: s.conversations.map(c => 
                c.id === newMsg.conversation_id 
                  ? { ...c, messages: [...c.messages, mappedMsg].sort((a, b) => a.timestamp - b.timestamp) } 
                  : c
              )
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.user?.id, state.user?.role]);

  const setDarkMode = React.useCallback((darkMode: boolean) => {
    setState((s) => ({ ...s, darkMode }));
    onDarkModeChange?.(darkMode);
  }, [onDarkModeChange]);

  // Mock password reset — just acknowledges. No real auth in demo.
  const resetPassword = React.useCallback((_current: string, _next: string) => true, []);

  const completeSetup = React.useCallback(async (grade: string, course: string, batch: string) => {
    if (!state.user) return;
    
    if (!state.user.id.startsWith("mock-")) {
      try {
        const { error } = await supabase
        
        .from("users")
        .update({ grade, course, batch, updated_at: new Date().toISOString() })
        .eq("id", state.user.id);

        if (error) throw error;
      } catch (err: any) {
        console.error("Setup error:", err);
        toast.error("Failed to save profile details to cloud");
      }
    }

    setState((s) => ({
      ...s,
      user: s.user ? { ...s.user, grade, course, batch, setupComplete: true } : null,
    }));
    toast.success("Profile updated locally!");
  }, [state.user]);

  const setTheme = (theme: ThemeName) => setState((s) => ({ ...s, theme }));
  const setHistoryOpen = (open: boolean) => setState((s) => ({ 
    ...s, 
    historyOpen: open,
    boardOpen: open ? false : s.boardOpen,
    knowledgeOpen: open ? false : s.knowledgeOpen
  }));
  
  const setBoardOpen = (open: boolean) => setState((s) => ({ 
    ...s, 
    boardOpen: open, 
    knowledgeOpen: open ? false : s.knowledgeOpen,
    historyOpen: open ? false : s.historyOpen
  }));
  
  const setKnowledgeOpen = (open: boolean) => setState((s) => ({ 
    ...s, 
    knowledgeOpen: open, 
    boardOpen: open ? false : s.boardOpen,
    historyOpen: open ? false : s.historyOpen
  }));
  

  const createConversation = React.useCallback(async () => {
    const id = crypto.randomUUID();
    const conv: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: state.user?.id || "",
      pinned: false,
    };

    setState((s) => ({
      ...s,
      conversations: [conv, ...s.conversations],
      activeConversationId: id,
    }));
    return id;
  }, []);

  const setActiveConversation = React.useCallback((id: string | null) =>
    setState((s) => ({ ...s, activeConversationId: id })), []);


  const updateTopics = (topics: Topic[]) => setState((s) => ({ ...s, topics }));

  const togglePinConversation = React.useCallback(async (id: string) => {
    const conv = state.conversations.find(c => c.id === id);
    const newPinnedState = !conv?.pinned;
    
    // Update local state
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned } : c
      ),
    }));

    // Persist to Supabase only if the conversation exists in DB (has messages)
    if (state.user && !state.user.id.startsWith("mock-") && conv && conv.messages.length > 0) {
      try {
        await supabase
          .from("conversations")
          .update({ pinned: newPinnedState })
          .eq("id", id);
      } catch (err) {
        console.error("Failed to toggle pin:", err);
      }
    }
  }, [state.user?.id, state.conversations]);

  const deleteConversation = React.useCallback(async (id: string) => {
    // Update local state
    setState((s) => ({
      ...s,
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    }));

    // Persist to Supabase
    if (state.user && !state.user.id.startsWith("mock-")) {
      try {
        const { error } = await supabase
          .from("conversations")
          .delete()
          .eq("id", id);
        
        if (error) {
          console.error("Supabase delete error:", error);
          toast.error(`Failed to delete conversation: ${error.message}`);
          // Consider reverting local state if delete fails? 
          // For now just log and toast.
        }
      } catch (err: any) {
        console.error("Failed to delete conversation:", err);
        toast.error(`Delete failed: ${err.message || 'Unknown error'}`);
      }
    }
  }, [state.user?.id, state.conversations]);

  const setSelectedStudentId = (id: string | null) => setState(s => ({ ...s, selectedStudentId: id }));

  const setMessageFeedback = React.useCallback(async (convId: string, msgId: string, feedback: Feedback) => {
    // Update local state
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, feedback } : m
              ),
            }
          : c
      ),
    }));

    // Persist to Supabase
    if (state.user && !state.user.id.startsWith("mock-")) {
      try {
        // Update message feedback column
        await supabase
          .from("messages")
          .update({ feedback })
          .eq("id", msgId);

        // Also insert into benchrex_feedback table
        if (feedback) {
          const conv = state.conversations.find((c) => c.id === convId);
          const aiMsgIndex = conv?.messages.findIndex((m) => m.id === msgId) ?? -1;
          const aiMsg = aiMsgIndex !== -1 ? conv?.messages[aiMsgIndex] : null;
          const userMsg = aiMsgIndex > 0 ? conv?.messages[aiMsgIndex - 1] : null;

          await supabase
            .from("benchrex_feedback")
            .insert({
              message_id: msgId,
              user_id: state.user.id,
              rating: feedback === "up" ? 1 : -1,
              user_prompt: userMsg?.content || null,
              ai_response: aiMsg?.content || null,
              team_id: state.user.team_id || null,
            });
        } else {
          await supabase
            .from("benchrex_feedback")
            .delete()
            .eq("message_id", msgId)
            .eq("user_id", state.user.id);
        }
      } catch (err) {
        console.error("Failed to set feedback:", err);
      }
    }
  }, [addMessage, state.user, state.conversations]);

  const decrementCredits = (n = 1) =>
    setState((s) => ({
      ...s,
      user: s.user
        ? { ...s.user, credits: Math.max(0, s.user.credits - n) }
        : null,
    }));
    
  const updateCredits = (n: number) =>
    setState((s) => ({
      ...s,
      user: s.user ? { ...s.user, credits: n } : null,
    }));

  const addNote = React.useCallback(async (note: BoardNote) => {
    // Update local state
    setState((s) => ({ ...s, notes: [note, ...s.notes] }));

    // Persist to Supabase
    if (state.user && !state.user.id.startsWith("mock-")) {
      try {
        await supabase
          .from("benchrex_board_notes")
          .insert({
            id: note.id,
            user_id: state.user.id,
            conversation_id: note.conversationId || null,
            title: note.title,
            content: note.content,
            color: note.color,
            source: note.source || 'manual',
            team_id: state.user.team_id || null,
          });
      } catch (err) {
        console.error("Failed to persist note:", err);
      }
    }
  }, [addMessage, state.user]);

  const updateNote = React.useCallback(async (id: string, patch: Partial<BoardNote>) => {
    // Update local state
    setState((s) => ({
      ...s,
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));

    // Persist to Supabase
    if (state.user && !state.user.id.startsWith("mock-")) {
      try {
        const dbPatch: any = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.content !== undefined) dbPatch.content = patch.content;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        
        await supabase
          .from("benchrex_board_notes")
          .update(dbPatch)
          .eq("id", id);
      } catch (err) {
        console.error("Failed to update note:", err);
      }
    }
  }, [addMessage, state.user]);

  const deleteNote = React.useCallback(async (id: string) => {
    // Update local state
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));

    // Persist to Supabase
    if (state.user && !state.user.id.startsWith("mock-")) {
      try {
        await supabase
          .from("benchrex_board_notes")
          .delete()
          .eq("id", id);
      } catch (err) {
        console.error("Failed to delete note:", err);
      }
    }
  }, [state.user?.id]);

  const requestExpert = React.useCallback(async (convId: string, context: string) => {
    // 1. Update local state
    setState(s => ({
      ...s,
      conversations: s.conversations.map(c => 
        c.id === convId ? { ...c, isExpertSession: true } : c
      )
    }));

    // 2. Persist to Supabase
    if (state.user && !state.user.id.startsWith("mock-")) {
      try {
        const { error } = await supabase
          .from("conversations")
          .update({ 
            is_expert_session: true,
            updated_at: new Date().toISOString() 
          })
          .eq("id", convId);
        
        if (error) throw error;

        // Add a system message about the request
        const expertMsg = {
          id: crypto.randomUUID(),
          role: "ai",
          content: `Expert Request: ${context}\n\nA human expert has been notified and will join this session shortly.`,
          timestamp: Date.now(),
          tags: ["System", "Expert Request"]
        };
        
        await addMessage(convId, expertMsg as any);
      } catch (err: any) {
        toast.error(`Expert request failed: ${err.message}`);
      }
    }
  }, [addMessage, state.user]);

  const markAsRead = React.useCallback(async (convId: string, role: 'user' | 'expert') => {
    // 1. Update local state
    setState(s => {
      const conv = s.conversations.find(c => c.id === convId);
      if (!conv) return s;
      
      // Only update if unread status would actually change
      const needsUpdate = (role === 'user' && conv.userHasUnread) || (role === 'expert' && conv.expertHasUnread);
      if (!needsUpdate) return s;

      return {
        ...s,
        conversations: s.conversations.map(c => 
          c.id === convId 
            ? { 
                ...c, 
                userHasUnread: role === 'user' ? false : c.userHasUnread,
                expertHasUnread: role === 'expert' ? false : c.expertHasUnread 
              } 
            : c
        )
      };
    });

    // 2. Persist to Supabase
    if (state.user && !state.user.id.startsWith("mock-")) {
      try {
        const update: any = {};
        if (role === 'user') update.user_has_unread = false;
        if (role === 'expert') update.expert_has_unread = false;

        await supabase
          .from("conversations")
          .update(update)
          .eq("id", convId);
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    }
  }, [state.user?.id]);

  const setActiveModel = (activeModel: string) => setState(s => ({ ...s, activeModel }));

  const contextValue = React.useMemo(() => ({
    ...state,
    login,
    logout,
    completeSetup,
    setTheme,
    setDarkMode,
    resetPassword,
    setHistoryOpen,
    setBoardOpen,
    setKnowledgeOpen,
    createConversation,
    setActiveConversation,
    addMessage,
    updateTopics,
    togglePinConversation,
    deleteConversation,
    setMessageFeedback,
    decrementCredits,
    addNote,
    updateNote,
    deleteNote,
    requestExpert,
    markAsRead,
    loadPersonalities,
    setActiveModel,
    setSelectedStudentId,
    updateMessage,
    updateCredits,
  }), [
    state,
    login,
    logout,
    completeSetup,
    setTheme,
    setDarkMode,
    resetPassword,
    setHistoryOpen,
    setBoardOpen,
    setKnowledgeOpen,
    createConversation,
    setActiveConversation,
    addMessage,
    updateTopics,
    togglePinConversation,
    deleteConversation,
    setMessageFeedback,
    decrementCredits,
    addNote,
    updateNote,
    deleteNote,
    requestExpert,
    markAsRead,
    loadPersonalities,
    setActiveModel,
    setSelectedStudentId,
    updateMessage,
    updateCredits,
  ]);

  return (
    <BenchrexContext.Provider value={contextValue}>
      {children}
    </BenchrexContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(BenchrexContext);
  if (!ctx) throw new Error("useApp must be used within BenchrexProvider");
  return ctx;
};
