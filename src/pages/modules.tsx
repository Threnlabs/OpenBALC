import { useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/AppLayout";
import { ModuleCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  useListModules, useListPublicModules, useCreateModule, useDeleteModule,
  usePublishModule, useStarModule,
  getListModulesQueryKey, getListPublicModulesQueryKey
} from "@workspace/api-client-react";
import { getModuleColor, cn, timeAgo } from "@/lib/utils";
import {
  BookOpen, Plus, Search, Globe, Lock, Star, MessageSquare, MoreVertical,
  Trash2, Eye, Upload, Loader2, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Tab = "mine" | "public";

function ModuleCard({ module, showStar }: { module: any; showStar?: boolean }) {
  const color = getModuleColor(module.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const deleteModule = useDeleteModule();
  const publishModule = usePublishModule();
  const starModule = useStarModule();

  function handleDelete() {
    if (!confirm("Delete this module?")) return;
    deleteModule.mutate({ id: module.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListModulesQueryKey() });
        toast.success("Module deleted");
      }
    });
  }

  function handlePublish() {
    publishModule.mutate({ id: module.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListModulesQueryKey() });
        toast.success("Module published to library");
      }
    });
  }

  function handleStar() {
    starModule.mutate({ id: module.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPublicModulesQueryKey() });
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group">
      <div className={cn("h-20 bg-gradient-to-br relative", color)}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <Badge className={cn(
            "text-[10px] px-1.5 py-0.5 border-0",
            module.visibility === "public" ? "bg-emerald-500/80 text-white" : "bg-black/30 text-white"
          )}>
            {module.visibility === "public" ? <Globe className="h-2.5 w-2.5 mr-1" /> : <Lock className="h-2.5 w-2.5 mr-1" />}
            {module.visibility}
          </Badge>
          {!showStar && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 p-1 rounded bg-black/20 hover:bg-black/40 text-white">
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/app/modules/${module.id}`}>
                    <Eye className="h-3.5 w-3.5 mr-2" /> View
                  </Link>
                </DropdownMenuItem>
                {module.visibility === "private" && (
                  <DropdownMenuItem onClick={handlePublish}>
                    <Globe className="h-3.5 w-3.5 mr-2" /> Make Public
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {module.status === "processing" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-white/60 transition-all"
              style={{ width: `${module.processingPct ?? 0}%` }}
            />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm truncate mb-0.5">{module.title}</h3>
        {module.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{module.description}</p>
        )}
        {module.subject && (
          <Badge variant="secondary" className="text-[10px] mb-2">{module.subject}</Badge>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{module.chapterCount ?? 0}</span>
          <span className="flex items-center gap-1"><Star className="h-3 w-3" />{module.starCount ?? 0}</span>
          {module.creditsValue > 0 && (
            <span className="text-amber-400 flex items-center gap-1">{module.creditsValue}</span>
          )}
        </div>
        <div className="flex gap-2">
          {showStar ? (
            <Button
              size="sm" variant={module.isStarred ? "default" : "outline"}
              className="flex-1 h-7 text-xs" onClick={handleStar}
            >
              <Star className={cn("h-3 w-3 mr-1", module.isStarred && "fill-current")} />
              {module.isStarred ? "Starred" : "Star"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" asChild>
              <Link href={`/app/modules/${module.id}`}>View</Link>
            </Button>
          )}
          <Button
            size="sm" variant="ghost" className="h-7 text-xs px-2"
            onClick={() => setLocation(`/app/chat`)}
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateModuleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<"topic" | "upload">("topic");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const qc = useQueryClient();
  const createModule = useCreateModule();

  function handleSubmit() {
    if (!title.trim()) return;
    createModule.mutate({ data: { title, description, subject, method } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListModulesQueryKey() });
        toast.success("Module created!");
        onClose();
        setTitle(""); setDescription(""); setSubject(""); setStep(1);
      },
      onError: () => toast.error("Failed to create module")
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Module</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">How would you like to create this module?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMethod("topic")}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  method === "topic" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                )}
              >
                <BookOpen className="h-5 w-5 mb-2 text-primary" />
                <p className="text-sm font-medium">By Topic</p>
                <p className="text-xs text-muted-foreground mt-0.5">AI generates content from a topic</p>
              </button>
              <button
                onClick={() => setMethod("upload")}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  method === "upload" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                )}
              >
                <Upload className="h-5 w-5 mb-2 text-primary" />
                <p className="text-sm font-medium">Upload Sources</p>
                <p className="text-xs text-muted-foreground mt-0.5">PDFs, URLs, or text</p>
              </button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="title">Module Title *</Label>
              <Input
                id="title" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Machine Learning Fundamentals"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Brief description..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject" value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Computer Science"
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSubmit} disabled={!title.trim() || createModule.isPending}>
                {createModule.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Create Module
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ModulesPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [sort, setSort] = useState<string>("newest");

  const { data: myModules, isLoading: myLoading } = useListModules({ visibility: "all" });
  const { data: publicModules, isLoading: pubLoading } = useListPublicModules({ search: search || undefined, sort: sort as any });

  const filtered = tab === "mine"
    ? (Array.isArray(myModules) ? myModules.filter(m => m.title.toLowerCase().includes(search.toLowerCase())) : [])
    : (Array.isArray(publicModules) ? publicModules : []);

  const isLoading = tab === "mine" ? myLoading : pubLoading;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Modules</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your structured knowledge units</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Create Module
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 p-1 rounded-lg bg-muted w-fit">
          {(["mine", "public"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "mine" ? "My Modules" : "Public Library"}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search modules..."
              className="pl-9"
            />
          </div>
          {tab === "public" && (
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm"
            >
              <option value="newest">Newest</option>
              <option value="most_used">Most Used</option>
              <option value="stars">Most Stars</option>
            </select>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ModuleCardSkeleton key={i} />)}
          </div>
        ) : !Array.isArray(filtered) || filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title={tab === "mine" ? "No modules yet" : "No public modules found"}
            description={tab === "mine"
              ? "Create your first module to start building your knowledge base"
              : "Be the first to publish a module to the public library"
            }
            action={tab === "mine" ? { label: "Create Module", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(m => <ModuleCard key={m.id} module={m} showStar={tab === "public"} />)}
          </div>
        )}
      </div>

      <CreateModuleModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AppLayout>
  );
}
