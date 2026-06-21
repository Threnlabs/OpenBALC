import { useState } from "react";
import { useParams, useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/Skeleton";
import {
  useGetModule, useGetModuleSources, useGetModuleContent, useAddModuleSource,
  getGetModuleSourcesQueryKey, getGetModuleContentQueryKey
} from "@workspace/api-client-react";
import { getModuleColor, cn, timeAgo } from "@/lib/utils";
import {
  BookOpen, Globe, Lock, Star, MessageSquare, Plus, FileText, Link2,
  Type, ChevronRight, Loader2, ArrowLeft
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

function AddSourceModal({ moduleId, open, onClose }: { moduleId: number; open: boolean; onClose: () => void }) {
  const [type, setType] = useState<"pdf" | "url" | "text">("url");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const qc = useQueryClient();
  const addSource = useAddModuleSource();

  function handleAdd() {
    addSource.mutate({ id: moduleId, data: { type, name, url: url || undefined, content: content || undefined } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetModuleSourcesQueryKey(moduleId) });
        toast.success("Source added");
        onClose(); setName(""); setUrl(""); setContent("");
      }
    });
  }

  const TYPES = [
    { value: "url", label: "URL", icon: Link2 },
    { value: "pdf", label: "PDF", icon: FileText },
    { value: "text", label: "Text", icon: Type },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Source</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value as any)}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all",
                  type === t.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                )}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <div>
            <Label>Source Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chapter 1 Notes" className="mt-1.5" />
          </div>
          {type === "url" && (
            <div>
              <Label>URL</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="mt-1.5" />
            </div>
          )}
          {type === "text" && (
            <div>
              <Label>Content</Label>
              <textarea
                value={content} onChange={e => setContent(e.target.value)}
                placeholder="Paste your text content here..."
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[150px] resize-none focus:outline-none focus:border-primary"
              />
            </div>
          )}
          {type === "pdf" && (
            <div>
              <Label>PDF URL</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://...pdf" className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Upload support coming soon — use URL for now</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name.trim() || addSource.isPending}>
            {addSource.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Add Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ModuleDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string);
  const [, setLocation] = useLocation();
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);

  const { data: module, isLoading: moduleLoading } = useGetModule(id ?? 0);
  const { data: sources, isLoading: sourcesLoading } = useGetModuleSources(id ?? 0);
  const { data: content, isLoading: contentLoading } = useGetModuleContent(id ?? 0);

  const color = module ? getModuleColor(module.id) : "from-indigo-500 to-violet-600";

  const chapters = content ? [...new Set(content.map(c => c.chapter))] : [];

  const selectedContent = selectedChapter
    ? content?.filter(c => c.chapter === selectedChapter)
    : content?.slice(0, 1);

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <button
          onClick={() => setLocation("/app/modules")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Modules
        </button>

        {/* Header */}
        <div className={cn("rounded-xl bg-gradient-to-br p-6 mb-6 relative overflow-hidden", color)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{module.title}</h1>
                {module.description && (
                  <p className="text-white/80 mt-1 text-sm">{module.description}</p>
                )}
                {module.subject && (
                  <Badge className="mt-2 bg-white/20 text-white border-0">{module.subject}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn("border-0", module.visibility === "public" ? "bg-emerald-500/80 text-white" : "bg-black/30 text-white")}>
                  {module.visibility === "public" ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                  {module.visibility}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-white/70 text-sm">
              <span>{module.chapterCount ?? 0} chapters</span>
              <span>{module.sourceCount ?? 0} sources</span>
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{module.starCount ?? 0}</span>
              {module.creditsValue > 0 && <span>{module.creditsValue} credits</span>}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                className="bg-white text-black hover:bg-white/90 border-0"
                onClick={() => setLocation("/app/chat")}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Chat with Module
              </Button>
            </div>
          </div>
        </div>

        {/* 3-panel layout */}
        <div className="grid grid-cols-[220px_1fr_240px] gap-4">
          {/* Left: Content index */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chapters</h3>
            {contentLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !chapters.length ? (
              <p className="text-xs text-muted-foreground">No content yet</p>
            ) : (
              <div className="space-y-1">
                {chapters.map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChapter(ch)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2",
                      selectedChapter === ch ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="truncate">{ch}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: Content viewer */}
          <div className="rounded-xl border border-border bg-card p-6 min-h-[400px]">
            {contentLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : !content?.length ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No content generated yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add sources to generate content</p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {selectedContent?.map((c: any) => (
                  <div key={c.id} className="mb-6">
                    <h3 className="text-base font-semibold">{c.topic}</h3>
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{c.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Actions & Sources */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sources</h3>
                <button
                  onClick={() => setAddSourceOpen(true)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {sourcesLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !sources?.length ? (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">No sources</p>
                  <Button size="sm" variant="ghost" className="mt-2 text-xs h-7" onClick={() => setAddSourceOpen(true)}>
                    Add source
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map(s => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        {s.type === "url" ? <Link2 className="h-3 w-3 text-primary" />
                          : s.type === "pdf" ? <FileText className="h-3 w-3 text-primary" />
                          : <Type className="h-3 w-3 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className={cn("text-[10px]", s.processed ? "text-emerald-400" : "text-amber-400")}>
                          {s.processed ? "Processed" : "Processing..."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="capitalize text-[10px]">{module.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uses</span>
                  <span>{module.useCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{timeAgo(module.createdAt ?? "")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddSourceModal moduleId={id} open={addSourceOpen} onClose={() => setAddSourceOpen(false)} />
    </AppLayout>
  );
}
