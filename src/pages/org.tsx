import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  useGetOrg, useCreateOrg, useListOrgMembers, useInviteOrgMember,
  useGetOrgAnalytics, useListExpertQueue, useReplyExpertTicket,
  getGetOrgQueryKey, getListOrgMembersQueryKey, getListExpertQueueQueryKey
} from "@workspace/api-client-react";
import { getInitials, cn, timeAgo } from "@/lib/utils";
import {
  Building2, Users, BarChart2, MessageSquare, BookOpen, Settings,
  Plus, Loader2, ChevronDown, Send, Shield, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Tab = "overview" | "members" | "expert" | "analytics" | "settings";

const TABS = [
  { id: "overview" as Tab, label: "Overview", icon: Building2 },
  { id: "members" as Tab, label: "Members", icon: Users },
  { id: "expert" as Tab, label: "Expert Console", icon: MessageSquare },
  { id: "analytics" as Tab, label: "Analytics", icon: BarChart2 },
  { id: "settings" as Tab, label: "Settings", icon: Settings },
];

function CreateOrgModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] = useState<"personal" | "hosted" | "managed">("hosted");
  const qc = useQueryClient();
  const createOrg = useCreateOrg();

  function handleCreate() {
    if (!name.trim()) return;
    createOrg.mutate({ data: { name, description, plan } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrgQueryKey() });
        toast.success("Organization created!");
        onClose();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Organization Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corp" className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does your org do?" className="mt-1.5" />
          </div>
          <div>
            <Label>Plan</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(["personal", "hosted", "managed"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-all",
                    plan === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createOrg.isPending}>
            {createOrg.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverviewTab({ org }: { org: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            {getInitials(org.name)}
          </div>
          <div>
            <h2 className="text-lg font-bold">{org.name}</h2>
            {org.description && <p className="text-sm text-muted-foreground">{org.description}</p>}
            <Badge variant="secondary" className="mt-1 capitalize">{org.plan} plan</Badge>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{org.memberCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Members</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{org.credits}</p>
          <p className="text-xs text-muted-foreground mt-1">Credits</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold capitalize">{org.plan}</p>
          <p className="text-xs text-muted-foreground mt-1">Plan</p>
        </div>
      </div>
    </div>
  );
}

function MembersTab() {
  const { data: members, isLoading } = useListOrgMembers();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "member" | "admin">("member");
  const qc = useQueryClient();
  const inviteMember = useInviteOrgMember();

  function handleInvite() {
    inviteMember.mutate({ data: { email, role } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListOrgMembersQueryKey() });
        toast.success("Invite sent!");
        setInviteOpen(false); setEmail("");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Invite Member
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !Array.isArray(members) || members.length === 0 ? (
        <EmptyState icon={<Users className="h-6 w-6" />} title="No members yet" description="Invite team members to collaborate" />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Member</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Credits Used</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.userId} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "" : "bg-muted/10")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {getInitials(m.displayName ?? "?")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.displayName}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="capitalize text-xs">{m.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-amber-400">{m.creditsUsed}</span>
                    {m.creditCap && <span className="text-xs text-muted-foreground"> / {m.creditCap}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {m.lastActive ? timeAgo(m.lastActive) : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Email Address</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="user@example.com" className="mt-1.5" />
            </div>
            <div>
              <Label>Role</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(["viewer", "member", "admin"] as const).map(r => (
                  <button key={r} onClick={() => setRole(r)}
                    className={cn("px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-all",
                      role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    )}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!email || inviteMember.isPending}>
              {inviteMember.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExpertConsoleTab() {
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved">("open");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [reply, setReply] = useState("");
  const { data: queue, isLoading } = useListExpertQueue({ status: filter });
  const qc = useQueryClient();
  const replyTicket = useReplyExpertTicket();

  function handleReply(resolve: boolean) {
    if (!selectedTicket) return;
    replyTicket.mutate({ data: { ticketId: selectedTicket.id, reply, resolve } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListExpertQueueQueryKey() });
        toast.success(resolve ? "Ticket resolved" : "Reply sent");
        setReply("");
      }
    });
  }

  const PRIORITY_COLORS: Record<string, string> = {
    normal: "text-muted-foreground",
    urgent: "text-rose-400",
  };

  const STATUS_COLORS: Record<string, string> = {
    open: "bg-amber-500/10 text-amber-400",
    in_progress: "bg-blue-500/10 text-blue-400",
    resolved: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["open", "in_progress", "resolved"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : !Array.isArray(queue) || queue.length === 0 ? (
            <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No tickets" description="Expert queue is empty" />
          ) : (
            queue.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all",
                  selectedTicket?.id === ticket.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-muted-foreground/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{ticket.userName}</span>
                  <Badge className={cn("text-[10px] border-0 capitalize", STATUS_COLORS[ticket.status])}>
                    {ticket.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{ticket.context}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn("text-[10px] font-medium capitalize", PRIORITY_COLORS[ticket.priority ?? "normal"])}>
                    {ticket.priority}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(ticket.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedTicket && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div>
              <h4 className="font-semibold text-sm">{selectedTicket.userName}</h4>
              <p className="text-xs text-muted-foreground mt-1">{selectedTicket.context}</p>
            </div>
            <div>
              <Label>Reply</Label>
              <textarea
                value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Write your expert reply..."
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[120px] resize-none focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleReply(false)} disabled={!reply.trim()}>
                <Send className="h-3.5 w-3.5 mr-1.5" /> Reply
              </Button>
              <Button size="sm" onClick={() => handleReply(true)} disabled={!reply.trim()}>
                Resolve & Reply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const { data: analytics, isLoading } = useGetOrgAnalytics({ period });

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["7d", "30d", "90d"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              period === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
            {p}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : analytics ? (
        <>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-1">Questions Per Day</h3>
            <p className="text-xs text-muted-foreground mb-4">Total credits used: {analytics.totalCreditsUsed}</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics.questionsPerDay ?? []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.2)" />
                <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.2)" />
                <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Top Members</h3>
              {analytics.topMembers?.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm">{m.displayName}</span>
                  <span className="text-sm text-muted-foreground">{m.questionsAsked} questions</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Top Modules</h3>
              {analytics.topModules?.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm truncate">{m.title}</span>
                  <span className="text-sm text-muted-foreground">{m.accessCount} accesses</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function OrgPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: org, isLoading } = useGetOrg();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!org) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No organization yet"
            description="Create an organization to collaborate with your team, manage members, and access analytics."
            action={{ label: "Create Organization", onClick: () => setCreateOpen(true) }}
          />
          <CreateOrgModal open={createOpen} onClose={() => setCreateOpen(false)} />
        </div>
      </AppLayout>
    );
  }

  const content: Record<Tab, React.ReactNode> = {
    overview: <OverviewTab org={org} />,
    members: <MembersTab />,
    expert: <ExpertConsoleTab />,
    analytics: <AnalyticsTab />,
    settings: <div className="text-sm text-muted-foreground">Organization settings coming soon.</div>,
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{org.name}</h1>
            <p className="text-sm text-muted-foreground">{org.memberCount} members · {org.plan} plan</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {content[tab]}
      </div>
    </AppLayout>
  );
}
