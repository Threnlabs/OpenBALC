import { Link } from "wouter";
import { useEffect } from "react";
import { ArrowRight, BookOpen, Sparkles, Users, Bot, User, ArrowLeft, ShieldCheck, Check } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function EducatorsSolution() {
  const { isDark } = useTheme();

  useEffect(() => {
    document.title = "OpenBALC for Educators - Syllabus-Locked AI Tutors & Class Workspaces";
    window.scrollTo(0, 0);
  }, []);

  const educatorFeatures = [
    {
      title: "Syllabus-Locked AI",
      desc: "Prevent AI hallucinations. Restrict the workspace learning assistant to reference strictly your approved textbooks, articles, and class slides."
    },
    {
      title: "Classroom Workspaces",
      desc: "Organize materials by class, course, or semester. Distribute pre-structured learning modules directly to your students' dashboard."
    },
    {
      title: "Auto-Quiz Generator",
      desc: "Draft custom tests, practice quizzes, and midterms mapped directly to syllabus concepts, complete with grading answer keys."
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
            <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 hover:bg-violet-500/15 gap-1 text-xs">
              <Users className="h-3.5 w-3.5" /> For Schools & Universities
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Deploy secure AI Tutors locked to your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500">Syllabus</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create high-engagement courses on OpenBALC. Give your students context-bound AI learning assistants trained directly on your approved textbooks and curricula.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md">
                Deploy to Your Class <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Core Problem & OpenBALC Solution */}
        <section className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">The AI Credibility Gap in Education</h2>
              <p className="text-muted-foreground leading-relaxed">
                Standard public AI bots often hallucinate, cite outdated external resources, and provide students with ungrounded answers. This creates confusion and undermines lesson integrity.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                OpenBALC bridges this gap. By utilizing isolated modules, your class AI only references approved course slides, PDF handouts, and textbooks. Students get precise, source-cited responses, helping them learn accurately.
              </p>
            </div>
            <div className="bg-muted/40 border border-border p-8 rounded-2xl space-y-4">
              <h3 className="font-semibold text-lg text-primary">Academic Value Proposition</h3>
              <ul className="space-y-3">
                {[
                  "Strict source-capping guarantees AI answers align with syllabus.",
                  "Auto-generate visual concept mindmaps of course contents.",
                  "Create and share reading modules instantly with students.",
                  "Monitor general student comprehension trends securely.",
                  "Compliant data privacy safeguards student records."
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

        {/* Features Grid */}
        <section className="max-w-5xl mx-auto px-6 py-12 border-t border-border/50">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Built for Classroom Success</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Empower your students with structured learning assets and context-bound AI assistance.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {educatorFeatures.map((feat, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-border bg-card hover:border-primary/20 transition-all duration-300">
                <h3 className="text-lg font-bold mb-2 text-foreground">{feat.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6 py-12 border-t border-border/50">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-foreground text-base mb-1">How do students access my course materials?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You can create a workspace for your class and send students an invite link. Once they join, your structured modules, files, and corresponding AI assistants appear on their dashboard automatically.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-base mb-1">Does OpenBALC support integration with LMS systems?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Yes. Because OpenBALC is fully open-source, developers can integrate our layout parsers and hybrid-RAG API endpoints into platforms like Canvas, Moodle, or custom school portals.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-base mb-1">Can we self-host OpenBALC?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Absolutely. Many institutions choose to self-host the database and ingestion workers on their own university servers to maintain absolute data sovereignty and fulfill strict student privacy requirements.
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
