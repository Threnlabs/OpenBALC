import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useTheme } from "@/hooks/use-theme";
import { Skeleton } from "@/components/Skeleton";
import {
  useGetMe, useUpdateMe, useGetCreditsBalance, useListCreditTransactions, useGetBufferMode, useUpdateBufferMode,
  useListNotifications, useMarkAllNotificationsRead, getGetMeQueryKey, getGetCreditsBalanceQueryKey,
  getGetBufferModeQueryKey, getListNotificationsQueryKey, getListCreditTransactionsQueryKey
} from "@workspace/api-client-react";
import { getInitials, cn, timeAgo, NOTE_COLORS } from "@/lib/utils";
import {
  User, Zap, Bell, Palette, Shield, Bot, Megaphone, CreditCard, Trash2, Loader2, ChevronRight, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Tab = "profile" | "credits" | "notifications" | "appearance" | "privacy" | "buffer" | "ads" | "billing" | "account";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile Info", icon: User },
  { id: "credits", label: "Credits", icon: Zap },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy & Security", icon: Shield },
  { id: "buffer", label: "AI Buffer", icon: Bot },
  { id: "ads", label: "Ad Preferences", icon: Megaphone },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "account", label: "Account", icon: Trash2 },
];

function ProfileTab() {
  const { data: user } = useGetMe();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const qc = useQueryClient();
  const updateMe = useUpdateMe();

  function handleSave() {
    updateMe.mutate({ data: { displayName, username, phone: phone || null } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast.success("Profile updated");
      },
      onError: () => toast.error("Failed to update profile")
    });
  }

  if (!user) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
          {getInitials(user.displayName || user.username)}
        </div>
        <div>
          <p className="font-semibold">{user.displayName || user.username}</p>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <Badge variant="secondary" className="mt-1 text-xs capitalize">{user.role}</Badge>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Display Name</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Username</Label>
          <Input value={username} onChange={e => setUsername(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={user.email} disabled className="mt-1.5 opacity-60" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" className="mt-1.5" />
        </div>
        <Button onClick={handleSave} disabled={updateMe.isPending}>
          {updateMe.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function CreditsTab() {
  const { data: balance } = useGetCreditsBalance();
  const { data: transactions, isLoading } = useListCreditTransactions();

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">Credit Balance</span>
        </div>
        <div className="text-4xl font-bold text-amber-400">{balance?.balance ?? 0}</div>
        <p className="text-xs text-muted-foreground mt-2">{balance?.usedThisMonth ?? 0} spent this month</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-4">Transaction History</h3>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !Array.isArray(transactions) || transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div>
                  <p className="text-sm font-medium">{t.reason}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</p>
                </div>
                <span className={cn("text-sm font-bold", t.type === "earn" ? "text-emerald-400" : "text-rose-400")}>
                  {t.type === "earn" ? "+" : "-"}{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
          <div>
            <p className="font-medium text-sm">Email Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Receive daily summaries and important updates.</p>
          </div>
          <div onClick={() => setEmail(!email)} className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors", email ? "bg-primary" : "bg-muted-foreground/30")}>
            <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", email ? "right-1" : "left-1")} />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
          <div>
            <p className="font-medium text-sm">Push Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get instant alerts for messages and system events.</p>
          </div>
          <div onClick={() => setPush(!push)} className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors", push ? "bg-primary" : "bg-muted-foreground/30")}>
            <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", push ? "right-1" : "left-1")} />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
          <div>
            <p className="font-medium text-sm">Marketing Emails</p>
            <p className="text-xs text-muted-foreground mt-0.5">Receive offers, promotions, and new features.</p>
          </div>
          <div onClick={() => setMarketing(!marketing)} className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors", marketing ? "bg-primary" : "bg-muted-foreground/30")}>
            <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", marketing ? "right-1" : "left-1")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BufferTab() {
  const { data: bufferMode } = useGetBufferMode();
  const { data: me } = useGetMe();
  const qc = useQueryClient();
  const updateBuffer = useUpdateBufferMode();

  const mode = bufferMode?.mode ?? me?.bufferMode ?? "quotes";

  const options = [
    { value: "quotes", label: "Inspirational Quotes", desc: "See curated quotes between AI responses" },
    { value: "ads", label: "Sponsored Content", desc: "View ads and earn credits" },
    { value: "summary", label: "AI Summary", desc: "Get a quick summary of your conversation" },
  ];

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-sm text-muted-foreground">Choose what appears between AI responses in the buffer period.</p>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => updateBuffer.mutate({ data: { mode: opt.value as any } }, {
            onSuccess: () => {
              qc.invalidateQueries({ queryKey: getGetBufferModeQueryKey() });
              toast.success("Buffer mode updated");
            }
          })}
          className={cn(
            "w-full text-left p-4 rounded-xl border-2 transition-all",
            mode === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
          )}
        >
          <p className="text-sm font-medium">{opt.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h3 className="text-sm font-semibold mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {["Light", "Dark", "System"].map(t => (
            <button
              key={t}
              onClick={() => setTheme(t.toLowerCase() as any)}
              className={cn(
                "px-4 py-3 border rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-sm",
                theme === t.toLowerCase()
                  ? "border-primary bg-primary/10 text-primary scale-[1.02]"
                  : "border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-4">Accent Color</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { id: "indigo", color: "#6366f1" },
            { id: "violet", color: "#8b5cf6" },
            { id: "emerald", color: "#10b981" },
            { id: "rose", color: "#f43f5e" },
            { id: "amber", color: "#f59e0b" },
            { id: "blue", color: "#3b82f6" }
          ].map(c => {
            const isSelected = accentColor === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setAccentColor(c.id as any)}
                className={cn(
                  "w-10 h-10 rounded-full cursor-pointer hover:scale-110 transition-all shadow-sm focus:outline-none flex items-center justify-center border-2",
                  isSelected
                    ? "border-foreground ring-2 ring-primary ring-offset-2 scale-105"
                    : "border-transparent"
                )}
                style={{ backgroundColor: c.color }}
              >
                {isSelected && <Check className="h-4.5 w-4.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PrivacyTab() {
  const [publicProfile, setPublicProfile] = useState(true);
  const [dataCollection, setDataCollection] = useState(false);

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
          <div>
            <p className="font-medium text-sm">Public Profile</p>
            <p className="text-xs text-muted-foreground mt-0.5">Allow others to see your public modules.</p>
          </div>
          <div onClick={() => setPublicProfile(!publicProfile)} className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors", publicProfile ? "bg-primary" : "bg-muted-foreground/30")}>
            <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", publicProfile ? "right-1" : "left-1")} />
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
          <div>
            <p className="font-medium text-sm">Data for AI Training</p>
            <p className="text-xs text-muted-foreground mt-0.5">Allow your public data to improve our models.</p>
          </div>
          <div onClick={() => setDataCollection(!dataCollection)} className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors", dataCollection ? "bg-primary" : "bg-muted-foreground/30")}>
            <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", dataCollection ? "right-1" : "left-1")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdsTab() {
  const [personalized, setPersonalized] = useState(true);

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
          <div>
            <p className="font-medium text-sm">Personalized Ads</p>
            <p className="text-xs text-muted-foreground mt-0.5">See ads based on your activity and interests.</p>
          </div>
          <div onClick={() => setPersonalized(!personalized)} className={cn("w-10 h-6 rounded-full relative cursor-pointer transition-colors", personalized ? "bg-primary" : "bg-muted-foreground/30")}>
            <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", personalized ? "right-1" : "left-1")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountTab() {
  return (
    <div className="space-y-6 max-w-md">
      <div className="p-5 border border-border bg-card rounded-xl space-y-4">
        <div>
          <h3 className="font-semibold text-sm">Export Data</h3>
          <p className="text-xs text-muted-foreground mt-1">Download a copy of all your modules, notes, and chat history.</p>
          <Button variant="outline" size="sm" className="mt-4">Request Data Export</Button>
        </div>
      </div>
      
      <div className="p-5 border border-rose-500/20 bg-rose-500/5 rounded-xl space-y-4">
        <div>
          <h3 className="font-semibold text-sm text-rose-500">Danger Zone</h3>
          <p className="text-xs text-muted-foreground mt-1 text-rose-500/80">Once you delete your account, there is no going back. Please be certain.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20">Deactivate Account</Button>
          <Button variant="destructive" size="sm">Delete Account</Button>
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handlePurchase = (id: string) => {
    setLoadingAction(id);
    setTimeout(() => {
      setLoadingAction(null);
      toast.success("Purchase successful! (Simulated)");
    }, 1500);
  };

  const formatPrice = (usd: number, inr: number, isYearly: boolean = false, isSubscription: boolean = false) => {
    const multiplier = isSubscription && isYearly ? 10 : 1; // 10 months for yearly (2 months free)
    if (currency === "USD") {
      return `$${(usd * multiplier).toFixed(2)}${isSubscription ? (isYearly ? "/yr" : "/mo") : ""}`;
    } else {
      return `₹${(inr * multiplier).toLocaleString()}${isSubscription ? (isYearly ? "/yr" : "/mo") : ""}`;
    }
  };

  const creditPacks = [
    { id: "micro", name: "Micro", credits: "100", usd: 0.75, inr: 63, desc: "~50 simple chats" },
    { id: "boost", name: "Boost", credits: "300", usd: 2.00, inr: 168, desc: "~150 chats" },
    { id: "popular", name: "Popular", credits: "700", usd: 4.00, inr: 336, desc: "~350 chats", popular: true },
    { id: "pro", name: "Pro", credits: "1,500", usd: 7.50, inr: 630, desc: "~750 chats" },
    { id: "power", name: "Power", credits: "3,500", usd: 15.00, inr: 1260, desc: "Bulk buffer for heavy use" },
    { id: "max", name: "Max", credits: "8,000", usd: 30.00, inr: 2520, desc: "For teams using personal mode" },
  ];

  const subscriptionPlans = [
    { 
      id: "free", name: "Freemium", usd: 0, inr: 0, 
      desc: "Basic features to get started.",
      features: ["Up to 2 Modules", "Standard AI Models", "Community Support"]
    },
    { 
      id: "pro", name: "Pro", usd: 10, inr: 840, 
      desc: "For heavy users who need more power.", isBundle: true,
      features: ["Unlimited Modules", "Advanced AI Models", "Priority Processing", "Workspace Creation"]
    },
    { 
      id: "max", name: "Max", usd: 25, inr: 2100, 
      desc: "Ultimate features and dedicated support.",
      features: ["Everything in Pro", "Early Access to Features", "Dedicated Account Manager", "Custom Integrations"]
    },
  ];

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Toggles */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/50 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2 bg-background p-1 rounded-lg border border-border">
          <button 
            onClick={() => setCurrency("USD")}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", currency === "USD" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}
          >
            USD ($)
          </button>
          <button 
            onClick={() => setCurrency("INR")}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", currency === "INR" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}
          >
            INR (₹)
          </button>
        </div>

        <div className="flex items-center gap-2 bg-background p-1 rounded-lg border border-border">
          <button 
            onClick={() => setBillingCycle("monthly")}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", billingCycle === "monthly" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle("yearly")}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-all", billingCycle === "yearly" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}
          >
            Yearly <span className="text-[10px] ml-1 bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded uppercase">Save 16%</span>
          </button>
        </div>
      </div>

      {/* Subscription Plans */}
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-bold">Subscription Plans</h3>
          <p className="text-sm text-muted-foreground mt-1">Start for free and upgrade as your needs grow.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {subscriptionPlans.map(plan => (
            <div key={plan.id} className={cn("p-6 rounded-2xl border flex flex-col relative", plan.isBundle ? "border-primary bg-primary/5 shadow-md scale-105 z-10" : "border-border bg-card")}>
              {plan.isBundle && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>}
              <div className="mb-4">
                <h4 className={cn("text-lg font-bold mb-1", plan.isBundle && "text-primary")}>{plan.name}</h4>
                <p className="text-sm text-muted-foreground min-h-[40px]">{plan.desc}</p>
              </div>
              <div className="mb-6">
                <span className="text-3xl font-extrabold">{formatPrice(plan.usd, plan.inr, billingCycle === "yearly", true)}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full mt-auto" 
                variant={plan.isBundle ? "default" : (plan.id === "free" ? "outline" : "secondary")}
                onClick={() => handlePurchase(plan.id)}
                disabled={loadingAction === plan.id || plan.id === "free"}
              >
                {loadingAction === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (plan.id === "free" ? "Current Plan" : "Subscribe Now")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Packs */}
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-bold">Credit Add-ons</h3>
          <p className="text-sm text-muted-foreground mt-1">Buy additional credits as needed for AI-powered actions. Valid for 12 months.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditPacks.map(pack => (
            <div key={pack.id} className={cn("p-5 rounded-xl border flex flex-col", pack.popular ? "border-primary shadow-sm" : "border-border bg-card hover:border-primary/30 transition-colors")}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-lg">{pack.name}</h4>
                {pack.popular && <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Most Popular</span>}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xl font-bold">{pack.credits}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{pack.desc}</p>
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                <span className="text-lg font-bold">{formatPrice(pack.usd, pack.inr)}</span>
                <Button 
                  size="sm"
                  variant={pack.popular ? "default" : "secondary"}
                  onClick={() => handlePurchase(pack.id)}
                  disabled={loadingAction === pack.id}
                >
                  {loadingAction === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buy"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("profile");

  const content: Record<Tab, React.ReactNode> = {
    profile: <ProfileTab />,
    credits: <CreditsTab />,
    notifications: <NotificationsTab />,
    appearance: <AppearanceTab />,
    privacy: <PrivacyTab />,
    buffer: <BufferTab />,
    ads: <AdsTab />,
    billing: <BillingTab />,
    account: <AccountTab />,
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden bg-background">
        {/* Left Settings Sidebar */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border flex flex-col bg-card shrink-0">
          <div className="p-4 lg:p-6 pb-2 lg:pb-5">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          </div>
          <nav className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto px-4 pb-4 space-x-2 lg:space-x-0 lg:space-y-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2.5 lg:gap-3.5 px-3.5 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl text-sm lg:text-[15px] font-medium transition-all duration-200 group whitespace-nowrap lg:w-full text-left cursor-pointer",
                    active
                      ? "bg-primary/10 text-primary font-semibold shadow-sm shadow-primary/5"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <t.icon className={cn(
                    "h-4.5 w-4.5 lg:h-5 lg:w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-background/50">
          <div className="max-w-3xl">
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mb-6 lg:mb-8 pb-3 border-b border-border hidden lg:block">
              {TABS.find(t => t.id === tab)?.label}
            </h2>
            <div key={tab} className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
              {content[tab]}
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
