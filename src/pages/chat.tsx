import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import {
  useListConversations, useGetConversation, useGetMessages, useSendMessage,
  useCreateConversation, useDeleteConversation, useUpdateConversation,
  useListModules,
  getListConversationsQueryKey, getGetMessagesQueryKey, getGetConversationQueryKey
} from "@workspace/api-client-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  MessageSquare, Plus, Search, Trash2, Pin, PinOff, Send, Loader2,
  BookOpen, Globe, User, Bot, Zap, ChevronRight, MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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
        <p className="text-xs font-medium truncate">{conv.title}</p>
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

function MessageBubble({ msg }: { msg: any }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={cn("max-w-[75%] space-y-1", isUser && "items-end flex flex-col")}>
        <div className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-border rounded-tl-sm"
        )}>
          {msg.content}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo(msg.createdAt)}</span>
          {msg.creditsUsed && (
            <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
              <Zap className="h-2.5 w-2.5" />{msg.creditsUsed}
            </span>
          )}
        </div>
        {msg.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {msg.sources.map((src: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-[10px] h-4">
                <BookOpen className="h-2 w-2 mr-1" />{src}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const conversationId = params.id ? parseInt(params.id) : null;
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPos, setMentionPos] = useState(-1);

  const { data: myModules } = useListModules({ visibility: "all" });
  const modulesList = Array.isArray(myModules) ? myModules : [];
  const filteredModules = modulesList.filter(m => m.title.toLowerCase().includes(mentionQuery.toLowerCase()));

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConvs = Array.isArray(conversations) ? conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  ) : [];

  function handleNewChat() {
    createConv.mutate({ data: { title: "New conversation" } }, {
      onSuccess: (conv: any) => {
        qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation(`/app/chat/${conv.id}`);
      },
      onError: () => toast.error("Failed to create conversation")
    });
  }

  function handleDelete(id: number) {
    deleteConv.mutate({ id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        if (conversationId === id) setLocation("/app/chat");
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
    if (!input.trim()) return;
    const content = input.trim();
    setInput("");

    if (!conversationId) {
      createConv.mutate({ data: { title: content.slice(0, 50) } }, {
        onSuccess: (conv: any) => {
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setLocation(`/app/chat/${conv.id}`);
          sendMsg.mutate({ id: conv.id, data: { content, webSearch } }, {
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

    sendMsg.mutate({ id: conversationId, data: { content, webSearch } }, {
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
    if (!conversationId) {
      createConv.mutate({ data: { title: prompt.slice(0, 50) } }, {
        onSuccess: (conv: any) => {
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setLocation(`/app/chat/${conv.id}`);
          setTimeout(() => {
            sendMsg.mutate({ id: conv.id, data: { content: prompt } }, {
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

  return (
    <AppLayout>
      <div className="h-[calc(100vh-56px)] flex">
        {/* Conversations sidebar */}
        <div className="w-64 border-r border-border flex flex-col bg-sidebar shrink-0">
          <div className="p-3 space-y-2">
            <Button className="w-full h-8 text-xs" size="sm" onClick={handleNewChat}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Chat
            </Button>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 h-7 text-xs bg-muted border-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
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
                    active={conversationId === c.id}
                    onSelect={() => setLocation(`/app/chat/${c.id}`)}
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
                    active={conversationId === c.id}
                    onSelect={() => setLocation(`/app/chat/${c.id}`)}
                    onDelete={() => handleDelete(c.id)}
                    onPin={() => handlePin(c)}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Chat main area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {!conversationId ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-1">AI Chat</h2>
                <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
                  Chat with your knowledge modules using AI. Select a conversation or start a new one.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handlePrompt(prompt)}
                      className="text-left px-4 py-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm"
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary inline mr-1.5 -mt-0.5" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="h-12 border-b border-border flex items-center px-4 gap-2 shrink-0">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{conversation?.title ?? "Chat"}</span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                  {msgsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !Array.isArray(messages) || messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <p className="text-sm text-muted-foreground">No messages yet. Say something!</p>
                    </div>
                  ) : (
                    messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
                  )}
                  {sendMsg.isPending && (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border">
                        <div className="flex gap-1">
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

          {/* Input bar */}
          <div className="border-t border-border p-4 shrink-0 bg-background z-10">
                <div className="relative bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] p-2 shadow-xl shadow-black/5 ring-1 ring-white/10">
                  <div className="flex items-end gap-2 px-2">
                    {/* Input Wrapper */}
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
                        placeholder="Ask something..."
                        rows={1}
                        className="w-full resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 font-medium"
                        style={{ maxHeight: "150px", overflowY: "auto" }}
                      />

                      {/* Mention Picker Floating */}
                      {showMentionPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                          <div className="p-2 border-b border-border text-xs font-semibold text-muted-foreground bg-muted/50">Select Module</div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {filteredModules.length > 0 ? filteredModules.map(m => (
                              <button
                                key={m.id}
                                onClick={() => insertMention(m.title)}
                                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors truncate font-medium"
                              >
                                {m.title}
                              </button>
                            )) : (
                              <div className="p-3 text-xs text-muted-foreground text-center">No modules found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                      <button
                        onClick={() => setWebSearch(!webSearch)}
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                          webSearch ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        )}
                        title="Web search"
                      >
                        <Globe className="h-4 w-4" />
                      </button>
                      <Button
                        size="icon"
                        className="h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100"
                        onClick={handleSend}
                        disabled={!input.trim() || sendMsg.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-muted-foreground/60 font-medium mt-2">
                  AI can make mistakes — verify important information.
                </p>
              </div>
        </div>
      </div>
    </AppLayout>
  );
}
