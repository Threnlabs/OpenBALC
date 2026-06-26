import { useState } from "react";
import { Link } from "wouter";
import AppLayout from "@/components/AppLayout";
import { CardSkeleton, ModuleCardSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  useGetDashboardSummary, useGetRecentActivity, useGetTrendingModules,
  useGetCreditsBalance, useGetBufferMode, useUpdateBufferMode, useGetMe,
  useCreateConversation, getListConversationsQueryKey
} from "@/lib/api-client-react";
import { getModuleColor, timeAgo, cn } from "@/lib/utils";
import { BookOpen, MessageSquare, Zap, TrendingUp, Plus, ArrowRight, Star, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocation } from "wouter";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function ModuleCard({ module }: { module: any }) {
  const color = getModuleColor(module.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const createConv = useCreateConversation();

  function handleChat() {
    setLocation(`/app/chat?moduleId=${module.id}`);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors group">
      <div className={cn("h-16 bg-gradient-to-r relative", color)}>
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs bg-black/20 text-white border-0">
            {module.visibility}
          </Badge>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm leading-tight line-clamp-1 mb-1">{module.title}</h3>
        {module.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{module.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{module.chapterCount ?? 0} chapters</span>
          <span className="flex items-center gap-1"><Star className="h-3 w-3" />{module.starCount ?? 0}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={handleChat}>
            <MessageSquare className="h-3 w-3 mr-1" /> Chat
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" asChild>
            <Link href={`/app/modules/${module.id}`}>View</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: trending, isLoading: trendingLoading } = useGetTrendingModules();
  const { data: credits } = useGetCreditsBalance();
  const { data: bufferMode } = useGetBufferMode();
  const { data: me } = useGetMe();
  const updateBuffer = useUpdateBufferMode();
  const qc = useQueryClient();

  function setBufferMode(mode: "quotes" | "ads" | "summary") {
    updateBuffer.mutate({ data: { mode } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["getBufferMode"] });
        toast.success("Buffer mode updated");
      }
    });
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AppLayout>
      <div className="w-full px-6 lg:px-10 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">{greeting}{me?.displayName ? `, ${me.displayName.split(" ")[0]}` : me?.username ? `, ${me.username}` : ""}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening in your knowledge ecosystem.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryLoading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <StatCard icon={BookOpen} label="Modules" value={summary?.moduleCount ?? 0} color="bg-indigo-500/15 text-indigo-400" />
              <StatCard icon={MessageSquare} label="Conversations" value={summary?.conversationCount ?? 0} color="bg-violet-500/15 text-violet-400" />
              <StatCard icon={Zap} label="Credits" value={credits?.balance ?? summary?.credits ?? 0} sub={`${credits?.usedThisMonth ?? 0} used this month`} color="bg-amber-500/15 text-amber-400" />
              <StatCard icon={Activity} label="This Week" value={summary?.weeklyQuestions ?? 0} sub="questions asked" color="bg-emerald-500/15 text-emerald-400" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Recent modules */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            <div className="bg-muted/40 border border-border rounded-xl p-8 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold">Recent Modules</h2>
                <Button variant="ghost" size="sm" className="h-8 text-sm" asChild>
                  <Link href="/app/modules">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </div>
              {summaryLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <ModuleCardSkeleton key={i} />)}
                </div>
              ) : !Array.isArray(summary?.recentModules) || summary.recentModules.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <EmptyState
                    icon={<BookOpen className="h-8 w-8" />}
                    title="No modules yet"
                    description="Create your first knowledge module to get started"
                    action={{ label: "Create Module", onClick: () => {} }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {summary.recentModules.map((m: any) => <ModuleCard key={m.id} module={m} />)}
                </div>
              )}
            </div>

            {/* Recent conversations */}
            <div className="bg-muted/40 border border-border rounded-xl p-8 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold">Recent Conversations</h2>
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <Link href="/app/chat">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
              {summaryLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : !Array.isArray(summary?.recentConversations) || summary.recentConversations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <EmptyState
                    icon={<MessageSquare className="h-8 w-8" />}
                    title="No conversations yet"
                    description="Start a chat with your modules"
                    action={{ label: "Start Chat", onClick: () => {} }}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {summary.recentConversations.map((c: any) => (
                    <Link key={c.id} href={`/app/chat/${c.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.title}</p>
                          {c.lastMessage && <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(c.updatedAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Trending modules */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Trending</span>
              </div>
              {trendingLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
              ) : !Array.isArray(trending) || trending.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No trending modules</p>
              ) : (
                <div className="space-y-3">
                  {trending.slice(0, 5).map((m: any) => (
                    <Link key={m.id} href={`/app/modules/${m.id}`}>
                      <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                        <div className={cn("w-1 h-8 rounded-full bg-gradient-to-b", getModuleColor(m.id))} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.useCount} uses · {m.starCount} stars</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
              {activityLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
              ) : !Array.isArray(activity) || activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activity.slice(0, 6).map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs">{a.description}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
