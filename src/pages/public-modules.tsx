import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListPublicModules, useStarModule, getListPublicModulesQueryKey } from "@workspace/api-client-react";
import { getModuleColor, cn } from "@/lib/utils";
import { BookOpen, Search, Globe, Star, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ModuleCardSkeleton } from "@/components/Skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function PublicModuleCard({ module }: { module: any }) {
  const color = getModuleColor(module.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const starModule = useStarModule();

  function handleActionClick(e: React.MouseEvent, action: string) {
    e.preventDefault();
    e.stopPropagation();
    toast.info(`Please sign in to ${action} modules.`);
    setLocation("/login");
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group flex flex-col h-full">
      <div className={cn("h-20 bg-gradient-to-br relative shrink-0", color)}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute top-2 left-2 right-2">
          <Badge className="text-[10px] px-1.5 py-0.5 border-0 bg-emerald-500/80 text-white">
            <Globe className="h-2.5 w-2.5 mr-1" />
            Public
          </Badge>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm truncate mb-0.5 text-foreground">{module.title}</h3>
        {module.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{module.description}</p>
        )}
        {!module.description && <div className="flex-1" />}
        {module.subject && (
          <Badge variant="secondary" className="text-[10px] w-fit mb-2">{module.subject}</Badge>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{module.chapterCount ?? 0} chapters</span>
          <span className="flex items-center gap-1"><Star className="h-3 w-3" />{module.starCount ?? 0} stars</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" asChild>
            <Link href={`/modules/${module.id}`}>View Details</Link>
          </Button>
          <Button
            size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            onClick={(e) => handleActionClick(e, "chat with")}
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PublicModulesPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string>("newest");
  const [, setLocation] = useLocation();

  const { data: publicModules, isLoading } = useListPublicModules({ search: search || undefined, sort: sort as any });

  const modulesList = Array.isArray(publicModules) ? publicModules : [];

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

      {/* Main Content */}
      <main className="flex-1 pt-28 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          {/* Back to Home */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Explore Public Modules</h1>
            <p className="text-muted-foreground mt-1.5">
              Browse public knowledge modules created by the OpenBALC community. Sign in to customize them or start chatting.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search modules..."
                className="pl-9 h-10"
              />
            </div>
            <div className="w-full sm:w-auto flex justify-end">
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="most_used">Most Used</option>
                <option value="stars">Most Stars</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <ModuleCardSkeleton key={i} />)}
            </div>
          ) : modulesList.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-10 w-10 text-muted-foreground/40" />}
              title="No modules found"
              description="Be the first to create and publish a module on OpenBALC!"
              action={{ label: "Create Module", onClick: () => setLocation("/login") }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {modulesList.map(m => (
                <PublicModuleCard key={m.id} module={m} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
