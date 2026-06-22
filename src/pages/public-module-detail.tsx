import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Skeleton } from "@/components/Skeleton";
import { useGetModule, useGetModuleSources, useGetModuleContent } from "@workspace/api-client-react";
import { getModuleColor, cn, timeAgo } from "@/lib/utils";
import { BookOpen, Globe, Star, MessageSquare, FileText, Link2, Type, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function PublicModuleDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const [, setLocation] = useLocation();
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);

  const { data: module, isLoading: moduleLoading } = useGetModule(id ?? 0);
  const { data: sources, isLoading: sourcesLoading } = useGetModuleSources(id ?? 0);
  const { data: content, isLoading: contentLoading } = useGetModuleContent(id ?? 0);

  const color = module ? getModuleColor(module.id) : "from-indigo-500 to-violet-600";

  const chapters: any[] = content ? [...new Set(content.map((c: any) => c.chapter))] : [];

  const selectedContent = selectedChapter
    ? content?.filter((c: any) => c.chapter === selectedChapter)
    : content?.slice(0, 1);

  function handleActionClick(action: string) {
    toast.info(`Please sign in to ${action}.`);
    setLocation("/login");
  }

  if (moduleLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col pt-24">
        <div className="max-w-6xl mx-auto px-6 w-full space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="md:col-span-2 h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center">
        <p className="text-muted-foreground mb-4">Module not found</p>
        <Button variant="outline" asChild>
          <Link href="/modules">Back to public library</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Landing Header */}
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
          <Link href="/modules" className="text-foreground transition-colors font-bold">Modules</Link>
          <Link href="/ads" className="hover:text-foreground transition-colors">Advertisers</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign in</Link>
          <Link href="/login" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          {/* Back */}
          <Link href="/modules" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to public library
          </Link>

          {/* Module Banner */}
          <div className={cn("rounded-2xl bg-gradient-to-br p-8 mb-8 relative overflow-hidden shadow-lg", color)}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">{module.title}</h1>
                  {module.description && (
                    <p className="text-white/90 mt-2 text-sm max-w-2xl leading-relaxed">{module.description}</p>
                  )}
                  {module.subject && (
                    <Badge className="mt-3 bg-white/20 text-white hover:bg-white/35 border-0 font-medium">{module.subject}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="border-0 bg-emerald-500/80 text-white font-medium">
                    <Globe className="h-3 w-3 mr-1" />
                    Public Module
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-5 mt-6 text-white/80 text-xs font-medium">
                <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{module.chapterCount ?? 0} chapters</span>
                <span>{module.sourceCount ?? 0} sources</span>
                <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-white/10" />{module.starCount ?? 0} stars</span>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  size="sm"
                  className="bg-white text-black hover:bg-white/90 border-0 shadow-sm font-semibold"
                  onClick={() => handleActionClick("chat with this module")}
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" /> Chat with Module
                </Button>
              </div>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_260px] gap-6">
            {/* Chapters Index */}
            <div className="rounded-xl border border-border bg-card p-4 h-fit">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Chapters</h3>
              {contentLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : !chapters.length ? (
                <p className="text-xs text-muted-foreground p-1">No content generated</p>
              ) : (
                <div className="space-y-1">
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

            {/* Content Viewer */}
            <div className="rounded-xl border border-border bg-card p-6 min-h-[400px]">
              {contentLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : !content?.length ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No content details available</p>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {selectedContent?.map((c: any) => (
                    <div key={c.id} className="mb-6 last:mb-0">
                      <h3 className="text-lg font-bold text-foreground mb-3">{c.topic}</h3>
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{c.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Details / Sources */}
            <div className="space-y-6">
              {/* Sources */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Sources</h3>
                {sourcesLoading ? (
                  <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : !sources?.length ? (
                  <p className="text-xs text-muted-foreground p-1">No sources listed</p>
                ) : (
                  <div className="space-y-2">
                    {sources.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <div className="w-6.5 h-6.5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          {s.type === "url" ? <Link2 className="h-3.5 w-3.5 text-primary" />
                            : s.type === "pdf" ? <FileText className="h-3.5 w-3.5 text-primary" />
                            : <Type className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate text-foreground">{s.name}</p>
                          <p className="text-[9px] text-emerald-500 font-semibold">Processed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-4 h-8 text-xs font-medium"
                  onClick={() => handleActionClick("add sources to this module")}
                >
                  Add Custom Source
                </Button>
              </div>

              {/* Stats */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Module Info</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border/50">
                    <span className="text-muted-foreground">Times Used</span>
                    <span className="font-semibold">{module.useCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-border/50">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium text-muted-foreground">{timeAgo(module.createdAt ?? "")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Visibility</span>
                    <Badge variant="secondary" className="text-[10px] capitalize font-medium">{module.visibility}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
