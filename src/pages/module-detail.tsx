import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/Skeleton";
import {
  useGetModule, useGetModuleSources, useGetModuleContent, useAddModuleSource,
  getGetModuleSourcesQueryKey, getGetModuleContentQueryKey, getGetMessagesQueryKey,
  useListConversations, useCreateConversation, useGetMessages, useSendMessage,
  useListTests, useCreateTest, useSubmitTestAttempt, useListArtifacts,
  useIngestionStatus
} from "@/lib/api-client-react";
import { getModuleColor, cn, timeAgo } from "@/lib/utils";
import {
  BookOpen, Globe, Lock, Star, MessageSquare, Plus, FileText, Link2,
  Type, ChevronRight, Loader2, ArrowLeft, Send, Sparkles, Award, Check, X,
  HelpCircle, Eye, Info, BrainCircuit, RefreshCw, Layers, GraduationCap, ClipboardList,
  UploadCloud, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import InteractiveMindMap from "@/components/InteractiveMindMap";
import { ChevronLeft } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ArtifactQuizPlayer from "@/components/ArtifactQuizPlayer";

// Modal component to add sources
function AddSourceModal({
  moduleId,
  open,
  onClose,
  initialFiles,
  onClearInitialFiles
}: {
  moduleId: number;
  open: boolean;
  onClose: () => void;
  initialFiles?: FileList | null;
  onClearInitialFiles?: () => void;
}) {
  const [stagedSources, setStagedSources] = useState<any[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const qc = useQueryClient();
  const addSource = useAddModuleSource();

  // Reset states when closed/opened
  useEffect(() => {
    if (!open) {
      setStagedSources([]);
      setTextInput("");
      setIsDragging(false);
      setIsImporting(false);
    }
  }, [open]);

  const handleFiles = (fileList: FileList) => {
    const newStaged: any[] = [];
    
    Array.from(fileList).forEach((file) => {
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      
      if (fileExt === "pdf" || file.type === "application/pdf") {
        newStaged.push({
          id: Math.random().toString(36).substring(2, 9),
          type: "pdf",
          name: file.name.replace(/\.pdf$/i, ""),
          url: `local://${file.name}`,
          details: `PDF · ${sizeStr}`,
          content: "",
          file, // Keep File reference for ingestion pipeline
        });
      } else if (
        file.type.startsWith("text/") ||
        ["txt", "md", "csv", "json", "rtf"].includes(fileExt || "")
      ) {
        const tempId = Math.random().toString(36).substring(2, 9);
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const words = text.split(/\s+/).filter(Boolean).length;
          setStagedSources((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? { ...item, content: text, details: `Text · ${words} words` }
                : item
            )
          );
        };
        reader.readAsText(file);
        
        newStaged.push({
          id: tempId,
          type: "text",
          name: file.name.replace(/\.(txt|md|csv|json|rtf)$/i, ""),
          details: `Reading file...`,
          content: ""
        });
      } else {
        newStaged.push({
          id: Math.random().toString(36).substring(2, 9),
          type: "text",
          name: file.name,
          details: `File · ${sizeStr}`,
          content: ""
        });
      }
    });
    
    setStagedSources((prev) => [...prev, ...newStaged]);
  };

  // Handle preloaded files from drag & drop
  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0) {
      handleFiles(initialFiles);
      onClearInitialFiles?.();
    }
  }, [open, initialFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleTextInputAdd = () => {
    if (!textInput.trim()) return;
    const input = textInput.trim();
    
    const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i.test(input);
    
    if (isUrl) {
      const isPdfUrl = input.toLowerCase().endsWith(".pdf");
      let autoName = "Web Link";
      let domain = "";
      try {
        const urlObj = new URL(input.startsWith("http") ? input : `https://${input}`);
        domain = urlObj.hostname.replace("www.", "");
        const pathname = urlObj.pathname.split("/").filter(Boolean).pop();
        if (pathname) {
          autoName = `${pathname.replace(/[-_]/g, " ")}`;
        } else {
          autoName = domain;
        }
      } catch (_) {
        autoName = input;
      }
      
      autoName = autoName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      setStagedSources((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          type: isPdfUrl ? "pdf" : "url",
          name: autoName,
          url: input.startsWith("http") ? input : `https://${input}`,
          details: isPdfUrl ? `PDF Link · ${domain}` : `Web Page · ${domain}`,
          content: ""
        }
      ]);
    } else {
      const lines = input.split("\n").filter(Boolean);
      const firstLine = lines[0] || "";
      const autoName = firstLine.length > 30 ? firstLine.substring(0, 30) + "..." : firstLine || "Pasted Notes";
      const words = input.split(/\s+/).filter(Boolean).length;
      
      setStagedSources((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          type: "text",
          name: autoName,
          content: input,
          details: `Pasted Text · ${words} words`
        }
      ]);
    }
    
    setTextInput("");
  };

  async function handleImport() {
    if (stagedSources.length === 0) return;
    setIsImporting(true);
    try {
      for (const src of stagedSources) {
        await addSource.mutateAsync({
          id: moduleId,
          data: {
            type: src.type,
            name: src.name,
            url: src.url || undefined,
            content: src.content || undefined,
            // Pass File object so ingestion pipeline can extract PDF text
            file: src.file || undefined,
          }
        });
      }
      qc.invalidateQueries({ queryKey: getGetModuleSourcesQueryKey(moduleId) });
      toast.success(`${stagedSources.length} source${stagedSources.length !== 1 ? 's' : ''} added! Ingestion pipeline started automatically.`);
      onClose();
    } catch (err) {
      toast.error("Failed to add some study sources.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-6 bg-card border border-border rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Add Study Sources
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Ingest learning materials into your module. Drop files or paste links to start processing automatically.
          </p>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Smart Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onClick={triggerFileInput}
            className={cn(
              "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] overflow-hidden group",
              isDragging
                ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                : "border-border hover:border-primary/50 hover:bg-muted/10"
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf,.txt,.md,.rtf"
              className="hidden"
            />
            
            <div className={cn(
              "absolute -top-10 -left-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl transition-opacity",
              isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )} />
            
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
              <UploadCloud className="h-6 w-6 text-primary animate-pulse" />
            </div>
            
            <p className="text-sm font-semibold text-foreground">
              Drag & drop your files here
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
              or <span className="text-primary font-medium hover:underline">browse files</span> from your computer
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-3">
              Supports PDF, TXT, MD, Markdown (up to 20MB)
            </p>
          </div>

          {/* Inline Link/Text Paste Area */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Or add URLs / notes</Label>
            <div className="relative flex items-center">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste link (https://...) or enter plain text..."
                className="pr-20 py-5 rounded-xl border-border bg-muted/10 focus-visible:ring-primary/20 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTextInputAdd();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleTextInputAdd}
                disabled={!textInput.trim()}
                className="absolute right-1.5 h-8 px-3 rounded-lg text-xs font-semibold"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Staging Queue */}
          {stagedSources.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Ready to Import ({stagedSources.length})
                </span>
                <button
                  onClick={() => setStagedSources([])}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all
                </button>
              </div>
              
              <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {stagedSources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/80 hover:border-primary/30 transition-all group"
                  >
                    {/* Icon based on detected type */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                      src.type === "pdf" ? "bg-red-500/10 text-red-500" :
                      src.type === "url" ? "bg-emerald-500/10 text-emerald-500" :
                      "bg-violet-500/10 text-violet-500"
                    )}>
                      {src.type === "pdf" ? <FileText className="h-4 w-4" /> :
                       src.type === "url" ? <Link2 className="h-4 w-4" /> :
                       <Type className="h-4 w-4" />}
                    </div>
                    
                    {/* Editable title and details */}
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={src.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStagedSources((prev) =>
                            prev.map((item) => (item.id === src.id ? { ...item, name: val } : item))
                          );
                        }}
                        className="bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none text-xs font-bold w-full py-0 text-foreground truncate"
                        placeholder="Source name"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {src.details}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Type selector */}
                      <select
                        value={src.type}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setStagedSources((prev) =>
                            prev.map((item) => {
                              if (item.id === src.id) {
                                let details = item.details;
                                if (val === "pdf") details = `PDF · ${item.details?.split(" · ")[1] || "Manual"}`;
                                if (val === "url") details = `Link · ${item.details?.split(" · ")[1] || "Manual"}`;
                                if (val === "text") details = `Text · ${item.details?.split(" · ")[1] || "Manual"}`;
                                return { ...item, type: val, details };
                              }
                              return item;
                            })
                          );
                        }}
                        className="bg-muted text-[10px] text-muted-foreground border-none font-semibold rounded-md px-1.5 py-0.5 focus:outline-none cursor-pointer hover:bg-muted/80 h-6"
                      >
                        <option value="pdf">PDF</option>
                        <option value="url">Link</option>
                        <option value="text">Text</option>
                      </select>
                      
                      {/* Delete button */}
                      <button
                        onClick={() => setStagedSources((prev) => prev.filter((item) => item.id !== src.id))}
                        className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4 mt-2">
          <Button variant="outline" onClick={onClose} disabled={isImporting} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={stagedSources.length === 0 || isImporting}
            className="rounded-xl font-medium"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Import {stagedSources.length > 0 ? stagedSources.length : ""} Source{stagedSources.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Per-source ingestion status card ──────────────────────────────────────────

function SourceCard({ source }: { source: any }) {
  // Poll ingestion_status for this source while it is pending/processing
  const needsPoll = source.ingestionStatus === "processing" || source.ingestionStatus === "pending"
    || (!source.processed && !source.ingestionStatus);
  const { data: liveStatus } = useIngestionStatus(needsPoll ? source.id : null);

  const status: string = liveStatus ?? source.ingestionStatus ?? (source.processed ? "done" : "pending");

  const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    done: {
      label: "Embedded ✓",
      className: "text-emerald-500",
      icon: <Check className="h-3 w-3 text-emerald-500 shrink-0" />,
    },
    processing: {
      label: "Ingesting…",
      className: "text-amber-500",
      icon: <Loader2 className="h-3 w-3 text-amber-500 animate-spin shrink-0" />,
    },
    pending: {
      label: "Queued",
      className: "text-blue-400",
      icon: <Loader2 className="h-3 w-3 text-blue-400 animate-spin shrink-0" />,
    },
    failed: {
      label: "Failed",
      className: "text-red-500",
      icon: <X className="h-3 w-3 text-red-500 shrink-0" />,
    },
  };

  const cfg = statusConfig[status] ?? statusConfig.pending;

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/20 border border-border/50 hover:border-primary/20 transition-colors group">
      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
        {source.type === "url" ? <Link2 className="h-3 w-3 text-primary" />
          : source.type === "pdf" ? <FileText className="h-3 w-3 text-primary" />
          : <Type className="h-3 w-3 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate text-foreground">{source.name}</p>
        <p className={cn("text-[9px] font-semibold flex items-center gap-1", cfg.className)}>
          {cfg.icon}
          {cfg.label}
        </p>
      </div>
    </div>
  );
}

export default function ModuleDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [initialDroppedFiles, setInitialDroppedFiles] = useState<FileList | null>(null);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);

  const handleSidebarDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSidebarDragging(true);
  };

  const handleSidebarDragLeave = () => {
    setIsSidebarDragging(false);
  };

  const handleSidebarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSidebarDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setInitialDroppedFiles(e.dataTransfer.files);
      setAddSourceOpen(true);
    }
  };

  // Layout tabs state: study guide, chat workspace, tests/quizzes, custom study artifacts
  const [activeTab, setActiveTab] = useState<"study" | "chat" | "quizzes" | "artifacts">("study");
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Chat conversation state
  const [chatInput, setChatInput] = useState("");
  const [activeConvId, setActiveConvId] = useState<number | null>(null);

  // Quizzes state
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState(0);

  // Artifacts state
  const [selectedArtifactId, setSelectedArtifactId] = useState<number | string | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // API hooks
  const { data: module, isLoading: moduleLoading } = useGetModule(id ?? 0);
  const { data: sources, isLoading: sourcesLoading } = useGetModuleSources(id ?? 0);
  const { data: content, isLoading: contentLoading } = useGetModuleContent(id ?? 0);
  const { data: conversations } = useListConversations();
  const { data: tests, isLoading: testsLoading } = useListTests();
  const createConversation = useCreateConversation();
  const createTest = useCreateTest();
  const sendMessage = useSendMessage();
  const submitAttempt = useSubmitTestAttempt();
  const { data: artifactsData } = useListArtifacts();

  const { data: messages, isLoading: messagesLoading } = useGetMessages(activeConvId ?? 0, {
    enabled: !!activeConvId
  });

  const color = module ? getModuleColor(module.id) : "from-indigo-500 to-violet-600";
  const chapters: any[] = content ? [...new Set(content.map((c: any) => c.chapter))] : [];
  const selectedContent = selectedChapter
    ? content?.filter((c: any) => c.chapter === selectedChapter)
    : content?.slice(0, 1);

  const artifactsList = Array.isArray(artifactsData) ? artifactsData : [];

  const moduleConvIds = conversations
    ? conversations.filter((c: any) => c.taggedModuleIds?.includes(id)).map((c: any) => c.id)
    : [];

  const moduleArtifacts = artifactsList.filter((a: any) => 
    Number(a.moduleId) === Number(id) || moduleConvIds.includes(a.conversationId)
  );

  const fallbackArtifacts = [
    {
      id: "mock-mindmap",
      title: "Visual Concepts Mindmap",
      type: "diagram",
      content: `${module?.title || "Module"}\n` + (chapters.length > 0 ? chapters.map(ch => `├── Chapter: ${ch}\n│   ├── Topic Breakdown\n│   └── Concepts`).join("\n") : "├── Concepts\n└── Overview"),
      createdAt: new Date().toISOString()
    },
    {
      id: "mock-flashcards",
      title: "Vocabulary Flashcards",
      type: "document",
      content: JSON.stringify([
        { front: "Supervised Learning", back: "Model is trained on labeled training data containing both inputs and correct outputs." },
        { front: "Unsupervised Learning", back: "Model finds patterns and structures in unlabeled data without explicit outcomes." },
        { front: "Feature Extraction", back: "Selecting or transforming raw variables into informative predictors for ML models." },
        { front: "Overfitting", back: "When a model learns noise in training data too well, failing to generalize to new datasets." },
        { front: "Mean Squared Error (MSE)", back: "A common loss function measuring the average squared difference between true and predicted values." },
      ]),
      createdAt: new Date().toISOString()
    },
    {
      id: "mock-cheatsheet",
      title: "Quick Cheat Sheet",
      type: "markdown",
      content: `# Quick Cheat Sheet\n\nEssential equations, concepts, and summaries at a glance.\n\n### Core Objective\nStructure raw study materials into comprehensive modules, analyze contents with LLMs, and verify sources through citations.\n\n### Key Formula: MSE Loss\n\n$$MSE = \\frac{1}{n} \\sum (y_{true} - y_{pred})^2$$\n\nMeasures the quality of an estimator or model by squaring errors.`,
      createdAt: new Date().toISOString()
    }
  ];

  const displayArtifacts = moduleArtifacts.length > 0 ? moduleArtifacts : fallbackArtifacts;

  const selectedArtifact = displayArtifacts.find(a => String(a.id) === String(selectedArtifactId)) || displayArtifacts[0];

  // Set default active artifact once loaded
  useEffect(() => {
    if (displayArtifacts.length > 0 && !selectedArtifactId) {
      setSelectedArtifactId(displayArtifacts[0].id);
    }
  }, [displayArtifacts, selectedArtifactId]);

  // Automatically find or create conversation for this module when chat tab is active
  useEffect(() => {
    if (activeTab === "chat" && conversations && id && module) {
      const existing = conversations.find((c: any) => c.taggedModuleIds?.includes(id));
      if (existing) {
        setActiveConvId(existing.id);
      } else if (createConversation.isIdle && !createConversation.isPending) {
        createConversation.mutate({
          data: {
            title: `Module Chat: ${module.title}`,
            taggedModuleIds: [id]
          }
        }, {
          onSuccess: (newConv: any) => {
            setActiveConvId(newConv.id);
          }
        });
      }
    }
  }, [activeTab, conversations, id, module]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  // Module filter for tests
  const moduleTests = tests?.filter((t: any) => t.moduleId === id) || [];
  const activeTest = tests?.find((t: any) => t.id === selectedTestId);

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConvId || sendMessage.isPending) return;

    const messageText = chatInput.trim();
    setChatInput("");

    sendMessage.mutate({
      conversationId: activeConvId,
      data: {
        content: messageText,
        taggedModuleIds: [id]
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMessagesQueryKey(activeConvId) });
      }
    });
  };

  const handleGenerateQuiz = () => {
    if (!module) return;
    createTest.mutate({
      data: {
        title: `${module.title} AI Practice Quiz`,
        moduleId: id,
        difficulty: "medium"
      }
    }, {
      onSuccess: (newTest: any) => {
        qc.invalidateQueries({ queryKey: ["openbalc_tests"] });
        setSelectedTestId(newTest.id);
        setQuizAnswers({});
        setQuizScore(null);
        setCurrentQuizQuestionIndex(0);
        toast.success("AI practice quiz generated successfully!");
      }
    });
  };

  const handleSelectAnswer = (questionId: number, optionKey: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmitQuiz = () => {
    if (!activeTest) return;
    const unanswered = activeTest.questions.filter((q: any) => !quizAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    submitAttempt.mutate({
      testSetId: activeTest.id,
      data: { answers: quizAnswers }
    }, {
      onSuccess: (attempt: any) => {
        setQuizScore(attempt.score);
        qc.invalidateQueries({ queryKey: ["openbalc_tests"] });
        toast.success(`Quiz completed! You scored ${attempt.score}%`);
      }
    });
  };

  // Mock definitions for Flashcards & Mindmaps
  const mockFlashcards = [
    { front: "Supervised Learning", back: "Model is trained on labeled training data containing both inputs and correct outputs." },
    { front: "Unsupervised Learning", back: "Model finds patterns and structures in unlabeled data without explicit outcomes." },
    { front: "Feature Extraction", back: "Selecting or transforming raw variables into informative predictors for ML models." },
    { front: "Overfitting", back: "When a model learns noise in training data too well, failing to generalize to new datasets." },
    { front: "Mean Squared Error (MSE)", back: "A common loss function measuring the average squared difference between true and predicted values." },
  ];

  if (moduleLoading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="col-span-2 h-64 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!module) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Module not found</p>
          <Button variant="link" onClick={() => setLocation("/app/modules")}>Back to modules</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col min-h-[calc(100vh-5rem)]">
        {/* Back link */}
        <button
          onClick={() => setLocation("/app/modules")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Modules
        </button>

        {/* Module Header Banner */}
        <div className={cn("rounded-xl bg-gradient-to-br p-6 mb-6 relative overflow-hidden shadow-sm shrink-0", color)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{module.title}</h1>
                {module.description && (
                  <p className="text-white/80 mt-1 text-sm max-w-2xl leading-relaxed">{module.description}</p>
                )}
                {module.subject && (
                  <Badge className="mt-2 bg-white/20 text-white hover:bg-white/30 border-0">{module.subject}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn("border-0 font-medium", module.visibility === "public" ? "bg-emerald-500/80 text-white" : "bg-black/30 text-white")}>
                  {module.visibility === "public" ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                  {module.visibility}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-5 text-white/70 text-xs font-medium">
              <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{module.chapterCount ?? 0} chapters</span>
              <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{module.sourceCount ?? 0} sources</span>
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{module.starCount ?? 0} stars</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border mb-6 overflow-x-auto scrollbar-none shrink-0 gap-2">
          <button
            onClick={() => setActiveTab("study")}
            className={cn("px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5",
              activeTab === "study" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-4 w-4" />
            Study Guide
          </button>

          <button
            onClick={() => setActiveTab("quizzes")}
            className={cn("px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5",
              activeTab === "quizzes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="h-4 w-4" />
            Practice Quizzes
          </button>
          <button
            onClick={() => setActiveTab("artifacts")}
            className={cn("px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5",
              activeTab === "artifacts" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-4 w-4" />
            AI Study Artifacts
          </button>
        </div>

        {/* 3-panel layout */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 items-stretch min-h-0 relative overflow-hidden">
          
          {/* LEFT PANEL (Dynamic based on active tab) */}
          <div className={cn(
            "rounded-xl border border-border bg-card p-4 flex flex-col h-full min-h-[300px] transition-all duration-300 relative",
            leftCollapsed ? "w-0 p-0 border-0 overflow-hidden lg:min-h-0" : "w-full lg:w-[230px]"
          )}>
            {/* STUDY GUIDE Left Side */}
            {activeTab === "study" && (
              <div className="flex flex-col h-full">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Chapters</h3>
                {contentLoading ? (
                  <div className="space-y-2 flex-1">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : !chapters.length ? (
                  <p className="text-xs text-muted-foreground p-1 flex-1">No content yet</p>
                ) : (
                  <div className="space-y-1 overflow-y-auto flex-1 max-h-[400px]">
                    {chapters.map(ch => (
                      <button
                        key={ch}
                        onClick={() => setSelectedChapter(ch)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 font-medium",
                          selectedChapter === ch || (!selectedChapter && chapters[0] === ch)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ch}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}


            {/* QUIZZES Left Side */}
            {activeTab === "quizzes" && (
              <div className="flex flex-col h-full">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Quizzes Available</h3>
                {testsLoading ? (
                  <div className="space-y-2 flex-1">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : moduleTests.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-2 text-xs">
                    <ClipboardList className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground">No quizzes generated yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto flex-1">
                    {moduleTests.map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTestId(t.id);
                          setQuizAnswers({});
                          setQuizScore(null);
                          setCurrentQuizQuestionIndex(0);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-lg text-xs transition-all border flex flex-col gap-1.5",
                          selectedTestId === t.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                      >
                        <span className="font-semibold line-clamp-1">{t.title}</span>
                        <div className="flex justify-between items-center w-full text-[10px]">
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">{t.difficulty}</Badge>
                          <span>{t.questionCount} Questions</span>
                        </div>
                        {t.bestScore !== undefined && (
                          <div className="text-[9px] text-emerald-500 font-semibold mt-0.5">Best Score: {t.bestScore}%</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <Button onClick={handleGenerateQuiz} size="sm" className="w-full mt-4 text-xs font-semibold" disabled={createTest.isPending}>
                  {createTest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Generate AI Quiz
                </Button>
              </div>
            )}

            {/* STUDY ARTIFACTS Left Side */}
            {activeTab === "artifacts" && (
              <div className="flex flex-col h-full">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Study Artifacts</h3>
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[400px]">
                  {displayArtifacts.map(art => (
                    <button
                      key={art.id}
                      onClick={() => {
                        setSelectedArtifactId(art.id);
                        setFlashcardIndex(0);
                        setFlashcardFlipped(false);
                      }}
                      className={cn(
                        "w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center gap-2.5 font-medium border border-transparent",
                        String(selectedArtifact?.id) === String(art.id)
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {art.type === "diagram" ? <BrainCircuit className="h-4 w-4 shrink-0 text-primary" /> :
                       art.type === "document" ? <Layers className="h-4 w-4 shrink-0 text-primary" /> :
                       art.type === "test" ? <GraduationCap className="h-4 w-4 shrink-0 text-primary" /> :
                       <FileText className="h-4 w-4 shrink-0 text-primary" />}
                      <span className="truncate">{art.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Left Collapse Trigger Button */}
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-card border border-border hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-300 rounded-r-lg border-l-0 shadow-sm",
              leftCollapsed ? "left-0" : "left-[229px]"
            )}
            title={leftCollapsed ? "Expand index" : "Collapse index"}
          >
            {leftCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>

          {/* CENTER PANEL (Main Area) */}
          <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-full min-h-[400px] flex-1">
            
            {/* STUDY GUIDE Center Panel */}
            {activeTab === "study" && (
              <div className="p-6 overflow-y-auto h-full">
                {contentLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : !content?.length ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No content generated yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Add study sources to let the AI process and build this module.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedContent?.map((c: any) => (
                      <div key={c.id} className="mb-6 last:mb-0">
                        <h3 className="text-lg font-bold text-foreground mb-3">{c.topic}</h3>
                        <MarkdownRenderer content={c.content} className="text-sm text-muted-foreground leading-relaxed" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


            {/* QUIZZES Center Panel */}
            {activeTab === "quizzes" && (
              <div className="p-6 overflow-y-auto h-full flex flex-col justify-between">
                {!activeTest ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h3 className="text-lg font-bold text-foreground">AI practice tests</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
                      Select an existing quiz on the left panel, or generate a fresh practice test based on this module.
                    </p>
                    <Button onClick={handleGenerateQuiz} disabled={createTest.isPending}>
                      {createTest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                      Generate AI Quiz
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                        <h3 className="font-bold text-base text-foreground">{activeTest.title}</h3>
                        <Badge variant="secondary" className="capitalize">{activeTest.difficulty}</Badge>
                      </div>

                      {/* Score Result screen */}
                      {quizScore !== null ? (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col items-center text-center space-y-4">
                          <Award className="h-12 w-12 text-amber-500 animate-pulse" />
                          <div>
                            <h4 className="text-xl font-bold">Quiz Submitted!</h4>
                            <p className="text-sm text-muted-foreground mt-1">You scored a total of {quizScore}%</p>
                          </div>
                          <div className="text-3xl font-extrabold text-primary">
                            {activeTest.questions.filter((q: any) => quizAnswers[q.id] === q.answer).length} / {activeTest.questions.length} Correct
                          </div>
                          <Button size="sm" variant="outline" className="mt-4" onClick={() => { setQuizScore(null); setQuizAnswers({}); setCurrentQuizQuestionIndex(0); }}>
                            Try Again
                          </Button>
                        </div>
                      ) : (
                        /* Question display cards */
                        <div className="space-y-6">
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Question {currentQuizQuestionIndex + 1} of {activeTest.questions.length}</span>
                            <span className="font-semibold">MCQ</span>
                          </div>

                          <div className="text-sm font-semibold text-foreground bg-muted/40 p-4 rounded-xl">
                            {activeTest.questions[currentQuizQuestionIndex].question}
                          </div>

                          <div className="grid gap-2.5">
                            {Object.entries(activeTest.questions[currentQuizQuestionIndex].options || {}).map(([key, val]) => {
                              const isSelected = quizAnswers[activeTest.questions[currentQuizQuestionIndex].id] === key;
                              return (
                                <button
                                  key={key}
                                  onClick={() => handleSelectAnswer(activeTest.questions[currentQuizQuestionIndex].id, key)}
                                  className={cn(
                                    "w-full text-left px-4 py-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-3",
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                  )}
                                >
                                  <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                                    isSelected ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted/50"
                                  )}>
                                    {key}
                                  </span>
                                  <span>{val as string}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {quizScore === null && (
                      <div className="flex items-center justify-between border-t border-border pt-4 mt-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={currentQuizQuestionIndex === 0}
                          onClick={() => setCurrentQuizQuestionIndex(prev => prev - 1)}
                        >
                          Previous
                        </Button>
                        {currentQuizQuestionIndex < activeTest.questions.length - 1 ? (
                          <Button
                            size="sm"
                            disabled={!quizAnswers[activeTest.questions[currentQuizQuestionIndex].id]}
                            onClick={() => setCurrentQuizQuestionIndex(prev => prev + 1)}
                          >
                            Next
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={handleSubmitQuiz}
                            disabled={submitAttempt.isPending}
                          >
                            {submitAttempt.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                            Submit Answers
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STUDY ARTIFACTS Center Panel */}
            {activeTab === "artifacts" && (
              <div className="p-6 overflow-y-auto h-full flex flex-col justify-between">
                {selectedArtifact ? (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <h4 className="font-bold text-sm text-foreground">{selectedArtifact.title}</h4>
                        <Badge className="uppercase text-[9px] font-bold h-5 bg-primary/10 text-primary border-0">{selectedArtifact.type}</Badge>
                      </div>

                      {selectedArtifact.type === "diagram" && (
                        <div className="h-[380px] w-full mt-2">
                          <InteractiveMindMap
                            content={selectedArtifact.content}
                            title={selectedArtifact.title}
                          />
                        </div>
                      )}

                      {selectedArtifact.type === "code" && (
                        <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[10px] overflow-x-auto whitespace-pre leading-relaxed border border-border/40 shadow-inner">
                          {selectedArtifact.content}
                        </div>
                      )}

                      {selectedArtifact.type === "document" && (
                        <div className="space-y-4">
                          {(() => {
                            try {
                              const flashcards = JSON.parse(selectedArtifact.content);
                              if (Array.isArray(flashcards)) {
                                return (
                                  <div className="flex flex-col items-center py-4">
                                    <div
                                      onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                                      className={cn(
                                        "w-[320px] h-[200px] rounded-2xl border flex items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 shadow-lg relative select-none",
                                        flashcardFlipped 
                                          ? "border-primary bg-primary/5 text-primary scale-[1.02]" 
                                          : "border-border bg-card text-foreground hover:border-primary/30"
                                      )}
                                    >
                                      <div className="absolute top-2.5 left-3 text-[10px] text-muted-foreground font-semibold uppercase">
                                        {flashcardFlipped ? "Answer" : "Question"}
                                      </div>
                                      <span className="text-xs font-bold leading-relaxed text-center px-4">
                                        {flashcardFlipped ? flashcards[flashcardIndex]?.back : flashcards[flashcardIndex]?.front}
                                      </span>
                                    </div>
                                    <p className="text-center text-[10px] text-muted-foreground mt-2">Click card to flip</p>

                                    <div className="flex items-center justify-between w-full max-w-[320px] mt-6">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={flashcardIndex === 0}
                                        onClick={(e) => { e.stopPropagation(); setFlashcardIndex(prev => prev - 1); setFlashcardFlipped(false); }}
                                      >
                                        Previous
                                      </Button>
                                      <span className="text-xs font-semibold">Card {flashcardIndex + 1} of {flashcards.length}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={flashcardIndex === flashcards.length - 1}
                                        onClick={(e) => { e.stopPropagation(); setFlashcardIndex(prev => prev + 1); setFlashcardFlipped(false); }}
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
                        <div className="p-4 border border-border/40 rounded-xl bg-background/50">
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
                        </div>
                      )}

                      {selectedArtifact.type === "markdown" && (
                        <MarkdownRenderer content={selectedArtifact.content} className="text-xs text-muted-foreground leading-relaxed" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-muted-foreground font-semibold">
                    No study artifacts found.
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right Collapse Trigger Button */}
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-card border border-border hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-all duration-300 rounded-l-lg border-r-0 shadow-sm",
              rightCollapsed ? "right-0" : "right-[249px]"
            )}
            title={rightCollapsed ? "Expand details" : "Collapse details"}
          >
            {rightCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {/* RIGHT PANEL (Sources & details, persistent) */}
          <div className={cn(
            "space-y-4 shrink-0 flex flex-col h-full transition-all duration-300 relative",
            rightCollapsed ? "w-0 p-0 overflow-hidden lg:min-h-0" : "w-full lg:w-[250px] min-h-[300px]"
          )}>
            
            {/* Sources list */}
            <div
              onDragOver={handleSidebarDragOver}
              onDragLeave={handleSidebarDragLeave}
              onDrop={handleSidebarDrop}
              className={cn(
                "rounded-xl border p-4 flex flex-col h-1/2 min-h-[180px] transition-all relative overflow-hidden group",
                isSidebarDragging
                  ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(99,102,241,0.1)] scale-[1.02]"
                  : "border-border bg-card"
              )}
            >
              {isSidebarDragging && (
                <div className="absolute inset-0 bg-primary/5 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none text-center p-4 z-10">
                  <UploadCloud className="h-6 w-6 text-primary animate-bounce mb-1" />
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Drop to Add Source</p>
                </div>
              )}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module Sources</h3>
                <button
                  onClick={() => setAddSourceOpen(true)}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {sourcesLoading ? (
                <div className="space-y-2 flex-1">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !sources?.length ? (
                <div className="text-center py-4 flex-1 flex flex-col justify-center items-center">
                  <p className="text-xs text-muted-foreground">No sources added</p>
                  <Button size="sm" variant="ghost" className="mt-2 text-xs h-7 px-3" onClick={() => setAddSourceOpen(true)}>
                    Add source
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
                  {sources.map((s: any) => (
                    <SourceCard key={s.id} source={s} />
                  ))}
                </div>
              )}
            </div>

            {/* Details panel */}
            <div className="rounded-xl border border-border bg-card p-4 shrink-0">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Details</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="capitalize text-[10px] font-medium">{module.status}</Badge>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Total Accesses</span>
                  <span className="font-semibold">{module.useCount ?? 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-muted-foreground">{timeAgo(module.createdAt ?? "")}</span>
                </div>
                {module.fields && module.fields.length > 0 ? (
                  <div className="flex flex-col gap-1 pt-2.5 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Fields</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {module.fields.map((f: string) => (
                        <Badge key={f} variant="outline" className="text-[9px] px-1.5 py-0 capitalize bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 pt-2.5 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Fields</span>
                    <span className="text-xs text-muted-foreground italic font-normal">None</span>
                  </div>
                )}
                {module.domains && module.domains.length > 0 ? (
                  <div className="flex flex-col gap-1 pt-2.5 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Domains</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {module.domains.map((d: string) => (
                        <Badge key={d} variant="outline" className="text-[9px] px-1.5 py-0 capitalize bg-primary/5 border-primary/10 text-primary">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 pt-2.5 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Domains</span>
                    <span className="text-xs text-muted-foreground italic font-normal">None</span>
                  </div>
                )}
                {module.tags && module.tags.length > 0 ? (
                  <div className="flex flex-col gap-1 pt-2.5 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {module.tags.map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted/60 text-muted-foreground">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 pt-2.5 border-t border-border/50">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Tags</span>
                    <span className="text-xs text-muted-foreground italic font-normal">None</span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      <AddSourceModal
        moduleId={id}
        open={addSourceOpen}
        onClose={() => setAddSourceOpen(false)}
        initialFiles={initialDroppedFiles}
        onClearInitialFiles={() => setInitialDroppedFiles(null)}
      />
    </AppLayout>
  );
}
