import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  useGetOrg, useCreateOrg, useListOrgMembers, useInviteOrgMember,
  useGetOrgAnalytics, useListExpertQueue, useReplyExpertTicket,
  useUpdateOrg, useDeleteOrg, useUpdateOrgMember, useRemoveOrgMember,
  getGetOrgQueryKey, getListOrgMembersQueryKey, getListExpertQueueQueryKey
} from "@/lib/api-client-react";
import { getInitials, cn, timeAgo } from "@/lib/utils";
import {
  Building2, Users, BarChart2, MessageSquare, BookOpen, Settings,
  Plus, Loader2, ChevronDown, Send, Shield, Zap, Lock, Globe, Mail,
  CreditCard, Trash2, Edit3, AlertTriangle, Check, X, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
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

  // New states for editing and removing members
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [editRole, setEditRole] = useState<"viewer" | "member" | "admin">("member");
  const [editCreditCap, setEditCreditCap] = useState(500);

  const [removeOpen, setRemoveOpen] = useState(false);

  const updateMember = useUpdateOrgMember();
  const removeMember = useRemoveOrgMember();

  function handleInvite() {
    inviteMember.mutate({ data: { email, role } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListOrgMembersQueryKey() });
        toast.success("Invite sent!");
        setInviteOpen(false); setEmail("");
      }
    });
  }

  function handleEditMember(m: any) {
    setSelectedMember(m);
    setEditRole(m.role);
    setEditCreditCap(m.creditCap || 500);
    setEditOpen(true);
  }

  function handleSaveMember() {
    if (!selectedMember) return;
    updateMember.mutate({
      userId: selectedMember.userId,
      data: { role: editRole, creditCap: editCreditCap }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListOrgMembersQueryKey() });
        toast.success("Member settings updated!");
        setEditOpen(false);
      }
    });
  }

  function handleConfirmRemove(m: any) {
    setSelectedMember(m);
    setRemoveOpen(true);
  }

  function handleRemoveMember() {
    if (!selectedMember) return;
    removeMember.mutate({ userId: selectedMember.userId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListOrgMembersQueryKey() });
        toast.success("Member removed from organization.");
        setRemoveOpen(false);
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
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditMember(m)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleConfirmRemove(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5 animate-pulse" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Member Dialog */}
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

      {/* Edit Member Settings Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Member Settings</DialogTitle>
            <DialogDescription>
              Modify access role and credit limitations for {selectedMember?.displayName || selectedMember?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Role</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(["viewer", "member", "admin"] as const).map(r => (
                  <button key={r} onClick={() => setEditRole(r)}
                    className={cn("px-3 py-2 rounded-lg border text-xs font-medium capitalize transition-all",
                      editRole === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    )}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Monthly Credit Cap</Label>
              <Input
                type="number"
                value={editCreditCap}
                onChange={e => setEditCreditCap(parseInt(e.target.value) || 0)}
                placeholder="500"
                className="mt-1.5"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                The member cannot spend more than this amount of credits in a month.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMember} disabled={updateMember.isPending}>
              {updateMember.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Remove Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.displayName || selectedMember?.email} from the organization? They will lose all access to shared modules.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={removeMember.isPending}>
              {removeMember.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Remove
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

function SettingsTab({ org }: { org: any }) {
  const [name, setName] = useState(org.name || "");
  const [description, setDescription] = useState(org.description || "");
  const [logoInitials, setLogoInitials] = useState(getInitials(org.name));

  // Security
  const [allowedDomains, setAllowedDomains] = useState(org.allowedDomains || "");
  const [defaultMemberRole, setDefaultMemberRole] = useState(org.defaultMemberRole || "member");
  const [allowMemberInvites, setAllowMemberInvites] = useState(org.allowMemberInvites ?? true);
  const [restrictSharing, setRestrictSharing] = useState(org.restrictSharing ?? false);
  const [requireMfa, setRequireMfa] = useState(org.requireMfa ?? false);

  // Credit Management
  const [defaultMemberCreditCap, setDefaultMemberCreditCap] = useState(org.defaultMemberCreditCap || 500);
  const [allowCreditRequests, setAllowCreditRequests] = useState(org.allowCreditRequests ?? true);
  const [autoRefill, setAutoRefill] = useState(org.autoRefill ?? false);

  // Billing
  const [plan, setPlan] = useState<"personal" | "hosted" | "managed">(org.plan || "hosted");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [cardLast4, setCardLast4] = useState("4242");

  // Danger zone
  const [transferTarget, setTransferTarget] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const qc = useQueryClient();
  const updateOrg = useUpdateOrg();
  const deleteOrg = useDeleteOrg();
  const { data: members } = useListOrgMembers();

  function handleSaveGeneral() {
    updateOrg.mutate({ data: { name, description } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrgQueryKey() });
        setLogoInitials(getInitials(name));
        toast.success("General settings saved!");
      }
    });
  }

  function handleSaveSecurity() {
    updateOrg.mutate({
      data: {
        allowedDomains,
        defaultMemberRole,
        allowMemberInvites,
        restrictSharing,
        requireMfa
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrgQueryKey() });
        toast.success("Security & access settings saved!");
      }
    });
  }

  function handleSaveCredits() {
    updateOrg.mutate({
      data: {
        defaultMemberCreditCap,
        allowCreditRequests,
        autoRefill
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrgQueryKey() });
        toast.success("Credit management settings saved!");
      }
    });
  }

  function handlePlanChange(newPlan: "personal" | "hosted" | "managed") {
    updateOrg.mutate({ data: { plan: newPlan } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrgQueryKey() });
        setPlan(newPlan);
        toast.success(`Plan updated to ${newPlan}!`);
      }
    });
  }

  function handleTransferOwnership() {
    if (!transferTarget) return;
    const targetMember = members?.find((m: any) => String(m.userId) === transferTarget);
    toast.success(`Ownership transfer request sent to ${targetMember?.displayName || "member"}`);
    setTransferOpen(false);
  }

  function handleDeleteOrg() {
    if (deleteConfirmName !== org.name) {
      toast.error("Confirmation name does not match.");
      return;
    }
    deleteOrg.mutate(undefined, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetOrgQueryKey() });
        toast.success("Organization permanently deleted.");
        setDeleteOpen(false);
      }
    });
  }

  const otherMembers = members?.filter((m: any) => m.userId !== 1) || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. General Profile */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">General Information</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Update your organization's display identity, description, and public-facing avatar details.
        </p>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-3xl font-extrabold text-primary shadow-inner">
              {logoInitials}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-1 h-7"
              onClick={() => {
                toast.success("Logo upload simulated! Using initials based on name.");
              }}
            >
              Upload Logo
            </Button>
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div>
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme Learning Corp"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="org-desc">Description</Label>
              <textarea
                id="org-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what your organization works on..."
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveGeneral} size="sm" disabled={updateOrg.isPending}>
                {updateOrg.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Save Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Security & Invitations */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-semibold">Security & Access Policies</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Define access control layers, membership sign-in requirements, and domain registration filters.
        </p>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="allowed-domains" className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Allowed Email Domains
              </Label>
              <Input
                id="allowed-domains"
                value={allowedDomains}
                onChange={e => setAllowedDomains(e.target.value)}
                placeholder="acme.com, acme-corp.com"
                className="mt-1.5"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Comma-separated list of domains permitted to join this organization.
              </p>
            </div>

            <div>
              <Label htmlFor="default-role" className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" /> Default New Member Role
              </Label>
              <select
                id="default-role"
                value={defaultMemberRole}
                onChange={e => setDefaultMemberRole(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="viewer">Viewer (Read-only modules)</option>
                <option value="member">Member (Can create & process modules)</option>
                <option value="admin">Admin (Full settings & billing control)</option>
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Specify the permission role assigned to newly invited members by default.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Restrict to Allowed Domains
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Prevent inviting users whose email domains are not in the approved allowed list.
                </div>
              </div>
              <Switch checked={allowMemberInvites} onCheckedChange={setAllowMemberInvites} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Enforce Multi-Factor Auth (MFA)
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Require all organization members to have verified MFA setups active.
                </div>
              </div>
              <Switch checked={requireMfa} onCheckedChange={setRequireMfa} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Restrict Public Sharing
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Do not allow members to change custom module visibility from Private to Public.
                </div>
              </div>
              <Switch checked={restrictSharing} onCheckedChange={setRestrictSharing} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveSecurity} size="sm" disabled={updateOrg.isPending}>
              {updateOrg.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Save Security Policies
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Credit & Resource Caps */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-semibold">Credit & Resource Allocations</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Set monthly limit constraints on processing tasks, credit distribution limits, and automated refills.
        </p>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="credit-cap">Default Monthly Credit Limit per Member</Label>
              <Input
                id="credit-cap"
                type="number"
                value={defaultMemberCreditCap}
                onChange={e => setDefaultMemberCreditCap(parseInt(e.target.value) || 0)}
                placeholder="500"
                className="mt-1.5"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                New members cannot exceed this credit limit within a billing cycle.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">Allow Limit Increase Requests</div>
                <div className="text-[10px] text-muted-foreground">
                  Permit members to request credit limit extensions directly through their dashboards.
                </div>
              </div>
              <Switch checked={allowCreditRequests} onCheckedChange={setAllowCreditRequests} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">Automated Credit Refills</div>
                <div className="text-[10px] text-muted-foreground">
                  Automatically buy credit booster packs (+$25) when org balance falls below 500.
                </div>
              </div>
              <Switch checked={autoRefill} onCheckedChange={setAutoRefill} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveCredits} size="sm" disabled={updateOrg.isPending}>
              {updateOrg.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Save Credit Policies
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Plan & Billing */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-semibold">Plan & Billing</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Manage subscriptions, choose scaling plan tiers, and check credit cards.
        </p>

        <div className="space-y-6">
          <div>
            <Label className="text-xs text-muted-foreground">Active Organization Plan</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              {[
                { id: "personal", title: "Personal", price: "Free", desc: "For individual learners and test accounts." },
                { id: "hosted", title: "Hosted Team", price: "$49/mo", desc: "Collaborative learning workspace with 2,500 credits." },
                { id: "managed", title: "Managed Enterprise", price: "$299/mo", desc: "Strict domain locking, higher support tiers, unlimited modules." }
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => handlePlanChange(tier.id as any)}
                  className={cn(
                    "p-4 rounded-xl border text-left flex flex-col justify-between transition-all hover:bg-muted/10",
                    plan === tier.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold capitalize">{tier.title}</span>
                      {plan === tier.id && <Badge className="text-[9px] bg-primary/20 text-primary border-0">Active</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{tier.desc}</p>
                  </div>
                  <div className="text-xs font-extrabold mt-3 text-indigo-400">{tier.price}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/20 border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-6 bg-secondary/80 rounded border border-border/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                {cardBrand}
              </div>
              <div>
                <p className="text-xs font-medium">Payment Card Ending in {cardLast4}</p>
                <p className="text-[10px] text-muted-foreground">Next payment charge on July 21, 2026</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                toast.success("Card update flow simulated.");
              }}
            >
              Update Card
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Danger Zone */}
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-5 w-5 text-rose-400" />
          <h3 className="text-sm font-semibold text-rose-400">Danger Zone</h3>
        </div>
        <p className="text-xs text-rose-400/80 mb-6">
          Critical operations. These actions can cause permanent access loss, billing changes, or deletion of data.
        </p>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-rose-500/10 bg-rose-500/5">
            <div>
              <h4 className="text-xs font-semibold text-rose-300">Transfer Organization Ownership</h4>
              <p className="text-[10px] text-rose-400/70">
                Give another administrator full billing and administrative authority over this organization.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-rose-400 hover:bg-rose-500 hover:text-white border-rose-500/20"
              onClick={() => setTransferOpen(true)}
              disabled={otherMembers.length === 0}
            >
              Transfer Ownership
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-rose-900/30 bg-rose-950/20">
            <div>
              <h4 className="text-xs font-semibold text-rose-200">Delete Organization</h4>
              <p className="text-[10px] text-rose-400/70">
                Permanently delete all organization settings, data archives, modules, and remove member access.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              Delete Organization
            </Button>
          </div>
        </div>
      </div>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              Select a member to transfer organization ownership to. You will lose primary ownership status.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Label htmlFor="transfer-select">Select New Owner</Label>
            <select
              id="transfer-select"
              value={transferTarget}
              onChange={e => setTransferTarget(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">-- Choose member --</option>
              {otherMembers.map((m: any) => (
                <option key={m.userId} value={m.userId}>{m.displayName} ({m.email})</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={handleTransferOwnership} disabled={!transferTarget} className="bg-amber-600 hover:bg-amber-700 text-white">
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Org Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 animate-bounce" /> Delete Organization Permanently
            </DialogTitle>
            <DialogDescription>
              This action is irreversibly destructive. It will delete the organization "<span className="font-bold text-foreground">{org.name}</span>" and all its modules, members, and billing setup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="delete-confirm-input">
              Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-destructive">{org.name}</span> to confirm:
            </Label>
            <Input
              id="delete-confirm-input"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={org.name}
              className="mt-1 border-rose-500/40 focus-visible:ring-rose-500"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrg}
              disabled={deleteConfirmName !== org.name || deleteOrg.isPending}
            >
              {deleteOrg.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    settings: <SettingsTab org={org} />,
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
