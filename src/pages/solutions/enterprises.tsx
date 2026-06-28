import { Link } from "wouter";
import { useEffect } from "react";
import { ArrowRight, BookOpen, Building2, Bot, ArrowLeft, ShieldCheck, Check } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function EnterprisesSolution() {
  const { isDark } = useTheme();

  useEffect(() => {
    document.title = "OpenBALC for Enterprises - Self-Hosted Hybrid RAG & Knowledge Bases";
    window.scrollTo(0, 0);
  }, []);

  const enterpriseFeatures = [
    {
      title: "Self-Hosted & Isolated",
      desc: "Maintain physical custody of your intellectual property. Run OpenBALC securely on your own virtual private cloud (AWS, GCP, Azure) or local server."
    },
    {
      title: "Hybrid RAG Pipeline",
      desc: "Accurate information retrieval. Combines neural vector embeddings with lexical keyword matching to deliver hallucination-free answers with file citations."
    },
    {
      title: "Granular Access Controls",
      desc: "Establish clear data boundaries. Setup role-based access permissions so teams only query documents matching their classification tier."
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
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15 gap-1 text-xs">
              <Building2 className="h-3.5 w-3.5" /> For Teams & Enterprises
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Secure, Self-Hosted Knowledge Hubs powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500">RAG</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn wikis, compliance manuals, API guides, and corporate policies into unified interactive search engines with 100% data sovereignty.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md">
                Request Enterprise Demo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Core Problem & OpenBALC Solution */}
        <section className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">The Knowledge Silo Challenge</h2>
              <p className="text-muted-foreground leading-relaxed">
                Critical business information is scattered across Slack, email threads, Notion wikis, and local PDFs. Employees waste valuable hours locating procedures, and training new hires is slow.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                OpenBALC unifies these formats. Our layout-aware parser extracts tables, text structures, and images, indexing them securely. Employees get answers in real time, with instant links to the source.
              </p>
            </div>
            <div className="bg-muted/40 border border-border p-8 rounded-2xl space-y-4">
              <h3 className="font-semibold text-lg text-primary">Enterprise Security Features</h3>
              <ul className="space-y-3">
                {[
                  "Self-hostable architecture runs entirely inside your VPN.",
                  "Zero data sharing: documents are never sent to public models.",
                  "Granular permission gates control directory scanning.",
                  "Developer API endpoints integrate directly into internal portals.",
                  "Active audit logs record document access and search queries."
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
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Enterprise Infrastructure</h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Maintain full physical authority over your corporation's data assets.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {enterpriseFeatures.map((feat, idx) => (
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
              <h4 className="font-bold text-foreground text-base mb-1">Is our company documentation kept private?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Yes. Under our self-hosted deployment, your data never leaves your infrastructure. Even on our managed cloud plans, we logically segregate all corporate data and guarantee that your documents are never utilized for model fine-tuning.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-base mb-1">Can we connect OpenBALC to our internal APIs?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Yes. OpenBALC is built with developers in mind. We provide extensive REST API documentation and webhook support, enabling you to automate module ingestion from Google Drive, GitHub repositories, or company databases.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground text-base mb-1">What LLMs do you support?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                OpenBALC is model-agnostic. We support cloud providers like OpenAI, Anthropic, and Google Gemini, as well as local open-source models running via Ollama or vLLM (e.g. Llama-3, Mistral).
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
