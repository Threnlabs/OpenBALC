import React, { useState } from "react";
import type { Message } from "benchrex/types";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "benchrex/components/ui/collapsible";
import { ChevronDown, BookOpen, Copy, Check, Pin, ThumbsUp, ThumbsDown, Loader2, UserCircle, FileText, Music, Download, ExternalLink, BrainCircuit, Sparkles, Undo2, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Badge } from "benchrex/components/ui/badge";
import { Button } from "benchrex/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "benchrex/components/ui/tooltip";
import { toast } from "sonner";
import SearchResultsCard from "./SearchResultsCard";

interface ChatBubbleProps {
  message: Message;
  index: number;
  onPin?: (msg: Message) => Promise<void> | void;
  onFeedback?: (msg: Message, feedback: "up" | "down") => void;
  onAskExpert?: (msg: Message) => void;
  onAcceptAction?: (actionId: string) => Promise<void>;
  onUndoAction?: (actionId: string) => Promise<void>;
  pinning?: boolean;
}

const ChatBubble = ({ message, index, onPin, onFeedback, onAskExpert, onAcceptAction, onUndoAction, pinning }: ChatBubbleProps) => {
  const isUser = message.role === "user";
  const isExpert = message.role === "expert";
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState<'pending' | 'accepted' | 'undone'>('pending');
  const [actionLoading, setActionLoading] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };
  const handleAction = async (type: 'accept' | 'undo') => {
    if (!message.aiActionId) return;
    setActionLoading(true);
    try {
      if (type === 'accept') {
        await onAcceptAction?.(message.aiActionId);
        setActionStatus('accepted');
        toast.success("Changes accepted and saved");
      } else {
        await onUndoAction?.(message.aiActionId);
        setActionStatus('undone');
        toast.success("Changes reverted");
      }
    } catch (err) {
      toast.error("Failed to process action");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.05 }}
      className={`flex gap-4 w-full ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className="shrink-0 pt-1">
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-sm ${
          isUser 
          ? "bg-primary text-primary-foreground" 
          : isExpert
            ? "bg-blue-600 text-white"
            : "bg-white dark:bg-zinc-900 border border-border"
        }`}>
          {isUser ? (
            <UserCircle className="h-6 w-6" />
          ) : isExpert ? (
            <Shield className="h-5 w-5" />
          ) : (
            <span className="text-xl">{message.personalityIcon || <BrainCircuit className="h-5 w-5 text-primary" />}</span>
          )}
        </div>
      </div>

      {/* Bubble Content */}
      {/* Bubble Content */}
      <div className={`flex flex-col group max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Personality Name & Time (Outside padding) */}
        {!isUser && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isExpert ? "text-blue-600" : "text-primary/80"}`}>
              {isExpert ? "Expert Response" : (message.tags?.[0] || "AI Response")}
            </span>
            <div className="h-1 w-1 rounded-full bg-primary/30" />
            <span className="text-[10px] text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        {/* User Tag bar (Outside padding) */}
        {isUser && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              YOU
            </span>
            <div className="h-1 w-1 rounded-full bg-primary/30" />
            <span className="text-[10px] text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        {/* Reasoning / Chain of Thought (Outside padding) */}
        {!isUser && message.reasoning && (
          <div className="mb-3 w-full px-1">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary/70 hover:text-primary transition-colors group">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                Show thinking
                <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 rounded-2xl bg-muted/30 border border-border/50 p-5 shadow-sm">
                  <div className="prose prose-sm prose-p:text-muted-foreground text-muted-foreground italic text-[13px] leading-relaxed">
                    {message.reasoning}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div
          className={`relative w-full ${
            isUser
              ? "px-4 py-2.5 rounded-2xl bg-bubble-user"
              : "px-1 py-2"
          }`}
        >
          {/* Topic mentions */}
          {isUser && message.topicMentions?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.topicMentions.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] font-medium bg-primary-foreground/10 text-primary-foreground border-none backdrop-blur-md">
                  @{t}
                </Badge>
              ))}
            </div>
          )}

          {/* Attachments */}
          {message.attachments?.length > 0 && (
            <div className="mb-4 flex flex-col gap-3">
              {message.attachments.map((a) => (
                <div key={a.id} className="glass-card overflow-hidden rounded-2xl transition-transform hover:scale-[1.01]">
                  {a.type === "image" ? (
                    <div className="relative group">
                      <img src={a.url} alt={a.name} className="max-h-[400px] w-full object-contain bg-black/5" />
                      <a 
                        href={a.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                      >
                        <ExternalLink className="h-6 w-6 text-white" />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        a.type === "pdf" ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {a.type === "pdf" ? <FileText className="h-6 w-6" /> : <Music className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase">
                          {a.type} • {((a.size || 0) / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl" asChild>
                        <a href={a.url} download={a.name}>
                          <Download className="h-5 w-5" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Action Banner */}
          {!isUser && message.aiActionId && actionStatus === 'pending' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20 backdrop-blur-sm shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary uppercase tracking-tight">AI Modification Proposed</h4>
                  <p className="text-[11px] text-muted-foreground leading-tight">Review the changes before finalizing them.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  className="h-8 flex-1 rounded-xl gap-2 bg-primary hover:bg-primary/90 text-[11px] font-bold"
                  onClick={() => handleAction('accept')}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Keep Changes
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 flex-1 rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5 text-[11px] font-bold"
                  onClick={() => handleAction('undo')}
                  disabled={actionLoading}
                >
                  <Undo2 className="h-3 w-3" />
                  Undo Action
                </Button>
              </div>
            </motion.div>
          )}

          {!isUser && message.aiActionId && actionStatus === 'accepted' && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/20 text-green-600 text-[11px] font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Changes Finalized
            </div>
          )}

          {!isUser && message.aiActionId && actionStatus === 'undone' && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-500/5 border border-zinc-500/20 text-zinc-500 text-[11px] font-bold">
              <Undo2 className="h-3.5 w-3.5" />
              Action Reverted
            </div>
          )}

          {/* Web Search Results */}
          {!isUser && message.webSearch && message.webSearch.results && message.webSearch.results.length > 0 && (
            <div className="mb-4">
              <SearchResultsCard webSearch={message.webSearch} />
            </div>
          )}

          {/* Content */}
          <div className={`max-w-none prose dark:prose-invert leading-relaxed ${
            isUser 
            ? "prose-sm text-primary-foreground prose-p:text-primary-foreground font-medium" 
            : "prose-base md:prose-lg prose-headings:text-primary prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-a:text-primary hover:prose-a:underline prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:p-2 prose-td:border prose-td:border-border prose-td:p-2"
          }`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Sources Citation */}
          {!isUser && message.sources?.length > 0 && (
            <Collapsible className="mt-5 border-t border-border pt-3">
              <CollapsibleTrigger className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors">
                <BookOpen className="h-3 w-3" />
                Retrieved Chunks ({message.sources.length})
                <ChevronDown className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {message.sources.map((src: any, idx: number) => (
                  <div
                    key={src.id || src.chunk_id || `src-${idx}`}
                    className="rounded-xl bg-muted/30 p-3 text-[11px] border border-border/30 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">
                          {src.type === 'web_search' ? 'Web Result' : (src.subject || 'Reference')}
                        </span>
                        {src.chapter && (
                          <>
                            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-muted-foreground">{src.chapter}</span>
                          </>
                        )}
                      </div>
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          Visit <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    <p className="font-medium mb-1 line-clamp-1">{src.title}</p>
                    {src.content && (
                      <p className="text-muted-foreground line-clamp-2 italic">
                        "{src.content.slice(0, 150)}..."
                      </p>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Action Toolbar for AI message */}
        {!isUser && (
          <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy answer</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5"
                  onClick={() => onPin?.(message)}
                  disabled={pinning}
                >
                  {pinning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Pin to Notes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 rounded-lg transition-colors ${
                    message.feedback === "up"
                      ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                      : "text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                  }`}
                  onClick={() => onFeedback?.(message, "up")}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Helpful</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 rounded-lg transition-colors ${
                    message.feedback === "down"
                      ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                      : "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  }`}
                  onClick={() => onFeedback?.(message, "down")}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Not helpful</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5"
                  onClick={() => onAskExpert?.(message)}
                >
                  <UserCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Talk to Human Expert</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatBubble;
