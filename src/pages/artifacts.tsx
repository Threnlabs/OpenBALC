import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useListArtifacts, useDeleteArtifact, useListModules, useListConversations,
  getListArtifactsQueryKey
} from "@/lib/api-client-react";
import { cn, timeAgo } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import InteractiveMindMap from "@/components/InteractiveMindMap";
import ArtifactQuizPlayer from "@/components/ArtifactQuizPlayer";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";
import {
  BrainCircuit, Layers, GraduationCap, FileText, Code, Search, Trash2,
  Calendar, ArrowUpRight, MessageSquare, BookOpen, Download, Copy, Sparkles, Clock, ChevronRight
} from "lucide-react";

function InlineFlashcardPlayer({ flashcards }: { flashcards: any[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => { setIndex(0); setFlipped(false); }, [flashcards]);

  if (!flashcards || flashcards.length === 0) return null;
  return (
    <div className="flex flex-col items-center py-4 w-full">
      <div
        onClick={() => setFlipped(!flipped)}
        className={cn(
          "w-full max-w-[420px] h-[220px] rounded-2xl border flex items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 shadow-md relative select-none",
          flipped
            ? "border-primary bg-primary/5 text-primary scale-[1.01]"
            : "border-border bg-card text-foreground hover:border-primary/30"
        )}
      >
        <div className="absolute top-3 left-4 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
          {flipped ? "Answer" : "Question"}
        </div>
        <span className="text-sm font-bold leading-relaxed px-4">
          {flipped ? flashcards[index].back : flashcards[index].front}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-2 font-medium">Click to flip card</p>
      <div className="flex items-center justify-between w-full max-w-[420px] mt-4">
        <Button variant="ghost" size="sm" disabled={index === 0}
          onClick={(e) => { e.stopPropagation(); setIndex(p => p - 1); setFlipped(false); }}
          className="text-xs h-8 px-3">Prev</Button>
        <span className="text-xs font-semibold text-muted-foreground">Card {index + 1} / {flashcards.length}</span>
        <Button variant="ghost" size="sm" disabled={index === flashcards.length - 1}
          onClick={(e) => { e.stopPropagation(); setIndex(p => p + 1); setFlipped(false); }}
          className="text-xs h-8 px-3">Next</Button>
      </div>
    </div>
  );
}

export default function ArtifactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | number | null>(null);

  const { data: dbArtifacts, isLoading } = useListArtifacts();
  const { data: modules } = useListModules();
  const { data: conversations } = useListConversations();
  const deleteArtifact = useDeleteArtifact();

  const artifacts = Array.isArray(dbArtifacts) ? dbArtifacts : [];
  const moduleList = Array.isArray(modules) ? modules : [];
  const conversationList = Array.isArray(conversations) ? conversations : [];

  // Fallback items if database is empty
  const fallbackArtifacts = [
    {
      id: "demo-mindmap",
      title: "Machine Learning Concepts Map",
      type: "diagram",
      content: `Machine Learning\n├── Supervised Learning\n│   ├── Regression\n│   │   ├── Linear Regression\n│   │   └── Polynomial Regression\n│   └── Classification\n│       ├── Support Vector Machines\n│       └── Logistic Regression\n├── Unsupervised Learning\n│   ├── Clustering\n│   │   ├── K-Means\n│   │   └── Hierarchical Clustering\n│   └── Dimensionality Reduction\n│       ├── PCA (Principal Component)\n│       └── t-SNE\n└── Reinforcement Learning\n    ├── Q-Learning\n    └── Policy Gradients`,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      moduleId: null,
      conversationId: null
    },
    {
      id: "demo-flashcards",
      title: "Deep Learning Flashcards",
      type: "document",
      content: JSON.stringify([
        { front: "Neural Network", back: "A series of algorithms that endeavors to recognize underlying relationships in a set of data through a process that mimics the way the human brain operates." },
        { front: "Backpropagation", back: "An algorithm used in artificial neural networks to calculate a gradient that is needed in the calculation of the weights to be used in the network." },
        { front: "Activation Function", back: "A mathematical formula that determines the output of a neural network node given an input or set of inputs (e.g., ReLU, Sigmoid, Softmax)." },
        { front: "Epoch", back: "One complete pass of the entire training dataset through the neural network." },
        { front: "Gradient Descent", back: "An optimization algorithm used to minimize some function by iteratively moving in the direction of steepest descent as defined by the negative of the gradient." }
      ]),
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      moduleId: null,
      conversationId: null
    },
    {
      id: "demo-quiz",
      title: "Neural Networks Practice Quiz",
      type: "test",
      content: JSON.stringify([
        {
          id: 1,
          question: "Which activation function outputs values in the range [0, 1]?",
          options: {
            A: "ReLU",
            B: "Sigmoid",
            C: "Tanh",
            D: "Leaky ReLU"
          },
          answer: "B",
          explanation: "The sigmoid function maps any real-valued number into a value between 0 and 1, representing a probability."
        },
        {
          id: 2,
          question: "What does the 'learning rate' in gradient descent control?",
          options: {
            A: "The number of epochs to train",
            B: "The step size taken towards the minimum",
            C: "The activation function threshold",
            D: "The network layer count"
          },
          answer: "B",
          explanation: "The learning rate is a tuning parameter in an optimization algorithm that determines the step size at each iteration while moving toward a minimum of a loss function."
        }
      ]),
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      moduleId: null,
      conversationId: null
    },
    {
      id: "demo-markdown",
      title: "Loss Functions Cheatsheet",
      type: "markdown",
      content: `# Loss Functions in Deep Learning\n\nLoss functions measure how well a machine learning model predicts the target output.\n\n### Mean Squared Error (MSE)\nUsed for regression tasks. Penalizes larger errors more heavily.\n\n$$MSE = \\frac{1}{n} \\sum_{i=1}^n (y_i - \\hat{y}_i)^2$$\n\n### Binary Cross-Entropy Loss\nUsed for binary classification tasks (output is probability in [0,1]).\n\n$$L = -\\frac{1}{n} \\sum_{i=1}^n [y_i \\log(\\hat{y}_i) + (1 - y_i) \\log(1 - \\hat{y}_i)]$$\n\n### Categorical Cross-Entropy Loss\nUsed for multi-class classification problems.`,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      moduleId: null,
      conversationId: null
    },
    {
      id: "demo-code",
      title: "PyTorch MLP Classifier",
      type: "code",
      content: `import torch\nimport torch.nn as nn\n\nclass MLP(nn.Module):\n    def __init__(self, input_dim, hidden_dim, output_dim):\n        super(MLP, self).__init__()\n        self.layers = nn.Sequential(\n            nn.Linear(input_dim, hidden_dim),\n            nn.ReLU(),\n            nn.Linear(hidden_dim, output_dim)\n        )\n        \n    def forward(self, x):\n        return self.layers(x)\n\n# Instantiate the model\nmodel = MLP(input_dim=10, hidden_dim=32, output_dim=2)\nprint(model)`,
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      moduleId: null,
      conversationId: null
    }
  ];

  const allArtifacts = artifacts.length > 0 ? artifacts : fallbackArtifacts;

  const filtered = allArtifacts.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(search.toLowerCase()) || 
                          art.content.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === "all" || art.type === selectedType;
    return matchesSearch && matchesType;
  });

  const selectedArtifact = filtered.find(a => String(a.id) === String(selectedArtifactId)) || filtered[0];

  const isMobile = useIsMobile();

  // Auto select first artifact on load or filter change (only on desktop to allow clean list/detail toggle on mobile)
  useEffect(() => {
    if (filtered.length > 0) {
      if (!isMobile && (!selectedArtifactId || !filtered.some(a => String(a.id) === String(selectedArtifactId)))) {
        setSelectedArtifactId(filtered[0].id);
      }
    } else {
      setSelectedArtifactId(null);
    }
  }, [filtered, selectedArtifactId, isMobile]);

  function getArtifactIcon(type: string) {
    switch (type) {
      case "diagram": return <BrainCircuit className="h-4 w-4" />;
      case "document": return <Layers className="h-4 w-4" />;
      case "test": return <GraduationCap className="h-4 w-4" />;
      case "markdown": return <FileText className="h-4 w-4" />;
      case "code": return <Code className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  }

  function handleCopyToClipboard() {
    if (!selectedArtifact) return;
    let text = selectedArtifact.content;
    if (selectedArtifact.type === "document") {
      try {
        const cards = JSON.parse(selectedArtifact.content);
        text = cards.map((c: any) => `Q: ${c.front}\nA: ${c.back}`).join("\n\n");
      } catch (_) {}
    } else if (selectedArtifact.type === "test") {
      try {
        const questions = JSON.parse(selectedArtifact.content);
        text = questions.map((q: any) => `Question: ${q.question}\nOptions: ${Object.entries(q.options).map(([k, v]) => `${k}) ${v}`).join(", ")}\nAnswer: ${q.answer}`).join("\n\n");
      } catch (_) {}
    }
    navigator.clipboard.writeText(text);
    toast.success("Content copied to clipboard!");
  }

  function handleDelete(id: string | number) {
    if (typeof id === "string" && id.startsWith("demo-")) {
      toast.error("Demo artifacts cannot be deleted.");
      return;
    }
    if (!confirm("Are you sure you want to delete this artifact?")) return;
    deleteArtifact.mutate({ id: Number(id) }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListArtifactsQueryKey() });
        toast.success("Artifact deleted successfully.");
      },
      onError: () => toast.error("Failed to delete artifact.")
    });
  }

  // Find parent details
  const getParentModule = (moduleId: any) => {
    if (!moduleId) return null;
    return moduleList.find((m: any) => Number(m.id) === Number(moduleId));
  };

  const getParentConversation = (convId: any) => {
    if (!convId) return null;
    return conversationList.find((c: any) => Number(c.id) === Number(convId));
  };

  const parentModule = selectedArtifact ? getParentModule(selectedArtifact.moduleId) : null;
  const parentConv = selectedArtifact ? getParentConversation(selectedArtifact.conversationId) : null;

  return (
    <AppLayout>
      <div className="flex flex-col h-full space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              My Study Artifacts
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Access and interact with AI-generated mindmaps, quizzes, flashcards, and study guides.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            {[
              { id: "all", label: "All Types" },
              { id: "diagram", label: "Mindmaps" },
              { id: "document", label: "Flashcards" },
              { id: "test", label: "Quizzes" },
              { id: "markdown", label: "Cheatsheets" },
              { id: "code", label: "Code" }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                  selectedType === type.id
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search artifacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Main Content Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 relative items-stretch">
          {/* Left Column: Artifacts list */}
          {(!isMobile || !selectedArtifactId) && (
            <div className="lg:col-span-5 flex flex-col min-h-[300px] lg:min-h-0 border border-border bg-muted/10 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-border bg-card/60 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  Artifacts list ({filtered.length})
                </span>
              </div>
              
              {isLoading ? (
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-card/20">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-semibold text-muted-foreground">No artifacts found</p>
                  <p className="text-[10px] text-muted-foreground/60 max-w-[200px] mt-0.5">
                    Try adjusting your search query or filter settings.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-border/60 bg-card/20">
                  {filtered.map(art => {
                    const isActive = String(selectedArtifact?.id) === String(art.id);
                    const isDemo = String(art.id).startsWith("demo-");
                    return (
                      <div
                        key={art.id}
                        onClick={() => setSelectedArtifactId(art.id)}
                        className={cn(
                          "p-4 cursor-pointer transition-all flex items-start justify-between gap-3 group relative select-none",
                          isActive
                            ? "bg-primary/5 border-l-2 border-primary"
                            : "hover:bg-muted/40 border-l-2 border-transparent"
                        )}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "p-1.5 rounded-lg border",
                              isActive 
                                ? "bg-primary/10 text-primary border-primary/20" 
                                : "bg-muted/80 text-muted-foreground border-border"
                            )}>
                              {getArtifactIcon(art.type)}
                            </span>
                            <h3 className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                              {art.title}
                            </h3>
                          </div>

                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                            {isDemo && (
                              <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-0 h-4 px-1 text-[8px] font-bold">Demo</Badge>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(art.createdAt)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform shrink-0 self-center",
                          isActive ? "translate-x-1 text-primary" : "group-hover:translate-x-1"
                        )} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Right Column: Interactive previewer */}
          {(!isMobile || selectedArtifactId) && (
            <div className="lg:col-span-7 flex flex-col min-h-[400px] lg:min-h-0 border border-border bg-card rounded-xl overflow-hidden">
              {selectedArtifact && (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Preview Toolbar */}
                  <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="space-y-0.5 flex items-center gap-2">
                      {isMobile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedArtifactId(null)}
                          className="h-8 px-2 text-xs font-semibold border border-border mr-1"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                      )}
                      <h2 className="font-bold text-sm text-foreground flex items-center gap-1.5 truncate">
                        {getArtifactIcon(selectedArtifact.type)}
                        {selectedArtifact.title}
                      </h2>
                    
                    {/* Origin display */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground font-medium">
                      {parentModule && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3 text-primary" />
                          Module: <span className="font-semibold text-foreground">{parentModule.title}</span>
                        </span>
                      )}
                      {parentConv && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-violet-500" />
                          Chat: <span className="font-semibold text-foreground">{parentConv.title}</span>
                        </span>
                      )}
                      {!parentModule && !parentConv && (
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Global Workspace Library
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToClipboard}
                      className="h-7 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Content
                    </Button>
                    
                    {!String(selectedArtifact.id).startsWith("demo-") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(selectedArtifact.id)}
                        className="h-7 text-[10px] font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive border-border/80 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {/* Interactive Player Screen */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0 flex flex-col justify-start">
                  {selectedArtifact.type === "diagram" && (
                    <div className="h-[420px] w-full border border-border/40 rounded-2xl overflow-hidden bg-background/30 shadow-inner">
                      <InteractiveMindMap
                        content={selectedArtifact.content}
                        title={selectedArtifact.title}
                      />
                    </div>
                  )}

                  {selectedArtifact.type === "document" && (() => {
                    try {
                      const flashcards = JSON.parse(selectedArtifact.content);
                      if (Array.isArray(flashcards)) {
                        return <InlineFlashcardPlayer flashcards={flashcards} />;
                      }
                    } catch (_) {}
                    return (
                      <div className="w-full max-w-2xl mx-auto border border-border/40 rounded-2xl p-6 bg-background/25">
                        <MarkdownRenderer
                          content={selectedArtifact.content}
                          className="text-xs text-muted-foreground leading-relaxed"
                        />
                      </div>
                    );
                  })()}

                  {selectedArtifact.type === "test" && (() => {
                    try {
                      const questions = JSON.parse(selectedArtifact.content);
                      if (Array.isArray(questions)) {
                        return (
                          <div className="border border-border/40 rounded-2xl p-5 bg-background/30 shadow-inner w-full max-w-xl mx-auto">
                            <ArtifactQuizPlayer
                              questions={questions}
                              artifactId={selectedArtifact.id}
                            />
                          </div>
                        );
                      }
                    } catch (_) {}
                    return <p className="text-xs text-muted-foreground italic">Invalid quiz structure</p>;
                  })()}

                  {selectedArtifact.type === "markdown" && (
                    <div className="w-full max-w-2xl mx-auto border border-border/40 rounded-2xl p-6 bg-background/25">
                      <MarkdownRenderer
                        content={selectedArtifact.content}
                        className="text-xs text-muted-foreground leading-relaxed"
                      />
                    </div>
                  )}

                  {selectedArtifact.type === "code" && (
                    <div className="w-full max-w-3xl mx-auto bg-slate-950 text-slate-200 p-5 rounded-2xl font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed border border-border/40 shadow-inner">
                      {selectedArtifact.content}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
