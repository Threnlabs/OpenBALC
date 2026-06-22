import { Link } from "wouter";
import { useState } from "react";
import { Check, Zap, Send, Bot, User, Loader2, MessageSquare, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Landing() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);

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
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-white">
              OB
            </div>
            <span className="font-bold text-lg tracking-tight">OpenBALC</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="/#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/modules" className="hover:text-foreground transition-colors">Modules</Link>
          <Link href="/ads" className="hover:text-foreground transition-colors">Advertisers</Link>
        </nav>
        <div className="flex items-center gap-4">
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
              <img src="/logo.png" alt="OpenBALC Logo" className="w-32 h-32 md:w-48 md:h-48 object-contain" />
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

        {/* Features stub */}
        <div className="max-w-5xl mx-auto px-6 py-32 grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="text-xl font-bold mb-2">Modules</h3>
            <p className="text-muted-foreground">Structure your knowledge into distinct units and chat with them using AI.</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="text-xl font-bold mb-2">Credits</h3>
            <p className="text-muted-foreground">Earn credits by contributing. Spend them to unlock premium features and AI power.</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="text-xl font-bold mb-2">Workspaces</h3>
            <p className="text-muted-foreground">Collaborate with others in organizations and shared workspaces.</p>
          </div>
        </div>

      </main>
    </div>
  );
}
