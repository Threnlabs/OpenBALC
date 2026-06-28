import { Link } from "wouter";
import { useEffect } from "react";
import { ArrowRight, BookOpen, Sparkles, Globe, MessageSquare, Bot, Zap, Sun, Moon, ArrowLeft, GraduationCap, Check } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function IndividualsSolution() {
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    document.title = "OpenBALC for Individuals - Open Source AI Study Tool & Active Recall";
    window.scrollTo(0, 0);
  }, []);

  const studyTechniques = [
    {
      title: "Active Recall",
      desc: "Stop re-reading passively. OpenBALC automatically generates custom quizzes, flashcards, and short-answer prompts from your PDFs to test your memory actively."
    },
    {
      title: "Spaced Repetition",
      desc: "Retain complex ideas over long intervals. Track your chapter comprehension scores and review weak concepts at optimal times."
    },
    {
      title: "Concept Mapping",
      desc: "Build mental models. OpenBALC utilizes Reingold-Tilford tree visualization to automatically link formulas, vocabulary, and core concepts."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
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
        <Link href="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>
      </header>

      <main className="flex-grow pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 text-center space-y-6 py-12">
          <div className="flex justify-center">
            <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/15 gap-1 text-xs">
              <GraduationCap className="h-3.5 w-3.5" /> For Self-Learners & Students
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Supercharge your learning with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">OpenBALC</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The ultimate open-source study workspace. Convert textbooks, research papers, lecture recordings, and documentation into active study modules.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Core Problem & OpenBALC Solution */}
        <section className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">The Passive Reading Problem</h2>
              <p className="text-muted-foreground leading-relaxed">
                Reading passive textbooks or scrolling through online articles is a low-retention way to study. Research shows that without testing yourself (active recall) and visual conceptualization, you forget over 70% of new information within 24 hours.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                OpenBALC solves this by instantly digesting your documents and turning them into structured study nodes. Instead of passive reading, you interact directly with the material.
              </p>
            </div>
            <div className="bg-muted/40 border border-border p-8 rounded-2xl space-y-4">
              <h3 className="font-semibold text-lg text-primary">Why choose OpenBALC?</h3>
              <ul className="space-y-3">
                {[
                  "100% Open-source and customizable learning workspace.",
                  "Auto-chaptering breaks 800-page books into bite-sized units.",
                  "Source-grounded RAG answers questions with citations.",
                  "Interactive mind maps trace complex relationships automatically.",
                  "Completely free to use with our public module ecosystem."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Active Learning Science */}
        <section className="max-w-5xl mx-auto px-6 py-12 border-t border-border/50">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Study backed by Cognitive Science</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              OpenBALC aligns your workspace with established learning principles to maximize efficiency.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {studyTechniques.map((tech, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-border bg-card hover:border-primary/20 transition-all duration-300">
                <h3 className="text-lg font-bold mb-2 text-foreground">{tech.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6 py-12 border-t border-border/50">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-foreground text-base mb-1">Is OpenBALC free for students?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Yes! OpenBALC offers a generous free tier allowing you to manage up to 2 active modules. You can also earn extra credits by sharing high-quality, non-copyrighted study resources in the OpenBALC Public Library.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-base mb-1">What files can I upload to OpenBALC?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We support PDF files, plain text, web page links, and markdown files. Our hybrid parser extracts text, processes tabular structures, and reads image descriptions to feed into the learning assistant.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-base mb-1">Can I keep my modules private?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Absolutely. Any modules you upload are completely private by default. They are only shared in the Public Library if you explicitly choose to publish them.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/50 backdrop-blur py-8 px-6 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} OpenBALC. Open Source Course Management & AI Learning Platform.</p>
      </footer>
    </div>
  );
}
