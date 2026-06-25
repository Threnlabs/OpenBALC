import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/Skeleton";
import {
  useListConversations, useGetConversation, useGetMessages, useSendMessage,
  useCreateConversation, useDeleteConversation, useUpdateConversation,
  useListModules, useGetModule, useGetModuleContent, useGetModuleSources,
  useListArtifacts, getListConversationsQueryKey, getGetMessagesQueryKey
} from "@workspace/api-client-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  MessageSquare, Plus, Search, Trash2, Pin, PinOff, Send, Loader2,
  BookOpen, Globe, User, Bot, Zap, ChevronRight, MoreVertical,
  Layers, BrainCircuit, FileText, ArrowLeft, GraduationCap, X, Award, Sparkles,
  Link2, Info, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  HoverCard, HoverCardTrigger, HoverCardContent
} from "@/components/ui/hover-card";
import InteractiveMindMap from "@/components/InteractiveMindMap";
import MarkdownRenderer from "@/components/MarkdownRenderer";

const SUGGESTED_PROMPTS = [
  "Explain the key concepts in my latest module",
  "Generate a quiz based on my study materials",
  "Summarize the most important points",
  "Compare and contrast different topics",
  "Create a study plan for my modules",
  "What are the main themes across my knowledge base?",
];

function ConversationItem({ conv, active, onSelect, onDelete, onPin }: {
  conv: any; active: boolean;
  onSelect: () => void; onDelete: () => void; onPin: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group",
        active ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{conv.title}</p>
        {conv.lastMessage && (
          <p className="text-[10px] text-muted-foreground truncate">{conv.lastMessage}</p>
        )}
      </div>
      {conv.pinned && <Pin className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/50">
            <MoreVertical className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={e => { e.stopPropagation(); onPin(); }}>
            {conv.pinned ? <><PinOff className="h-3.5 w-3.5 mr-2" />Unpin</> : <><Pin className="h-3.5 w-3.5 mr-2" />Pin</>}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export const getCitationContext = (sourceName: string) => {
  const name = sourceName.toLowerCase();
  if (name.includes("pdf") || name.includes("accounting") || name.includes("notes")) {
    return {
      page: "PDF Page 3",
      relevance: "96%",
      highlight: "subtract the salvage value from the asset cost and divide by useful life to determine depreciation",
      fullText: "To calculate straight-line depreciation, first subtract the salvage value from the asset cost and divide by useful life to determine depreciation. This formula represents the standard practice across public and private corporate finance groups."
    };
  }
  if (name.includes("machine") || name.includes("learning") || name.includes("bas")) {
    return {
      page: "Page 12",
      relevance: "93%",
      highlight: "supervised learning mapping inputs to outputs based on labeled datasets",
      fullText: "We define supervised learning mapping inputs to outputs based on labeled datasets, which is fundamentally distinct from unsupervised clustering techniques such as K-Means or PCA dimension reduction."
    };
  }
  return {
    page: "Page 1",
    relevance: "89%",
    highlight: "the active context retrieve matches this study source",
    fullText: "Based on vector search similarity, the active context retrieve matches this study source. Reviewing this context helps verify AI accuracy and prevent hallucinations."
  };
};

function MessageBubble({ msg, onCitationClick }: { msg: any; onCitationClick: (sourceName: string) => void }) {
  const isUser = msg.role === "user";

  const renderMessageContent = (content: string, sources: string[] = []) => {
    if (!content) return "";
    const parts = content.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const num = parseInt(match[1]);
        const sourceName = sources[num - 1];
        if (sourceName) {
          const context = getCitationContext(sourceName);
          return (
            <HoverCard key={index} openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <span
                  onClick={() => onCitationClick(sourceName)}
                  className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-full bg-primary/15 text-primary text-[9px] font-bold cursor-pointer hover:bg-primary/25 hover:scale-105 active:scale-95 transition-all shadow-xs border border-primary/20 mx-0.5 select-none"
                >
                  {num}
                </span>
              </HoverCardTrigger>
              <HoverCardContent className="w-72 p-3.5 bg-card border border-border rounded-xl shadow-xl z-50 text-xs text-foreground space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1.5">
                  <span className="font-bold text-primary truncate max-w-[150px]">{sourceName}</span>
                  <Badge variant="outline" className="text-[9px] px-1 font-semibold">{context.page}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground/85 leading-normal italic bg-muted/20 p-2 rounded-lg border border-border/50">
                  "...{context.highlight}..."
                </p>
                <div className="flex justify-between items-center text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                  <span>Relevance: {context.relevance}</span>
                  <span className="text-primary hover:underline cursor-pointer" onClick={() => onCitationClick(sourceName)}>Click to view full text</span>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        }
      }
      return part;
    });
  };

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {isUser ? "U" : "AI"}
      </div>
      <div className={cn("max-w-[75%] space-y-1", isUser && "items-end flex flex-col")}>
        <div className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border rounded-tl-sm text-foreground"
        )}>
          {isUser ? msg.content : renderMessageContent(msg.content, msg.sources)}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo(msg.createdAt)}</span>
          {msg.creditsUsed > 0 && (
            <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
              <Zap className="h-2.5 w-2.5" />{msg.creditsUsed}
            </span>
          )}
        </div>
        {msg.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {msg.sources.map((src: string, i: number) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] h-4 cursor-pointer hover:bg-muted/80"
                onClick={() => onCitationClick(src)}
              >
                <BookOpen className="h-2 w-2 mr-1" />
                <span>[{i + 1}] {src}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArtifactQuizPlayer({ questions, artifactId }: { questions: any[]; artifactId: any }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // Reset when artifact changes
  useEffect(() => {
    setCurrentIdx(0);
    setAnswers({});
    setShowResult(false);
    setScore(null);
  }, [artifactId]);

  const currentQuestion = questions[currentIdx];

  const handleSelectOption = (optionKey: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id || currentIdx]: optionKey
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      // Calculate score
      let correct = 0;
      questions.forEach((q, idx) => {
        const qId = q.id || idx;
        const userAnswer = answers[qId];
        if (userAnswer === q.answer) {
          correct++;
        }
      });
      const finalScore = Math.round((correct / questions.length) * 100);
      setScore(finalScore);
      setShowResult(true);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setAnswers({});
    setShowResult(false);
    setScore(null);
  };

  if (showResult) {
    const passed = (score || 0) >= 70;
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-6 flex-1 text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
          passed ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
        )}>
          {passed ? <Award className="h-8 w-8" /> : <GraduationCap className="h-8 w-8" />}
        </div>
        <div className="space-y-2">
          <h4 className="text-base font-bold text-foreground">Quiz Completed!</h4>
          <p className="text-xs text-muted-foreground">You got {questions.filter((q, idx) => answers[q.id || idx] === q.answer).length} out of {questions.length} questions correct.</p>
        </div>
        
        <div className="p-4 bg-muted/30 border border-border/80 rounded-2xl w-full max-w-sm">
          <div className="text-2xl font-bold text-primary">{score}%</div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">Your Score</div>
        </div>

        <Button onClick={handleReset} size="sm" className="h-8 px-4 text-xs font-semibold">
          Try Again
        </Button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground font-semibold">
        No questions in this test artifact.
      </div>
    );
  }

  const selectedAnswer = answers[currentQuestion.id || currentIdx];

  return (
    <div className="flex flex-col flex-1 justify-between gap-6">
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span>{Math.round((currentIdx / questions.length) * 100)}% Complete</span>
          </div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentIdx / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Text */}
        <div className="p-4 border border-border/80 bg-muted/15 rounded-2xl">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Question</span>
          <p className="text-xs font-bold text-foreground leading-relaxed mt-1">
            {currentQuestion.question}
          </p>
        </div>

        {/* Options */}
        {currentQuestion.options && (
          <div className="space-y-2">
            {Object.entries(currentQuestion.options).map(([key, value]: [string, any]) => (
              <button
                key={key}
                onClick={() => handleSelectOption(key)}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border text-xs font-semibold transition-all flex items-start gap-3 hover:scale-[1.005]",
                  selectedAnswer === key
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/10"
                )}
              >
                <span className={cn(
                  "h-5 w-5 rounded-md flex items-center justify-center shrink-0 border text-[10px] font-bold",
                  selectedAnswer === key 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "border-border bg-card"
                )}>
                  {key}
                </span>
                <span className="leading-relaxed mt-0.5">{value}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIdx === 0}
          onClick={handlePrev}
          className="text-xs h-8 px-3 font-semibold"
        >
          Previous
        </Button>
        <Button
          size="sm"
          disabled={!selectedAnswer}
          onClick={handleNext}
          className="text-xs h-8 px-4 font-semibold"
        >
          {currentIdx === questions.length - 1 ? "Finish Quiz" : "Next Question"}
        </Button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const conversationId = params.id ? parseInt(params.id) : null;

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [activeCitationSource, setActiveCitationSource] = useState<string | null>(null);
  
  // Parse moduleId from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const moduleIdParam = searchParams.get("moduleId");
  const moduleId = moduleIdParam ? parseInt(moduleIdParam) : null;

  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  // Mention system state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPos, setMentionPos] = useState(-1);

  // Artifacts viewport workspace state (rendered in main area instead of modal)
  const [viewingArtifacts, setViewingArtifacts] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | number | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // API hooks
  const { data: myModules } = useListModules({ visibility: "all" });
  const modulesList = Array.isArray(myModules) ? myModules : [];
  const filteredModules = modulesList.filter(m => m.title.toLowerCase().includes(mentionQuery.toLowerCase()));

  // Active module scope
  const { data: module } = useGetModule(moduleId ?? 0, { enabled: !!moduleId });
  const { data: content } = useGetModuleContent(moduleId ?? 0, { enabled: !!moduleId });
  const { data: sources, isLoading: sourcesLoading } = useGetModuleSources(moduleId ?? 0, { enabled: !!moduleId });
  const chapters = content ? [...new Set(content.map((c: any) => c.chapter))] : [];

  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const { data: conversation } = useGetConversation(conversationId!, {
    query: { enabled: !!conversationId } as any
  });
  const { data: messages, isLoading: msgsLoading } = useGetMessages(conversationId!, {
    query: { enabled: !!conversationId } as any
  });

  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();
  const updateConv = useUpdateConversation();
  const sendMsg = useSendMessage();
  const { data: artifactsData } = useListArtifacts();
  const artifactsList = Array.isArray(artifactsData) ? artifactsData : [];

  useEffect(() => {
    if (!viewingArtifacts) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, viewingArtifacts]);

  // Reset flashcards when active artifact changes
  useEffect(() => {
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
  }, [activeArtifactId]);

  // Filter conversations
  const filteredConvs = Array.isArray(conversations) ? conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  ) : [];

  // Module specific conversations
  const moduleConvs = filteredConvs.filter(c => c.taggedModuleIds?.includes(moduleId ?? 0));

  // Artifact filtering
  const visibleArtifacts = artifactsList.filter(a => {
    if (!moduleId) return true;
    if (Number(a.moduleId) === Number(moduleId)) return true;
    if (a.conversationId) {
      const conv = conversations?.find((c: any) => c.id === a.conversationId);
      if (conv && conv.taggedModuleIds?.includes(moduleId)) {
        return true;
      }
    }
    return false;
  });

  function handleNewChat() {
    setViewingArtifacts(false);
    createConv.mutate({ data: { title: "New conversation" } }, {
      onSuccess: (conv: any) => {
        qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation(`/app/chat/${conv.id}`);
      },
      onError: () => toast.error("Failed to create conversation")
    });
  }

  function handleNewModuleChat() {
    setViewingArtifacts(false);
    if (!moduleId || !module) return;
    createConv.mutate({
      data: {
        title: `Chat: ${module.title}`,
        taggedModuleIds: [moduleId]
      }
    }, {
      onSuccess: (conv: any) => {
        qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation(`/app/chat/${conv.id}?moduleId=${moduleId}`);
      },
      onError: () => toast.error("Failed to create module conversation")
    });
  }

  function handleDelete(id: number) {
    deleteConv.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (conversationId === id) {
          setLocation(moduleId ? `/app/chat?moduleId=${moduleId}` : "/app/chat");
        }
        toast.success("Conversation deleted");
      }
    });
  }

  function handlePin(conv: any) {
    updateConv.mutate({ id: conv.id, data: { pinned: !conv.pinned } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListConversationsQueryKey() })
    });
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const caret = e.target.selectionStart ?? value.length;
    setInput(value);

    const before = value.slice(0, caret);
    const atIdx = before.lastIndexOf("@");
    
    if (atIdx !== -1) {
      const prevChar = atIdx === 0 ? " " : before[atIdx - 1];
      if (/\s/.test(prevChar) || atIdx === 0) {
        const afterAt = before.slice(atIdx + 1);
        if (!afterAt.includes(" ")) {
          setShowMentionPicker(true);
          setMentionQuery(afterAt);
          setMentionPos(atIdx);
          return;
        }
      }
    }
    
    setShowMentionPicker(false);
  };

  const insertMention = (moduleTitle: string) => {
    if (mentionPos < 0) return;
    const before = input.slice(0, mentionPos);
    const caret = textareaRef.current?.selectionStart ?? input.length;
    const after = input.slice(caret);
    const newText = before + moduleTitle + " " + after;
    setInput(newText);
    setShowMentionPicker(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = (before + moduleTitle + " ").length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  function handleSend() {
    setViewingArtifacts(false);
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");

    if (!conversationId) {
      const createData = moduleId 
        ? { title: `Chat: ${module?.title || "Module"}`, taggedModuleIds: [moduleId] }
        : { title: content.slice(0, 50) };

      createConv.mutate({ data: createData }, {
        onSuccess: (conv: any) => {
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setLocation(moduleId ? `/app/chat/${conv.id}?moduleId=${moduleId}` : `/app/chat/${conv.id}`);
          sendMsg.mutate({ id: conv.id, data: { content, webSearch, taggedModuleIds: moduleId ? [moduleId] : undefined } }, {
            onSuccess: () => {
              qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(conv.id) });
            }
          });
        },
        onError: () => {
          toast.error("Failed to create conversation");
          setInput(content);
        }
      });
      return;
    }

    sendMsg.mutate({ id: conversationId, data: { content, webSearch, taggedModuleIds: moduleId ? [moduleId] : undefined } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(conversationId) });
        qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
      onError: () => {
        toast.error("Failed to send message");
        setInput(content);
      }
    });
  }

  function handlePrompt(prompt: string) {
    setViewingArtifacts(false);
    if (!conversationId) {
      const createData = moduleId 
        ? { title: `Chat: ${module?.title || "Module"}`, taggedModuleIds: [moduleId] }
        : { title: prompt.slice(0, 50) };

      createConv.mutate({ data: createData }, {
        onSuccess: (conv: any) => {
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setLocation(moduleId ? `/app/chat/${conv.id}?moduleId=${moduleId}` : `/app/chat/${conv.id}`);
          setTimeout(() => {
            sendMsg.mutate({ id: conv.id, data: { content: prompt, taggedModuleIds: moduleId ? [moduleId] : undefined } }, {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(conv.id) });
              }
            });
          }, 300);
        }
      });
    } else {
      setInput(prompt);
    }
  }

  const selectedArtifact = artifactsList.find(a => String(a.id) === String(activeArtifactId));

  return (
    <AppLayout>
      <div className="h-[calc(100vh-64px)] flex relative overflow-hidden">
        {/* Conversations / Chapters Left Sidebar */}
        <div className={cn(
          "border-r border-border flex flex-col bg-sidebar shrink-0 p-3 space-y-4 overflow-y-auto transition-all duration-300 relative",
          leftCollapsed ? "w-0 p-0 border-r-0 overflow-hidden" : "w-[260px]"
        )}>

          {moduleId ? (
            /* MODULE scoped chat view - Two distinct boxes */
            <>
              {/* Back to Module page link */}
              <button
                onClick={() => setLocation(`/app/modules/${moduleId}`)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-1"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Study Guide
              </button>

              {/* BOX 1: Module Conversations */}
              <div className="rounded-xl border border-border bg-card p-3 flex flex-col space-y-2.5">
                <div className="flex items-center gap-2 px-1 text-primary">
                  <GraduationCap className="h-4 w-4 shrink-0" />
                  <span className="text-[11px] font-bold tracking-wide uppercase truncate">
                    {module?.title || "Module"} Chats
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <Button className="w-full h-8 text-[11px] font-semibold" size="sm" onClick={handleNewModuleChat}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> New Chat
                  </Button>
                  <Button
                    variant={viewingArtifacts ? "default" : "outline"}
                    className="w-full h-8 text-[11px] font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                    size="sm"
                    onClick={() => {
                      setViewingArtifacts(true);
                      if (visibleArtifacts.length > 0 && !activeArtifactId) {
                        setActiveArtifactId(visibleArtifacts[0].id);
                      }
                    }}
                  >
                    <Layers className="h-3.5 w-3.5 mr-1" /> View Artifacts
                  </Button>
                </div>

                <div className="border-t border-border/60 pt-2.5 space-y-1 max-h-[160px] overflow-y-auto pr-0.5">
                  {moduleConvs.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-[10px] text-muted-foreground">No chats in this module yet</p>
                    </div>
                  ) : (
                    moduleConvs.map(c => (
                      <ConversationItem
                        key={c.id} conv={c}
                        active={conversationId === c.id && !viewingArtifacts}
                        onSelect={() => {
                          setViewingArtifacts(false);
                          setLocation(`/app/chat/${c.id}?moduleId=${moduleId}`);
                        }}
                        onDelete={() => handleDelete(c.id)}
                        onPin={() => handlePin(c)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* BOX 2: Chapter References */}
              <div className="rounded-xl border border-border bg-card p-3 flex flex-col flex-1 min-h-[180px]">
                <div className="flex items-center gap-1.5 mb-2 shrink-0 px-1 text-primary">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[11px] font-bold tracking-wide uppercase">Chapter Index</span>
                </div>
                <div className="space-y-1 overflow-y-auto flex-1 pr-0.5 scrollbar-thin">
                  {chapters.length === 0 ? (
                    <div className="text-center py-6 text-[10px] text-muted-foreground">No chapters generated yet</div>
                  ) : (
                    chapters.map((ch: any) => (
                      <button
                        key={ch}
                        onClick={() => {
                          setViewingArtifacts(false);
                          const refText = `Regarding chapter "${ch}": `;
                          setInput(prev => prev.startsWith(refText) ? prev : refText + prev);
                          textareaRef.current?.focus();
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-start gap-1.5 font-medium leading-normal border border-transparent hover:border-border/50 truncate"
                      >
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/50" />
                        <span className="truncate w-full">{ch}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            /* NORMAL general chat view */
            <>
              <div className="space-y-2 shrink-0">
                <Button className="w-full h-8 text-xs font-semibold" size="sm" onClick={handleNewChat}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Chat
                </Button>
                <Button
                  variant={viewingArtifacts ? "default" : "outline"}
                  className="w-full h-8 text-xs font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-all"
                  size="sm"
                  onClick={() => {
                    setViewingArtifacts(true);
                    if (visibleArtifacts.length > 0 && !activeArtifactId) {
                      setActiveArtifactId(visibleArtifacts[0].id);
                    }
                  }}
                >
                  <Layers className="h-3.5 w-3.5 mr-1" /> My AI Artifacts
                </Button>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search chats..."
                    className="pl-8 h-7 text-xs bg-muted border-0"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                {convsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-3 py-2">
                      <Skeleton className="h-3 w-3/4 mb-1" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  ))
                ) : !filteredConvs?.length ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">No conversations</p>
                  </div>
                ) : (
                  <>
                    {filteredConvs.filter(c => c.pinned).length > 0 && (
                      <div className="px-2 pt-2 pb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pinned</span>
                      </div>
                    )}
                    {filteredConvs.filter(c => c.pinned).map(c => (
                      <ConversationItem
                        key={c.id} conv={c}
                        active={conversationId === c.id && !viewingArtifacts}
                        onSelect={() => {
                          setViewingArtifacts(false);
                          setLocation(`/app/chat/${c.id}`);
                        }}
                        onDelete={() => handleDelete(c.id)}
                        onPin={() => handlePin(c)}
                      />
                    ))}
                    {filteredConvs.filter(c => !c.pinned).length > 0 && (
                      <div className="px-2 pt-2 pb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Recent</span>
                      </div>
                    )}
                    {filteredConvs.filter(c => !c.pinned).map(c => (
                      <ConversationItem
                        key={c.id} conv={c}
                        active={conversationId === c.id && !viewingArtifacts}
                        onSelect={() => {
                          setViewingArtifacts(false);
                          setLocation(`/app/chat/${c.id}`);
                        }}
                        onDelete={() => handleDelete(c.id)}
                        onPin={() => handlePin(c)}
                      />
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Left Collapse Trigger Button */}
        <button
          onClick={() => setLeftCollapsed(!leftCollapsed)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-card border border-border hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-300 rounded-r-lg border-l-0 shadow-sm",
            leftCollapsed ? "left-0" : "left-[259px]"
          )}
          title={leftCollapsed ? "Expand panel" : "Collapse panel"}
        >
          {leftCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Chat / Artifacts Workspace Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {viewingArtifacts ? (
            /* ARTIFACTS VIEW taking over the main content area */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Workspace Header */}
              <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    {moduleId ? `Study Artifacts: ${module?.title}` : "My Study Artifacts"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingArtifacts(false)}
                  className="h-7 px-2 text-xs font-semibold"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Exit Workspace
                </Button>
              </div>

              {/* Workspace Split Body */}
              <div className="flex-1 grid grid-cols-[250px_1fr] gap-4 p-4 min-h-0 overflow-hidden bg-muted/5">
                {/* Left side: Artifacts list */}
                <div className="border border-border/80 bg-card rounded-2xl p-3 flex flex-col space-y-2 overflow-y-auto min-h-0 shadow-sm">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                    Available Items ({visibleArtifacts.length})
                  </h3>
                  {visibleArtifacts.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground font-semibold">
                      No study artifacts found.
                    </div>
                  ) : (
                    visibleArtifacts.map(art => (
                      <button
                        key={art.id}
                        onClick={() => setActiveArtifactId(art.id)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col gap-1.5 hover:scale-[1.01]",
                          String(activeArtifactId) === String(art.id)
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {art.type === "diagram" ? <BrainCircuit className="h-4 w-4 shrink-0 text-primary" /> :
                           art.type === "code" ? <FileText className="h-4 w-4 shrink-0 text-primary" /> :
                           art.type === "document" ? <Layers className="h-4 w-4 shrink-0 text-primary" /> :
                           art.type === "test" ? <GraduationCap className="h-4 w-4 shrink-0 text-primary" /> :
                           <FileText className="h-4 w-4 shrink-0 text-primary" />}
                          <span className="truncate w-full">{art.title}</span>
                        </div>
                        <div className="flex justify-between items-center w-full text-[9px] font-bold text-muted-foreground/80">
                          <span className="uppercase">{art.type}</span>
                          <span>{timeAgo(art.createdAt)}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Right side: Selected Artifact interactive preview */}
                <div className="border border-border/80 bg-card rounded-2xl p-6 flex flex-col min-h-0 overflow-y-auto justify-between shadow-sm">
                  {selectedArtifact ? (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-4 flex-1">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                          <h4 className="font-bold text-sm text-foreground">{selectedArtifact.title}</h4>
                          <Badge className="uppercase text-[9px] font-bold h-5 bg-primary/10 text-primary border-0">{selectedArtifact.type}</Badge>
                        </div>

                        {/* Rendering different types of previews */}
                        {selectedArtifact.type === "diagram" && (
                          <InteractiveMindMap
                            content={selectedArtifact.content}
                            title={selectedArtifact.title}
                          />
                        )}

                        {selectedArtifact.type === "code" && (
                          <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[10px] overflow-x-auto whitespace-pre leading-relaxed border border-border/40 shadow-inner">
                            {selectedArtifact.content}
                          </div>
                        )}

                        {selectedArtifact.type === "document" && (
                          <div className="space-y-4">
                            {/* Interactive Flashcards */}
                            {(() => {
                              try {
                                const flashcards = JSON.parse(selectedArtifact.content);
                                if (Array.isArray(flashcards)) {
                                  return (
                                    <div className="flex flex-col items-center py-4">
                                      <div
                                        onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                                        className={cn(
                                          "w-[340px] h-[180px] rounded-2xl border flex items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 shadow-md relative select-none",
                                          flashcardFlipped 
                                            ? "border-primary bg-primary/5 text-primary scale-[1.01]" 
                                            : "border-border bg-card text-foreground hover:border-primary/20"
                                        )}
                                      >
                                        <div className="absolute top-2.5 left-3 text-[9px] text-muted-foreground font-semibold uppercase">
                                          {flashcardFlipped ? "Answer" : "Question"}
                                        </div>
                                        <span className="text-xs font-bold leading-relaxed">
                                          {flashcardFlipped ? flashcards[flashcardIndex].back : flashcards[flashcardIndex].front}
                                        </span>
                                      </div>
                                      <p className="text-[9px] text-muted-foreground/60 mt-2">Click to flip card</p>
                                      
                                      <div className="flex items-center justify-between w-full max-w-[340px] mt-5">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={flashcardIndex === 0}
                                          onClick={(e) => { e.stopPropagation(); setFlashcardIndex(prev => prev - 1); setFlashcardFlipped(false); }}
                                          className="text-xs h-7 px-2"
                                        >
                                          Prev
                                        </Button>
                                        <span className="text-[10px] font-semibold">Card {flashcardIndex + 1} of {flashcards.length}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={flashcardIndex === flashcards.length - 1}
                                          onClick={(e) => { e.stopPropagation(); setFlashcardIndex(prev => prev + 1); setFlashcardFlipped(false); }}
                                          className="text-xs h-7 px-2"
                                        >
                                          Next
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                }
                              } catch (_) {}
                              return <div className="text-xs text-muted-foreground whitespace-pre-wrap">{selectedArtifact.content}</div>;
                            })()}
                          </div>
                        )}

                        {selectedArtifact.type === "test" && (
                          <ArtifactQuizPlayer
                            questions={(() => {
                              try {
                                const q = JSON.parse(selectedArtifact.content);
                                if (Array.isArray(q)) return q;
                              } catch (_) {}
                              return [];
                            })()}
                            artifactId={selectedArtifact.id}
                          />
                        )}

                        {selectedArtifact.type === "markdown" && (
                          <MarkdownRenderer content={selectedArtifact.content} className="text-xs text-muted-foreground leading-relaxed" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-xs text-muted-foreground">
                      <Layers className="h-8 w-8 mb-2 opacity-35" />
                      <p>Select an artifact on the left to preview.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD CHAT INTERFACE */
            <>
              <div className="flex-1 flex flex-col overflow-hidden">
                {!conversationId ? (
                  /* Empty state / Suggested Prompts */
                  <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight mb-1 text-foreground">AI Study Partner</h2>
                    <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
                      {moduleId 
                        ? `Scoped to your "${module?.title}" module. Select a conversation or start a new one to begin.`
                        : "Chat with your knowledge modules using AI. Select a conversation or start a new one."}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full">
                      {SUGGESTED_PROMPTS.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => handlePrompt(prompt)}
                          className="text-left px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-xs font-semibold leading-relaxed"
                        >
                          <ChevronRight className="h-3.5 w-3.5 text-primary inline mr-1.5 -mt-0.5 shrink-0" />
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Chat header */}
                    <div className="h-12 border-b border-border flex items-center justify-between px-4 gap-2 shrink-0 bg-card">
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-bold text-foreground truncate">{conversation?.title ?? "Chat"}</span>
                        {moduleId && (
                          <Badge variant="secondary" className="text-[9px] font-semibold tracking-wide uppercase px-1 py-0 h-4 bg-primary/10 text-primary border-0">
                            {module?.title} Scoped
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Messages Log */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-muted/5">
                      {msgsLoading ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : !Array.isArray(messages) || messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                          <p>No messages yet. Send a message to start.</p>
                        </div>
                      ) : (
                        messages.map(msg => <MessageBubble key={msg.id} msg={msg} onCitationClick={setActiveCitationSource} />)
                      )}
                      {sendMsg.isPending && (
                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">
                            AI
                          </div>
                          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border">
                            <div className="flex gap-1 py-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </>
                )}
              </div>

              {/* Input text bar */}
              <div className="border-t border-border p-4 shrink-0 bg-background z-10">
                <div className="relative bg-card/40 backdrop-blur-2xl border border-border/50 rounded-2xl p-2 shadow-sm ring-1 ring-white/5 max-w-3xl mx-auto w-full">
                  <div className="flex items-end gap-2 px-2">
                    <div className="relative flex-1">
                      <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleTextChange}
                        onKeyDown={e => {
                          if (e.key === "Escape" && showMentionPicker) {
                            e.preventDefault();
                            setShowMentionPicker(false);
                            return;
                          }
                          if (e.key === "Enter" && !e.shiftKey && !showMentionPicker) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Ask a question or tag a module with @..."
                        rows={1}
                        className="w-full resize-none bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 font-medium"
                        style={{ maxHeight: "150px", overflowY: "auto" }}
                      />

                      {/* Mention Picker Popup */}
                      {showMentionPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                          <div className="p-2 border-b border-border text-[10px] font-bold text-muted-foreground bg-muted/50 uppercase tracking-wider">Select Module</div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {filteredModules.length > 0 ? filteredModules.map(m => (
                              <button
                                key={m.id}
                                onClick={() => insertMention(`@${m.title}`)}
                                className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors truncate font-semibold"
                              >
                                {m.title}
                              </button>
                            )) : (
                              <div className="p-3 text-[10px] text-muted-foreground text-center font-medium">No modules found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mb-1 shrink-0">
                      <button
                        onClick={() => setWebSearch(!webSearch)}
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
                          webSearch ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        )}
                        title="Web search"
                      >
                        <Globe className="h-4 w-4" />
                      </button>
                      <Button
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-primary shadow hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                        onClick={handleSend}
                        disabled={!input.trim() || sendMsg.isPending}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[9px] text-muted-foreground/60 font-semibold mt-2 uppercase tracking-wider">
                  AI-generated response · check source citations to verify
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right Collapse Trigger Button */}
        {moduleId && !viewingArtifacts && (
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-card border border-border hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-300 rounded-l-lg border-r-0 shadow-sm",
              rightCollapsed ? "right-0" : "right-[259px]"
            )}
            title={rightCollapsed ? "Expand details" : "Collapse details"}
          >
            {rightCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}

        {/* Sliding split-screen RAG source viewer */}
        {activeCitationSource && (
          <div className="w-[340px] border-l border-border bg-card flex flex-col h-full shrink-0 shadow-xl animate-in slide-in-from-right duration-200 relative z-20">
            {/* Header */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-muted/20 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate text-foreground">Source Viewer: {activeCitationSource}</span>
              </div>
              <button
                onClick={() => setActiveCitationSource(null)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-muted/40 border border-border/80 rounded-xl space-y-1.5 shadow-inner">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Retrieved Document</span>
                <h4 className="font-bold text-foreground truncate">{activeCitationSource}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4.5 bg-primary/5 text-primary border-primary/10 font-bold">
                    {getCitationContext(activeCitationSource).page}
                  </Badge>
                  <span className="text-[10px] text-emerald-500 font-semibold">{getCitationContext(activeCitationSource).relevance} relevance match</span>
                </div>
              </div>

              {/* Context passage */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Retrieved Context Highlight</span>
                <div className="p-3.5 bg-card border border-border rounded-xl leading-relaxed text-muted-foreground shadow-xs">
                  {(() => {
                    const ctx = getCitationContext(activeCitationSource);
                    const parts = ctx.fullText.split(ctx.highlight);
                    return parts.map((part, idx) => (
                      <span key={idx}>
                        {part}
                        {idx < parts.length - 1 && (
                          <span className="bg-primary/20 text-foreground font-bold px-1.5 py-0.5 rounded shadow-sm border border-primary/30 select-text">
                            {ctx.highlight}
                          </span>
                        )}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-[10px] text-muted-foreground leading-normal flex items-start gap-2 shadow-xs">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Hovering or clicking other inline citation numbers will instantly update this previewer with the matched text context.</span>
              </div>
            </div>
          </div>
        )}

        {/* Right Sidebar (only when moduleId is present and not viewing artifacts) */}
        {moduleId && !viewingArtifacts && (
          <div className={cn(
            "border-l border-border flex flex-col bg-sidebar shrink-0 p-3 space-y-4 overflow-y-auto transition-all duration-300 relative",
            rightCollapsed ? "w-0 p-0 border-l-0 overflow-hidden" : "w-[260px]"
          )}>
            {/* BOX 1: Module Sources */}
            <div className="rounded-xl border border-border bg-card p-3 flex flex-col min-h-[180px]">
              <div className="flex items-center gap-1.5 mb-2.5 shrink-0 px-1 text-primary">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] font-bold tracking-wide uppercase">Module Sources</span>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5 scrollbar-thin">
                {sourcesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-lg" />
                  ))
                ) : !sources || sources.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-muted-foreground font-semibold">No sources added yet</div>
                ) : (
                  sources.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/50">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        {s.type === "url" ? <Globe className="h-3 w-3 text-primary" />
                          : s.type === "pdf" ? <FileText className="h-3 w-3 text-primary" />
                          : <FileText className="h-3 w-3 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold truncate text-foreground leading-normal">{s.name}</p>
                        <p className={cn("text-[9px] font-semibold", s.processed ? "text-emerald-500" : "text-amber-500")}>
                          {s.processed ? "Processed" : "Processing..."}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BOX 2: Details */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-3 shrink-0">
              <div className="flex items-center gap-1.5 px-1 text-primary">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] font-bold tracking-wide uppercase">Details</span>
              </div>
              <div className="space-y-2 text-[10px] font-semibold text-muted-foreground">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span>Status</span>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px] font-bold px-1.5 py-0 h-4 uppercase">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span>Total Chapters</span>
                  <span className="text-foreground">{chapters.length}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span>Credits</span>
                  <span className="text-foreground">{module?.creditsValue ?? 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span>Visibility</span>
                  <span className="text-foreground capitalize">{module?.visibility || "private"}</span>
                </div>
                {module?.fields && module.fields.length > 0 ? (
                  <div className="flex flex-col gap-1 pb-2 border-b border-border/50">
                    <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Fields</span>
                    <div className="flex flex-wrap gap-1">
                      {module.fields.map((f: string) => (
                        <Badge key={f} variant="outline" className="text-[9px] px-1 py-0 capitalize bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 pb-2 border-b border-border/50">
                    <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Fields</span>
                    <span className="text-[10px] text-muted-foreground italic font-normal">None</span>
                  </div>
                )}
                {module?.domains && module.domains.length > 0 ? (
                  <div className="flex flex-col gap-1 pb-2 border-b border-border/50">
                    <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Domains</span>
                    <div className="flex flex-wrap gap-1">
                      {module.domains.map((d: string) => (
                        <Badge key={d} variant="outline" className="text-[9px] px-1 py-0 capitalize bg-primary/5 border-primary/10 text-primary">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 pb-2 border-b border-border/50">
                    <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Domains</span>
                    <span className="text-[10px] text-muted-foreground italic font-normal">None</span>
                  </div>
                )}
                {module?.tags && module.tags.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Tags</span>
                    <div className="flex flex-wrap gap-1">
                      {module.tags.map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[9px] px-1 py-0 bg-muted/60 text-muted-foreground">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Tags</span>
                    <span className="text-[10px] text-muted-foreground italic font-normal">None</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
