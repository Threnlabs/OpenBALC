import React, { useState, useRef, useEffect, useMemo } from "react";
import { useApp } from "benchrex/context/BenchrexContext";
import type { Topic, TopicSection, AIPersonality, Attachment } from "benchrex/types";
import { Button } from "benchrex/components/ui/button";
import { Badge } from "benchrex/components/ui/badge";
import { Send, Settings2, X, ChevronRight, Hash, AtSign, Paperclip, FileText, Image as ImageIcon, Music, Trash2, Sparkles, Command, BookOpen } from "lucide-react";
import { Textarea } from "benchrex/components/ui/textarea";
import { Collapsible, CollapsibleContent } from "benchrex/components/ui/collapsible";
import { KnowledgeService } from "../../lib/knowledge-service";
import type { KnowledgeNode } from "../../lib/knowledge-service";
import { Switch } from "benchrex/components/ui/switch";
import { Label } from "benchrex/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "benchrex/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (question: string, tags: string[], topicMentions: string[], systemInstructions: string, attachments?: Attachment[], knowledgeTags?: string[], useKnowledgeRetrieval?: boolean) => void;
  disabled: boolean;
  topics: Topic[];
  selectedPersonalityId: string;
  onPersonalityChange: (id: string) => void;
}

type PickerLevel = "subject" | "chapter" | "section" | "files";
type TriggerChar = "@" | "/" | "@/" | null;

const ChatInput = ({ onSend, disabled, topics, selectedPersonalityId, onPersonalityChange }: ChatInputProps) => {
  const { personalities } = useApp();
  const [text, setText] = useState("");
  const [topicMentions, setTopicMentions] = useState<string[]>([]);
  const [systemInstructions, setSystemInstructions] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [knowledgeTags, setKnowledgeTags] = useState<string[]>([]);
  const [useKnowledgeRetrieval, setUseKnowledgeRetrieval] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [trigger, setTrigger] = useState<TriggerChar>(null);
  const [triggerPos, setTriggerPos] = useState<number>(-1);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<PickerLevel>("subject");
  const [pickedSubject, setPickedSubject] = useState<string | null>(null);
  const [pickedChapter, setPickedChapter] = useState<Topic | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const subjects = useMemo(() => {
    const map = new Map<string, Topic[]>();
    topics.forEach((t) => {
      if (!map.has(t.subject)) map.set(t.subject, []);
      map.get(t.subject)!.push(t);
    });
    return Array.from(map.entries()).map(([subject, items]) => ({
      subject,
      chapters: items,
    }));
  }, [topics]);

  const closePicker = () => {
    setTrigger(null);
    setTriggerPos(-1);
    setQuery("");
    setLevel("subject");
    setPickedSubject(null);
    setPickedChapter(null);
  };

  const handleTextChange = (value: string, caret: number) => {
    setText(value);
    const before = value.slice(0, caret);
    const atSlashIdx = before.lastIndexOf("@/");
    const atIdx = before.lastIndexOf("@");
    const slashIdx = before.lastIndexOf("/");
    
    let idx = -1;
    let t: TriggerChar = null;

    if (atSlashIdx !== -1 && (atSlashIdx >= atIdx || atIdx === -1) && (atSlashIdx >= slashIdx || slashIdx === -1)) {
      idx = atSlashIdx;
      t = "@/";
    } else {
      idx = Math.max(atIdx, slashIdx);
      if (idx !== -1) {
        t = (before[idx] as TriggerChar)!;
      }
    }

    if (idx === -1) {
      closePicker();
      return;
    }
    const prevChar = idx === 0 ? " " : before[idx - 1];
    if (!/\s/.test(prevChar) && idx !== 0) {
      closePicker();
      return;
    }
    const afterTrigger = before.slice(idx + (t === "@/" ? 2 : 1));
    if (afterTrigger.includes(" ")) {
      closePicker();
      return;
    }
    setTrigger(null);
    setTriggerPos(idx);
    setQuery(afterTrigger);
    
    // Feature disabled - showing toast on send instead
    /*
    if (t === "@/") {
      setLevel("files");
    } else {
      setLevel("subject");
    }
    */
  };

  const insertChipAtTrigger = (label: string) => {
    if (triggerPos < 0) return;
    const before = text.slice(0, triggerPos);
    const caret = inputRef.current?.selectionStart ?? text.length;
    const after = text.slice(caret);
    const newText = (before + after).replace(/\s+$/, "") + " ";
    setText(newText);
    if (!topicMentions.includes(label)) {
      setTopicMentions((prev) => [...prev, label]);
    }
    closePicker();
    setTimeout(() => {
      inputRef.current?.focus();
      const pos = (before + " ").length;
      inputRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const onPickSubject = (subject: string) => {
    setPickedSubject(subject);
    setLevel("chapter");
    setQuery("");
  };
  const onPickChapter = (chapter: Topic) => {
    setPickedChapter(chapter);
    if (chapter.sections && chapter.sections.length > 0) {
      setLevel("section");
      setQuery("");
    } else {
      insertChipAtTrigger(`${chapter.subject} › ${chapter.chapter}`);
    }
  };
  const onPickSection = (section: TopicSection) => {
    if (!pickedChapter) return;
    insertChipAtTrigger(
      `${pickedChapter.subject} › ${pickedChapter.chapter} › ${section.name}`
    );
  };

  const handleSubmit = () => {
    if (!text.trim() && topicMentions.length === 0 && attachments.length === 0) return;
    
    // Check for mapping triggers (@ or /) to show maintenance message
    if (/(^|\s)[@/]/.test(text)) {
      toast.info("Course and files mapping feature is currently under maintenance", {
        description: "We are working on bringing this feature to you soon!",
        duration: 4000,
      });
    }

    const personality = personalities.find(p => p.id === selectedPersonalityId);
    const tags = personality ? [personality.name] : [];
    const personalityInstructions = personality ? personality.systemInstructions : "";
    
    onSend(text.trim(), tags, topicMentions, systemInstructions || personalityInstructions, attachments, knowledgeTags, useKnowledgeRetrieval);
    setText("");
    setTopicMentions([]);
    setKnowledgeTags([]);
    setAttachments([]);
    setShowSettings(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const type = file.type.startsWith("image/") 
        ? "image" 
        : file.type === "application/pdf" 
        ? "pdf" 
        : file.type.startsWith("audio/") 
        ? "audio" 
        : "other";
      
      const newAttachment: Attachment = {
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        type,
        size: file.size,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      const removed = prev.find((a) => a.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return filtered;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && trigger) {
      e.preventDefault();
      closePicker();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !trigger) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const lowerQ = query.toLowerCase();
  const filteredSubjects = subjects.filter((s) =>
    s.subject.toLowerCase().includes(lowerQ)
  );
  const chaptersForSubject =
    pickedSubject && subjects.find((s) => s.subject === pickedSubject)?.chapters || [];
  const filteredChapters = chaptersForSubject.filter((c) =>
    c.chapter.toLowerCase().includes(lowerQ)
  );
  const sectionsForChapter = pickedChapter?.sections || [];
  const filteredSections = sectionsForChapter.filter((s) =>
    s.name.toLowerCase().includes(lowerQ)
  );

  return (
    <div className="relative z-20">
      <div className="mx-auto max-w-4xl space-y-3">
        {/* Attachment Previews Floating */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-2 px-1"
            >
              {attachments.map((a) => (
                <div key={a.id} className="relative group rounded-xl border border-border bg-card/80 backdrop-blur-md p-2 flex items-center gap-2 max-w-[180px] shadow-sm animate-in zoom-in-95">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    a.type === 'image' ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-primary/10 text-primary'
                  }`}>
                    {a.type === "image" ? (
                      <img src={a.url} alt={a.name} className="h-full w-full rounded-lg object-cover" />
                    ) : a.type === "pdf" ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold truncate leading-tight">{a.name}</p>
                    <p className="text-[8px] text-muted-foreground uppercase">{a.type}</p>
                  </div>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-background border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive shadow-sm"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mentions Bar */}
        <AnimatePresence>
          {topicMentions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-wrap items-center gap-1.5 px-1"
            >
              {topicMentions.map((m) => (
                <Badge 
                  key={m} 
                  variant="secondary"
                  className="rounded-lg bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 py-1 px-2.5 transition-all hover:bg-primary/20"
                >
                  <AtSign className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{m}</span>
                  <button onClick={() => setTopicMentions((p) => p.filter((x) => x !== m))}>
                    <X className="h-3 w-3 hover:text-destructive transition-colors" />
                  </button>
                </Badge>
              ))}
            </motion.div>
          )}

          {knowledgeTags.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-wrap items-center gap-1.5 px-1"
            >
              {knowledgeTags.map((m) => (
                <Badge 
                  key={m} 
                  variant="secondary"
                  className="rounded-lg bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex items-center gap-1.5 py-1 px-2.5 transition-all hover:bg-emerald-500/20"
                >
                  <FileText className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{m}</span>
                  <button onClick={() => setKnowledgeTags((p) => p.filter((x) => x !== m))}>
                    <X className="h-3 w-3 hover:text-destructive transition-colors" />
                  </button>
                </Badge>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Bar */}
        <div className="relative bg-card/40 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] p-2 shadow-xl shadow-black/5 ring-1 ring-white/10">
          <div className="flex items-end gap-2 px-2">
            {/* Persona Selector */}
            <Select value={selectedPersonalityId} onValueChange={onPersonalityChange}>
              <SelectTrigger 
                className="h-10 w-[44px] sm:w-[160px] border-none bg-transparent hover:bg-accent/50 rounded-2xl px-0 sm:px-3 focus:ring-0 disabled:opacity-50"
                disabled={personalities.length === 0}
              >
                <div className="flex items-center gap-2">
                  {personalities.length > 0 ? (
                    <>
                      <span className="text-lg">{personalities.find(p => p.id === selectedPersonalityId)?.icon}</span>
                      <span className="hidden sm:inline-block text-xs font-bold truncate">
                        {personalities.find(p => p.id === selectedPersonalityId)?.name}
                      </span>
                    </>
                  ) : (
                    <span className="hidden sm:inline-block text-[10px] font-bold text-muted-foreground uppercase">No personas</span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 shadow-2xl backdrop-blur-xl">
                {personalities.length > 0 ? (
                  personalities.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="rounded-xl m-1">
                      <div className="flex items-center gap-3 py-1">
                        <span className="text-xl">{p.icon}</span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">{p.name}</span>
                          {p.description && <span className="text-[10px] text-muted-foreground">{p.description}</span>}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No personas available
                  </div>
                )}
              </SelectContent>
            </Select>

            <div className="w-px h-6 bg-border/50 mb-2 mx-1" />

            {/* Input Wrapper */}
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={disabled}
                rows={1}
                className="w-full resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 font-medium"
                style={{ maxHeight: "150px", overflowY: "auto" }}
              />

              {/* Hierarchical Picker Floating - Disabled for Maintenance */}
              {/* <AnimatePresence>
                {trigger && (
                  ... (picker content)
                )}
              </AnimatePresence> */}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*,application/pdf,audio/*" />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-full transition-colors ${showSettings ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100"
                onClick={handleSubmit}
                disabled={disabled || (!text.trim() && topicMentions.length === 0 && attachments.length === 0)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* System Instructions Bar */}
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 border-t border-border/30 mt-1">
                  <div className="relative mb-3">
                    <div className="absolute left-3 top-3"><Sparkles className="h-3 w-3 text-primary" /></div>
                    <textarea
                      placeholder="Add system instructions for this specific doubt..."
                      value={systemInstructions}
                      onChange={(e) => setSystemInstructions(e.target.value)}
                      className="w-full min-h-[80px] resize-none bg-muted/30 rounded-2xl p-3 pl-8 text-xs outline-none border border-border/20 focus:border-primary/30 transition-colors font-medium"
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Command className="h-2.5 w-2.5" /> + Enter to send
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/20">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-emerald-500" />
                      <div className="flex flex-col">
                        <Label htmlFor="knowledge-retrieval" className="text-xs font-bold">Knowledge Retrieval</Label>
                        <p className="text-[9px] text-muted-foreground">Enable AI to search curriculum bank for tagged items</p>
                      </div>
                    </div>
                    <Switch 
                      id="knowledge-retrieval" 
                      checked={useKnowledgeRetrieval} 
                      onCheckedChange={setUseKnowledgeRetrieval}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-[10px] text-center text-muted-foreground/60 font-medium">
          Benchrex can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
