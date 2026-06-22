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
  Trash2, Eye, Upload, Loader2, Filter, X, Info
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

function ModuleCard({ module, showStar, onPublishClick }: { module: any; showStar?: boolean; onPublishClick?: (id: number) => void }) {
  const color = getModuleColor(module.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const deleteModule = useDeleteModule();
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
                  <DropdownMenuItem onClick={() => onPublishClick?.(module.id)}>
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
        <div className="flex flex-wrap gap-1 mb-2">
          {module.subject && (
            <Badge variant="secondary" className="text-[10px]">{module.subject}</Badge>
          )}
          {module.fields?.map((f: string) => (
            <Badge key={f} variant="outline" className="text-[9px] px-1.5 py-0 capitalize bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400">{f}</Badge>
          ))}
          {module.domains?.map((d: string) => (
            <Badge key={d} variant="outline" className="text-[9px] px-1.5 py-0 capitalize bg-primary/5 border-primary/10 text-primary">{d}</Badge>
          ))}
          {module.tags?.map((t: string) => (
            <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0 bg-muted/60 text-muted-foreground">{t}</Badge>
          ))}
        </div>
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
            onClick={() => setLocation(`/app/chat?moduleId=${module.id}`)}
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

function PublishModuleModal({ moduleId, onClose }: { moduleId: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const publishModule = usePublishModule();

  // Selected states
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Input states for custom additions
  const [newFieldInput, setNewFieldInput] = useState("");
  const [newDomainInput, setNewDomainInput] = useState("");
  const [newTagInput, setNewTagInput] = useState("");

  // Default option lists
  const [fieldOptions, setFieldOptions] = useState(["engineering", "commerce", "arts", "music"]);
  const [domainOptions, setDomainOptions] = useState(["cyber", "software", "chemical", "mechanical", "ca", "cfa"]);

  const toggleField = (field: string) => {
    setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev => prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]);
  };

  const handleAddField = () => {
    const trimmed = newFieldInput.trim().toLowerCase();
    if (trimmed && !fieldOptions.includes(trimmed)) {
      setFieldOptions(prev => [...prev, trimmed]);
      setSelectedFields(prev => [...prev, trimmed]);
      setNewFieldInput("");
    }
  };

  const handleAddDomain = () => {
    const trimmed = newDomainInput.trim().toLowerCase();
    if (trimmed && !domainOptions.includes(trimmed)) {
      setDomainOptions(prev => [...prev, trimmed]);
      setSelectedDomains(prev => [...prev, trimmed]);
      setNewDomainInput("");
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setNewTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handlePublish = () => {
    if (!moduleId) return;
    publishModule.mutate({
      id: moduleId,
      data: {
        fields: selectedFields,
        domains: selectedDomains,
        tags
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListModulesQueryKey() });
        toast.success("Module published to library successfully!");
        onClose();
      },
      onError: () => {
        toast.error("Failed to publish module");
      }
    });
  };

  return (
    <Dialog open={moduleId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px] p-6 bg-card border border-border rounded-2xl shadow-xl space-y-4">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Publish Module Settings
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Classify your module to make it discoverable in the Public Library.
          </p>
        </DialogHeader>

        <div className="space-y-4 text-xs font-semibold">
          {/* Section 1: Choose Fields */}
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase tracking-wider text-[10px] block">1. Select Fields</label>
            <div className="flex flex-wrap gap-1.5">
              {fieldOptions.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleField(f)}
                  className={cn(
                    "px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize transition-colors",
                    selectedFields.includes(f)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <Input
                placeholder="Custom field..."
                value={newFieldInput}
                onChange={e => setNewFieldInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddField();
                  }
                }}
                className="h-7 text-[11px]"
              />
              <Button size="sm" type="button" variant="outline" onClick={handleAddField} className="h-7 text-[11px] px-2.5">
                Add
              </Button>
            </div>
          </div>

          {/* Section 2: Choose Domains */}
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase tracking-wider text-[10px] block">2. Select Domains</label>
            <div className="flex flex-wrap gap-1.5">
              {domainOptions.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDomain(d)}
                  className={cn(
                    "px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize transition-colors",
                    selectedDomains.includes(d)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <Input
                placeholder="Custom domain..."
                value={newDomainInput}
                onChange={e => setNewDomainInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
                className="h-7 text-[11px]"
              />
              <Button size="sm" type="button" variant="outline" onClick={handleAddDomain} className="h-7 text-[11px] px-2.5">
                Add
              </Button>
            </div>
          </div>

          {/* Section 3: Add Tags */}
          <div className="space-y-2">
            <label className="text-muted-foreground uppercase tracking-wider text-[10px] block">3. Add Tags</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map(t => (
                  <Badge key={t} variant="secondary" className="text-[10px] px-2 py-0.5 flex items-center gap-1">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                placeholder="Add tag (press Enter)..."
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="h-7 text-[11px]"
              />
              <Button size="sm" type="button" variant="outline" onClick={handleAddTag} className="h-7 text-[11px] px-2.5">
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3 mt-4 flex gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} className="text-xs h-8">
            Cancel
          </Button>
          <Button onClick={handlePublish} size="sm" className="text-xs h-8" disabled={publishModule.isPending}>
            {publishModule.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Publish Module
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ModulesPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [publishingModuleId, setPublishingModuleId] = useState<number | null>(null);
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
            {filtered.map(m => (
              <ModuleCard 
                key={m.id} 
                module={m} 
                showStar={tab === "public"} 
                onPublishClick={(id) => setPublishingModuleId(id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateModuleModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <PublishModuleModal moduleId={publishingModuleId} onClose={() => setPublishingModuleId(null)} />
    </AppLayout>
  );
}
