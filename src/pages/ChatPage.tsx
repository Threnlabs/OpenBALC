import React, { useState, useEffect } from "react";
import ChatHeader from "../components/chat/ChatHeader";
import { supabase } from "@/lib/supabase";
import HistorySidebar from "../components/chat/HistorySidebar";
import ChatInput from "../components/chat/ChatInput";
import ChatBubble from "../components/chat/ChatBubble";
import KnowledgePanel from "../components/chat/KnowledgePanel";
import BoardPanel from "../components/board/BoardPanel";
import HandoverBanner from "../components/chat/HandoverBanner";
import ExpertRequestDialog from "../components/chat/ExpertRequestDialog";
import { useApp } from "../context/BenchrexContext";
import { useIsMobile } from "../hooks/use-mobile";
import { sendQuestion } from "../lib/api";
import { ScrollArea } from "../components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import type { Message, Attachment, ContentBankItem } from "../types";
import { toast } from "sonner";
import { BrainCircuit, Loader2, Sparkles, MessageSquare, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatPageProps {
  isEmbedded?: boolean;
}

const ChatPage = ({ isEmbedded = false }: ChatPageProps) => {
  const isMobile = useIsMobile();
  const {
    activeConversationId,
    conversations,
    addMessage,
    topics,
    historyOpen,
    setHistoryOpen,
    boardOpen,
    knowledgeOpen,
    setBoardOpen,
    setKnowledgeOpen,
    createConversation,
    addNote,
    personalities,
    user,
    setMessageFeedback,
    requestExpert,
    markAsRead,
    groqApiKey,
    activeModel,
  } = useApp();

  const [selectedPersonalityId, setSelectedPersonalityId] = useState("academic-tutor");
  const [isTyping, setIsTyping] = useState(false);
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showHandover, setShowHandover] = useState(false);
  const [hasDismissedHandover, setHasDismissedHandover] = useState(false);
  const [lastContentBankItems, setLastContentBankItems] = useState<ContentBankItem[]>([]);
  const isExpert = user?.role === 'doubt_expert' || user?.role === 'super_admin' || user?.role === 'faculty';

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation?.messages || [];

  const creatingRef = React.useRef(false);

  // Create initial conversation if none active
  useEffect(() => {
    if (!activeConversationId && conversations.length === 0 && !creatingRef.current) {
      creatingRef.current = true;
      createConversation().finally(() => {
        creatingRef.current = false;
      });
    }
  }, [activeConversationId, conversations, createConversation]);

  // Trigger handover after some messages
  useEffect(() => {
    if (messages.length >= 4 && !showHandover && !hasDismissedHandover) {
      setShowHandover(true);
    }
  }, [messages.length, showHandover, hasDismissedHandover]);

  // Reset dismissal when conversation changes and mark as read
  useEffect(() => {
    setHasDismissedHandover(false);
    setShowHandover(false);
    
    if (activeConversationId) {
      const role = (user?.role === 'doubt_expert' || user?.role === 'super_admin' || user?.role === 'faculty') ? 'expert' : 'user';
      markAsRead(activeConversationId, role);
    }
  }, [activeConversationId, user?.role, markAsRead]);

  const handleSend = async (
    content: string,
    tags: string[],
    topicMentions: string[],
    systemInstructions: string,
    attachments?: Attachment[]
  ) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
    }
    if (!convId) return;

    const messageRole = isExpert ? "expert" : "user";

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: messageRole,
      content,
      timestamp: Date.now(),
      tags: isExpert ? [...tags, "Expert Reply"] : tags,
      topicMentions,
      attachments,
    };
    addMessage(convId, userMsg);

    if (isExpert) {
      // If expert is replying, we don't necessarily need the AI to reply automatically
      // but we'll let it happen for now unless we add a toggle.
      setIsTyping(false);
    } else {
      setIsTyping(true);
    }

    if (messageRole === "user") {
      try {
        const personality = personalities.find(p => p.id === selectedPersonalityId);
        const {
          groqApiKey,
          openaiApiKey,
          anthropicApiKey,
          googleApiKey,
          xaiApiKey
        } = useApp(); // Access all keys

        const result = await sendQuestion({
          question: content,
          subject: topicMentions[0] || "General",
          grade: user?.grade || "N/A",
          mode: activeModel || personality?.model || "llama-3.3-70b-versatile",
          student_id: user?.id || "anon",
          student_name: user?.name || "Student",
          systemInstructions,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          attachments,
          useWebSearch: personality?.tool_web_search,
          useContentBank: true,
          useCalendar: personality?.tool_calendar_mgmt,
          groqApiKey,
          openaiApiKey,
          anthropicApiKey,
          googleApiKey,
          xaiApiKey,
        });

        // Track content bank items for the panel
        if (result.contentBankItems?.length) {
          setLastContentBankItems(result.contentBankItems);
        }

        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: "ai",
          content: result.answer,
          reasoning: result.reasoning,
          timestamp: Date.now(),
          personalityIcon: personality?.icon,
          personalityId: selectedPersonalityId,
          tags: personality ? [personality.name] : [],
          sources: result.sources,
          webSearch: result.webSearch,
          contentBankItems: result.contentBankItems,
          aiActionId: result.aiActionId,
        };
        addMessage(convId, aiMsg);
      } catch (err: any) {
        toast.error(err.message || "Failed to get response");
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handlePin = (msg: Message) => {
    addNote({
      id: crypto.randomUUID(),
      title: "Pinned Answer",
      content: msg.content,
      color: "hsl(205 75% 78%)",
      createdAt: Date.now(),
      source: "ai-pin",
      conversationId: activeConversationId || undefined,
    });
    toast.success("Added to Notes Board");
  };

  const handleAskExpert = (msg: Message) => {
    setSelectedMessageId(msg.id);
    setExpertDialogOpen(true);
  };

  const handleFeedback = (msg: Message, feedback: "up" | "down") => {
    // 1. Record feedback in state
    setMessageFeedback(activeConversationId!, msg.id, feedback);

    // 2. If negative feedback, show the handover suggestion banner
    if (feedback === "down") {
      setHasDismissedHandover(false); // Allow it to show again
      setShowHandover(true);
    } else {
      toast.success("Thanks for the feedback!");
    }
  };

  const handleAcceptAction = async (actionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api/ai/action/accept?action_id=${actionId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error("Failed to accept action");
  };

  const handleUndoAction = async (actionId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api/ai/action/undo?action_id=${actionId}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error("Failed to undo action");
  };

  return (
    <div className={cn(
      "flex w-full flex-col bg-background text-foreground overflow-hidden relative",
      !isEmbedded ? "h-screen bg-gradient-premium" : "h-full"
    )}>
      {!isEmbedded && (
        <div className="z-50 border-b border-border bg-card/50 backdrop-blur-md">
          <ChatHeader />
        </div>
      )}

      <div className="relative flex flex-1 overflow-hidden z-30">
        {/* Left Sidebar */}
        {isMobile && historyOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setHistoryOpen(false)}
          />
        )}

        <AnimatePresence mode="wait">
          {historyOpen && (
            <motion.div
              initial={isMobile ? { x: "-100%" } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0 } : { width: 280, opacity: 1 }}
              exit={isMobile ? { x: "-100%" } : { width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={isMobile
                ? "absolute inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-card border-r border-border shadow-2xl flex flex-col"
                : "h-full border-r border-border bg-card/50 backdrop-blur-md"}
            >
              <HistorySidebar onClose={() => setHistoryOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex flex-1 flex-col overflow-hidden relative">
          <ScrollArea className="flex-1 px-4 sm:px-6">
            <div className="mx-auto max-w-4xl space-y-10 py-10 pb-20">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 relative"
                  >
                    <div className="absolute -inset-8 bg-primary/10 blur-3xl rounded-full animate-pulse" />
                    <div className="relative h-24 w-24 rounded-[2rem] overflow-hidden flex items-center justify-center shadow-2xl rotate-3">
                      <img src="/logo.png" alt="Benchrex" className="h-full w-full object-cover" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="font-display text-4xl font-bold tracking-tight mb-3">
                      {isExpert ? "Expert Dashboard" : "Hello! I'm Benchrex"}
                    </h2>
                    <p className="text-muted-foreground max-w-sm mb-10 text-lg leading-relaxed">
                      {isExpert 
                        ? "Select a student session from the sidebar to provide assistance or view current status." 
                        : "Your premium AI doubt-solving buddy. Let's master your courses together."}
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full px-4"
                  >
                    {[
                      "Explain the concept of Financial Accounting",
                      "How do I solve complex Tax problems?",
                      "Summarize the latest Business Law changes",
                      "Key principles of Management Accounting"
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(q, [], [], "")}
                        className="p-4 text-sm text-left rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:bg-primary/5 transition-all group shadow-sm hover:shadow-md"
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium group-hover:text-primary transition-colors">{q}</span>
                      </button>
                    ))}
                  </motion.div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <ChatBubble
                      key={msg.id}
                      message={msg}
                      index={idx}
                      onPin={handlePin}
                      onAskExpert={isExpert ? undefined : handleAskExpert}
                      onFeedback={handleFeedback}
                      onAcceptAction={handleAcceptAction}
                      onUndoAction={handleUndoAction}
                    />
                  ))}
                  {isTyping && (
                    <div className="flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-inner">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                      <div className="rounded-2xl bg-muted/50 backdrop-blur-sm px-5 py-3 text-sm shadow-sm border border-border/50">
                        Analyzing your doubt...
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="px-4 pb-4">
            <div className="mx-auto max-w-4xl">
              <AnimatePresence>
                {showHandover && (
                  <div className="mb-4">
                    <HandoverBanner
                      onConnect={() => setExpertDialogOpen(true)}
                      onDismiss={() => {
                        setShowHandover(false);
                        setHasDismissedHandover(true);
                      }}
                    />
                  </div>
                )}
              </AnimatePresence>
              <ChatInput
                onSend={handleSend}
                disabled={isTyping}
                topics={topics}
                selectedPersonalityId={selectedPersonalityId}
                onPersonalityChange={setSelectedPersonalityId}
              />
            </div>
          </div>
        </main>

        {/* Unified Right Side Panel */}
        <AnimatePresence mode="wait">
          {(knowledgeOpen || boardOpen) && (
            <motion.div
              key="sidepanel-container"
              initial={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
              animate={isMobile ? { x: 0 } : { width: 420, opacity: 1 }}
              exit={isMobile ? { x: "100%" } : { width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={isMobile
                ? "absolute inset-0 z-50 bg-card flex flex-col"
                : "h-full border-l border-border bg-card shadow-2xl relative z-40 overflow-hidden"}
            >
              <AnimatePresence mode="wait">
                {knowledgeOpen && (
                  <motion.div
                    key="knowledge-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full w-full"
                  >
                    <KnowledgePanel onClose={() => setKnowledgeOpen(false)} />
                  </motion.div>
                )}
                {boardOpen && (
                  <motion.div
                    key="board-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full w-full"
                  >
                    <BoardPanel onClose={() => setBoardOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ExpertRequestDialog
        open={expertDialogOpen}
        onOpenChange={setExpertDialogOpen}
        onSubmit={(context) => {
          if (activeConversationId) {
            requestExpert(activeConversationId, context);
            toast.success("Request sent to expert!");
          }
          setExpertDialogOpen(false);
        }}
      />
    </div>
  );
};

export default ChatPage;
