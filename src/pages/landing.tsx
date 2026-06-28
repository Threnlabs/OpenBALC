import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Check, Zap, Send, Bot, User, Loader2, MessageSquare, ArrowRight, BookOpen, Sparkles, Clock, Globe, Sun, Moon, Star } from "lucide-react";
import { cn, getModuleColor } from "@/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useTheme } from "@/hooks/use-theme";
import { useListPublicModules } from "@/lib/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { isDark, toggleTheme } = useTheme();
  const [chatInput, setChatInput] = useState("");
  
  const { data: publicModules, isLoading: isLoadingPub } = useListPublicModules({ sort: "most_used" });
  const publicModulesHighlight = Array.isArray(publicModules) ? publicModules.slice(0, 4) : [];
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);

  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const formatPrice = (usd: number, inr: number, isYearly: boolean = false, isSubscription: boolean = false) => {
    const multiplier = isSubscription && isYearly ? 10 : 1;
    if (currency === "USD") {
      return `$${(usd * multiplier).toFixed(2)}${isSubscription ? (isYearly ? "/yr" : "/mo") : ""}`;
    } else {
      return `₹${(inr * multiplier).toLocaleString()}${isSubscription ? (isYearly ? "/yr" : "/mo") : ""}`;
    }
  };

  const creditPacks = [
    { id: "micro", name: "Micro", credits: "100", usd: 0.75, inr: 63, desc: "~50 simple chats" },
    { id: "boost", name: "Boost", credits: "300", usd: 2.00, inr: 168, desc: "~150 chats" },
    { id: "popular", name: "Popular", credits: "700", usd: 4.00, inr: 336, desc: "~350 chats", popular: true },
    { id: "pro", name: "Pro", credits: "1,500", usd: 7.50, inr: 630, desc: "~750 chats" },
  ];

  const subscriptionPlans = [
    { 
      id: "free", name: "Freemium", usd: 0, inr: 0, 
      desc: "Basic features to get started.",
      features: ["Up to 2 Modules", "Standard AI Models", "Community Support"]
    },
    { 
      id: "pro", name: "Pro", usd: 10, inr: 840, 
      desc: "For heavy users who need more power.", isBundle: true,
      features: ["Unlimited Modules", "Advanced AI Models", "Priority Processing", "Workspace Creation"]
    },
    { 
      id: "max", name: "Max", usd: 25, inr: 2100, 
      desc: "Ultimate features and dedicated support.",
      features: ["Everything in Pro", "Early Access to Features", "Dedicated Account Manager", "Custom Integrations"]
    },
  ];

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const element = document.getElementById(window.location.hash.substring(1));
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    // Also run on mount to handle initial load with hash
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userQuery = chatInput.trim();
    setChatInput("");
    setHasStartedChat(true);
    
    const newMessages = [...messages, { role: "user" as const, content: userQuery }];
    setMessages(newMessages);
    setIsTyping(true);
    
    // Simulate AI responses
    setTimeout(() => {
      let reply = "";
      const queryLower = userQuery.toLowerCase();
      if (queryLower.includes("supervised") || queryLower.includes("machine learning")) {
        reply = "Supervised learning is a fundamental concept in machine learning where a model learns from labeled training data. The data contains both inputs and their corresponding correct outputs. Using this, the model discovers patterns to predict labels for new, unlabeled data.\n\nExamples include predicting house prices (regression) or detecting spam emails (classification).";
      } else if (queryLower.includes("openbalc") || queryLower.includes("how does it work") || queryLower.includes("what is this")) {
        reply = "OpenBALC is an AI-powered study and workspace platform. It lets you create custom study Modules by uploading files, typing topics, or submitting web URLs. The AI then organizes this knowledge into structured chapters and creates interactive quizzes to test your understanding. You can also chat directly with your modules to query specific concepts.";
      } else if (queryLower.includes("pricing") || queryLower.includes("cost") || queryLower.includes("free")) {
        reply = "OpenBALC offers a Freemium plan where you can create up to 2 study modules for free. Upgrading to our Pro plan ($10/month) gives you unlimited modules, priority processing, and access to advanced AI models. We also offer additional Credit Packs if you run out of AI actions.";
      } else {
        reply = `That's an interesting question about "${userQuery}"! In a full OpenBALC session, I would scan your custom modules and study materials to provide a precise, customized answer.\n\nWith a free account, you can upload your own PDFs or links to build a personalized study workspace.`;
      }
      
      setMessages([...newMessages, { role: "assistant" as const, content: reply }]);
      setIsTyping(false);
    }, 1000);
  };

  const handleContinueChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userQuery = chatInput.trim();
    setChatInput("");
    const newMessages = [...messages, { role: "user" as const, content: userQuery }];
    setMessages(newMessages);
    setIsTyping(true);

    setTimeout(() => {
      let reply = "";
      if (newMessages.filter(m => m.role === "user").length >= 3) {
        reply = "You've reached the limit for the public demo chat. To save this conversation, build custom study modules, and chat without limits, create your free account today!";
      } else {
        reply = "Great question! OpenBALC's core feature is linking these answers directly to your uploaded textbooks, notes, and documents so you can verify the sources. Create a free account to try it out!";
      }

      setMessages([...newMessages, { role: "assistant" as const, content: reply }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-6 z-50">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img 
              src={isDark ? "/logo/light_logo.svg" : "/logo/dark_logo.svg"} 
              alt="OpenBALC Logo" 
              className="h-8 object-contain" 
            />
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="/#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
          <Link href="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/modules" className="hover:text-foreground transition-colors">Modules</Link>
          <Link href="/ads" className="hover:text-foreground transition-colors">Advertisers</Link>
        </nav>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 cursor-pointer group"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-amber-500 group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-500 group-hover:-rotate-12 transition-transform" />
            )}
          </button>
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign in</Link>
          <Link href="/login" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">

          {!hasStartedChat && (
            <div className="flex justify-center mb-6">
              <img 
                src={isDark ? "/logo/light_logo.svg" : "/logo/dark_logo.svg"} 
                alt="OpenBALC Logo" 
                className="w-48 h-24 md:w-64 md:h-32 object-contain" 
              />
            </div>
          )}

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance leading-tight">
            Structured, intelligent,<br className="hidden md:block"/> and yours.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            OpenBALC is a high-performance workspace that respects your time and rewards your curiosity. Build modules, chat with AI, and manage your knowledge ecosystem.
          </p>

          {/* Home Page Chat / Start Chatting field */}
          {!hasStartedChat ? (
            <div className="w-full max-w-2xl mx-auto pt-4">
              <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-2 shadow-xl shadow-primary/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300">
                <form onSubmit={handleStartChat} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask anything or start chatting (no login required)..."
                    className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/25 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Ask AI
                  </button>
                </form>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <button
                  onClick={() => { setChatInput("Explain machine learning"); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  "Explain machine learning"
                </button>
                <button
                  onClick={() => { setChatInput("How does OpenBALC work?"); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  "How does OpenBALC work?"
                </button>
                <Link
                  href="/login"
                  className="text-xs px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex items-center gap-1"
                >
                  <span>Or sign up to build modules</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            /* Chat Interface Console */
            <div className="w-full max-w-3xl mx-auto border border-border bg-card/50 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col text-left mt-8">
              {/* Chat Header */}
              <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anonymous Session</span>
                </div>
                <Link href="/login" className="text-xs font-semibold text-primary hover:underline">
                  Save this chat
                </Link>
              </div>

              {/* Message Stream */}
              <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto min-h-[180px]">
                {messages.map((msg, idx) => (
                  <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div className={cn("max-w-[80%] space-y-1", msg.role === "user" && "items-end flex flex-col")}>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border rounded-tl-sm text-foreground"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-card border border-border">
                      <div className="flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Chat Prompt Callout */}
              {messages.filter(m => m.role === "user").length >= 2 && (
                <div className="mx-4 mb-4 p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="text-sm font-bold text-foreground">Unlock Full Features</h4>
                    <p className="text-xs text-muted-foreground">Sign up to customize knowledge modules, generate practice tests, and preserve your chats.</p>
                  </div>
                  <Link href="/login" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm">
                    Sign Up Free
                  </Link>
                </div>
              )}

              {/* Chat Input */}
              <div className="border-t border-border p-3 bg-muted/20">
                <form onSubmit={handleContinueChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isTyping}
                    placeholder="Type a message to reply..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 text-foreground border border-border rounded-xl focus:border-primary/50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isTyping}
                    className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* Public Modules Highlights Section */}
        <section className="max-w-5xl mx-auto px-6 py-12 text-left">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                <Globe className="h-3 w-3 mr-1 animate-pulse" /> Community Library
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Explore Public Modules</h2>
              <p className="text-muted-foreground mt-2 max-w-xl">
                See what the community is building. Access high-quality, structured study resources immediately without signing in.
              </p>
            </div>
            <Button asChild variant="outline" className="group">
              <Link href="/modules" className="flex items-center gap-1.5 cursor-pointer">
                Browse Public Library
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {isLoadingPub ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="h-20 bg-muted rounded-lg animate-pulse" />
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          ) : !publicModulesHighlight?.length ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card/30">
              <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No public modules available right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {publicModulesHighlight.map((m: any) => {
                const color = getModuleColor(m.id);
                return (
                  <Link href={`/modules/${m.id}`} key={m.id}>
                    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/45 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer group flex flex-col h-full">
                      <div className={cn("h-24 bg-gradient-to-br relative shrink-0", color)}>
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute top-2 left-2">
                          <Badge className="text-[9px] px-1.5 py-0.5 border-0 bg-black/40 text-white backdrop-blur-sm">
                            {m.subject || "Study"}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors text-foreground mb-1">
                          {m.title}
                        </h3>
                        {m.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                            {m.description}
                          </p>
                        )}
                        {!m.description && <div className="flex-1" />}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/60">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {m.chapterCount ?? 0} chapters
                          </span>
                          <span className="flex items-center gap-1 font-medium text-amber-500">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {m.starCount ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-5xl mx-auto px-6 py-24 scroll-mt-16">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Everything you need to master any subject</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              OpenBALC combines AI-driven learning tools with customizable organization to supercharge your study flow.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Intelligent Modules</h3>
              <p className="text-muted-foreground text-sm">
                Upload PDFs, textbook chapters, online articles, or raw notes. OpenBALC structures them into coherent, readable study chapters instantly.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Active Recall Quizzes</h3>
              <p className="text-muted-foreground text-sm">
                Test your mastery with AI-generated practice questions and interactive tests tailored specifically to your uploaded materials.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Contextual AI Chat</h3>
              <p className="text-muted-foreground text-sm">
                Have a conversation with your documents. Ask questions, clarify tough concepts, and get instant answers with citations from your sources.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Collaborative Workspaces</h3>
              <p className="text-muted-foreground text-sm">
                Share study modules with classmates, synchronize resources, and learn together in high-performance workspaces.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Credit-Based Economy</h3>
              <p className="text-muted-foreground text-sm">
                Earn credits by contributing valuable resources to the public library, and spend them to access premium AI power and features.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Premium Experience</h3>
              <p className="text-muted-foreground text-sm">
                Designed for long study sessions. A modern, minimalist glassmorphism interface that keeps you focused and reduces eye strain.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24 border-t border-border/50 scroll-mt-16">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">From source materials to exam-ready in seconds</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our streamlined pipeline transforms unstructured PDFs and websites into highly organized study tools.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                1
              </div>
              <h3 className="text-xl font-semibold">Upload & Feed</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Drag and drop PDFs, paste web URLs, or write down raw topics. OpenBALC parses the text and gets to work.
              </p>
            </div>
            <div className="text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                2
              </div>
              <h3 className="text-xl font-semibold">Structure & Synthesize</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Our AI splits the content into bite-sized chapters, extracts key formulas, and outlines core definitions.
              </p>
            </div>
            <div className="text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
                3
              </div>
              <h3 className="text-xl font-semibold">Interact & Retain</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Chat with the AI to probe deeper, run flashcard drills, and generate practice exams to lock in your understanding.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-24 border-t border-border/50 scroll-mt-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Free forever for basic use. Buy credits when you need them, or unlock premium features for advanced capabilities.
            </p>
          </div>

          {/* Toggles */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border border-border">
              <button 
                onClick={() => setCurrency("USD")}
                className={cn("px-5 py-2 text-sm font-medium rounded-md transition-all cursor-pointer", currency === "USD" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted text-muted-foreground hover:text-foreground")}
              >
                USD ($)
              </button>
              <button 
                onClick={() => setCurrency("INR")}
                className={cn("px-5 py-2 text-sm font-medium rounded-md transition-all cursor-pointer", currency === "INR" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted text-muted-foreground hover:text-foreground")}
              >
                INR (₹)
              </button>
            </div>

            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border border-border">
              <button 
                onClick={() => setBillingCycle("monthly")}
                className={cn("px-5 py-2 text-sm font-medium rounded-md transition-all cursor-pointer", billingCycle === "monthly" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted text-muted-foreground hover:text-foreground")}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle("yearly")}
                className={cn("px-5 py-2 text-sm font-medium rounded-md transition-all cursor-pointer", billingCycle === "yearly" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted text-muted-foreground hover:text-foreground")}
              >
                Yearly <span className="text-[10px] ml-1 bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">Save 16%</span>
              </button>
            </div>
          </div>

          <div className="space-y-24">
            {/* Subscription Plans */}
            <div>
              <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-bold">Subscription Plans</h3>
                <p className="text-muted-foreground mt-2">Start for free and upgrade as your needs grow.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8 items-stretch">
                {subscriptionPlans.map(plan => (
                  <div key={plan.id} className={cn("p-8 rounded-2xl border flex flex-col relative", plan.isBundle ? "border-primary bg-primary/5 shadow-xl md:scale-105 z-10" : "border-border bg-card")}>
                    {plan.isBundle && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Most Popular</div>}
                    <div className="mb-6">
                      <h4 className={cn("text-xl font-bold mb-2", plan.isBundle && "text-primary")}>{plan.name}</h4>
                      <p className="text-sm text-muted-foreground min-h-[40px]">{plan.desc}</p>
                    </div>
                    <div className="mb-8">
                      <span className="text-4xl font-extrabold">{formatPrice(plan.usd, plan.inr, billingCycle === "yearly", true)}</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-left">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/login" className={cn("w-full text-center py-3 rounded-md font-medium transition-opacity", plan.isBundle ? "bg-primary text-primary-foreground hover:opacity-90" : (plan.id === "free" ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"))}>
                      {plan.id === "free" ? "Get Started" : "Subscribe Now"}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Packs */}
            <div>
              <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-bold">Credit Add-ons</h3>
                <p className="text-muted-foreground mt-2">Buy additional credits as needed for AI-powered actions. Valid for 12 months.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {creditPacks.map(pack => (
                  <div key={pack.id} className={cn("p-6 rounded-xl border flex flex-col", pack.popular ? "border-primary shadow-md relative" : "border-border bg-card hover:border-primary/30 transition-colors")}>
                    {pack.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold px-3 py-1 rounded-full whitespace-nowrap">Most Popular</div>}
                    <div className="mb-4 text-center pt-2">
                      <h4 className="font-bold text-lg text-muted-foreground">{pack.name}</h4>
                      <div className="text-3xl font-bold mt-2">{formatPrice(pack.usd, pack.inr)}</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 mb-6 flex flex-col items-center justify-center gap-1">
                      <Zap className="h-6 w-6 text-amber-400 mb-1" />
                      <span className="text-2xl font-bold">{pack.credits}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Credits</span>
                    </div>
                    <p className="text-sm text-center text-muted-foreground mb-6 flex-1">{pack.desc}</p>
                    <Link href="/login" className={cn("w-full text-center py-2.5 rounded-md text-sm font-medium transition-opacity", pack.popular ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
                      Buy Now
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="pt-12 border-t border-border max-w-3xl mx-auto text-left">
              <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-bold">Frequently Asked Questions</h3>
                <p className="text-muted-foreground mt-2">Have questions? We have answers.</p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">What is OpenBALC?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    OpenBALC is an intelligent, high-performance workspace that allows you to structure your knowledge into units called Modules. You can import documents, PDFs, or URLs, and use advanced AI models to study, chat, and test your knowledge.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">What are Modules?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    Modules are the core building blocks of OpenBALC. They represent a specific topic or library of study material. You can generate them by topic, upload PDFs/sources, or link URLs. OpenBALC processes these sources to create structured chapters you can read, search, and chat with.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">How do credits work?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    Credits are the currency used for AI-powered actions, such as generating content or asking questions in chat. Each action consumes a small number of credits (for example, 2 credits per chat message). You get a monthly allowance of credits with your subscription plan, and you can buy Credit Packs if you need more.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">Do unused credits expire?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    Credits included in your monthly subscription plan reset at the end of each billing cycle. However, credits purchased through our Credit Pack add-ons are valid for a full 12 months from the date of purchase.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">Can I cancel or change my plan anytime?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    Yes, you can upgrade, downgrade, or cancel your subscription plan at any time from your Billing Settings page. If you cancel, you will retain access to your premium features until the end of your current billing period.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6">
                  <AccordionTrigger className="text-base font-semibold hover:no-underline">Can I browse public modules without an account?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    Absolutely! OpenBALC features a Public Library of modules created by our community. You can browse, search, and view public modules directly from the navigation bar without signing in. To save modules, star them, or start chatting, you will need to create a free account.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
