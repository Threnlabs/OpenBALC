import { useState } from "react";
import { Link } from "wouter";
import {
  useListAdCampaigns, useRegisterAdBusiness, useCreateAdCampaign,
  useAdminListAdCampaigns, useApproveAdCampaign, useRejectAdCampaign,
  getListAdCampaignsQueryKey, getAdminListAdCampaignsQueryKey
} from "@workspace/api-client-react";
import { cn, timeAgo } from "@/lib/utils";
import { Megaphone, Plus, CheckCircle, XCircle, Loader2, ChevronRight, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  active: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-rose-500/10 text-rose-400",
  paused: "bg-muted text-muted-foreground",
};

function AdCardPreview({ title, description, color }: { title: string; description: string; color: string }) {
  return (
    <div className={cn("rounded-xl p-4 border border-border text-white relative overflow-hidden", color)}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative">
        <div className="flex items-center gap-1 mb-2">
          <Badge className="bg-white/20 text-white border-0 text-[10px]">Sponsored</Badge>
        </div>
        <p className="font-semibold text-sm">{title || "Your ad title"}</p>
        <p className="text-xs text-white/80 mt-1">{description || "Your ad description"}</p>
        <Button size="sm" className="mt-3 bg-white text-black hover:bg-white/90 border-0 h-7 text-xs">
          Learn More
        </Button>
      </div>
    </div>
  );
}

function RegistrationWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adColor, setAdColor] = useState("bg-gradient-to-br from-indigo-600 to-violet-700");
  const qc = useQueryClient();
  const registerBusiness = useRegisterAdBusiness();
  const createCampaign = useCreateAdCampaign();

  const AD_COLORS = [
    "bg-gradient-to-br from-indigo-600 to-violet-700",
    "bg-gradient-to-br from-blue-600 to-cyan-600",
    "bg-gradient-to-br from-emerald-600 to-teal-600",
    "bg-gradient-to-br from-amber-600 to-orange-600",
    "bg-gradient-to-br from-rose-600 to-pink-600",
  ];

  const INDUSTRIES = ["Technology", "Education", "Healthcare", "Finance", "Retail", "Entertainment", "Other"];

  function handleSubmit() {
    registerBusiness.mutate({ data: { name, email, website, industry, description } }, {
      onSuccess: () => {
        createCampaign.mutate({
          data: { title, description: adDescription, cardDesign: { color: adColor } }
        }, {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListAdCampaignsQueryKey() });
            toast.success("Campaign submitted for review!");
            onComplete();
          }
        });
      }
    });
  }

  const STEPS = ["Company", "Ad Creative", "Review"];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>{i + 1}</div>
            <span className={cn("text-sm hidden sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <div className={cn("h-px w-8", i < step ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Corp" className="mt-1.5" />
            </div>
            <div>
              <Label>Business Email *</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="ads@company.com" className="mt-1.5" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." className="mt-1.5" />
            </div>
            <div>
              <Label>Industry</Label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                className="mt-1.5 w-full h-9 px-3 rounded-md border border-border bg-background text-sm">
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does your company do?" className="mt-1.5" />
            </div>
            <Button onClick={() => setStep(1)} disabled={!name || !email} className="w-full">
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="hidden md:flex items-center justify-center bg-muted/30 rounded-xl p-8">
            <div className="text-center text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Reach thousands of engaged learners</p>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Ad Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Your compelling headline" className="mt-1.5" />
            </div>
            <div>
              <Label>Ad Description *</Label>
              <Input value={adDescription} onChange={e => setAdDescription(e.target.value)} placeholder="Short description..." className="mt-1.5" />
            </div>
            <div>
              <Label>Card Color</Label>
              <div className="flex gap-2 mt-2">
                {AD_COLORS.map(c => (
                  <button key={c} onClick={() => setAdColor(c)}
                    className={cn("w-8 h-8 rounded-lg border-2 transition-all", c, adColor === c ? "border-white" : "border-transparent")} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)} disabled={!title || !adDescription} className="flex-1">
                Preview <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-3">Live Preview</p>
            <AdCardPreview title={title} description={adDescription} color={adColor} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 max-w-lg mx-auto">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-semibold">Campaign Summary</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Company</span><span>{name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span>{industry || "—"}</span></div>
            </div>
          </div>
          <AdCardPreview title={title} description={adDescription} color={adColor} />
          <p className="text-xs text-muted-foreground text-center">
            Your campaign will be reviewed by our team within 24-48 hours.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={registerBusiness.isPending || createCampaign.isPending}>
              {(registerBusiness.isPending || createCampaign.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Campaign
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdsPortal() {
  const { isDark } = useTheme();
  const [view, setView] = useState<"landing" | "register" | "dashboard">("landing");
  const { data: campaigns, isLoading } = useListAdCampaigns();

  if (view === "register") {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <Link href="/">
            <div className="flex items-center gap-2">
              <img 
                src={isDark ? "/logo/light_logo.svg" : "/logo/dark_logo.svg"} 
                alt="OpenBALC Logo" 
                className="h-7 object-contain" 
              />
              <span className="font-bold text-sm text-primary uppercase tracking-wider ml-1">Ads</span>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setView("landing")}>Back</Button>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-2">Create Your Campaign</h1>
          <p className="text-muted-foreground mb-8">Reach engaged learners on OpenBALC</p>
          <RegistrationWizard onComplete={() => setView("dashboard")} />
        </main>
      </div>
    );
  }

  if (view === "dashboard") {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img 
              src={isDark ? "/logo/light_logo.svg" : "/logo/dark_logo.svg"} 
              alt="OpenBALC Logo" 
              className="h-7 object-contain" 
            />
            <span className="font-bold text-sm text-primary uppercase tracking-wider ml-1">Ads</span>
          </div>
          <Button size="sm" onClick={() => setView("register")}>
            <Plus className="h-4 w-4 mr-1.5" /> New Campaign
          </Button>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-xl font-bold mb-6">My Campaigns</h1>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 animate-pulse h-20 bg-muted/20" />
            ))}</div>
          ) : !campaigns?.length ? (
            <div className="text-center py-16">
              <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No campaigns yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c: any) => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{c.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    </div>
                    <Badge className={cn("border-0 capitalize", STATUS_COLORS[c.status])}>{c.status}</Badge>
                  </div>
                  <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
                    <span>{c.impressions} impressions</span>
                    <span>{c.creditsDistributed} credits distributed</span>
                    <span>{timeAgo(c.createdAt)}</span>
                  </div>
                  {c.rejectReason && (
                    <p className="mt-2 text-xs text-rose-400">Rejected: {c.rejectReason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img 
              src={isDark ? "/logo/light_logo.svg" : "/logo/dark_logo.svg"} 
              alt="OpenBALC Logo" 
              className="h-7 object-contain" 
            />
          </div>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("dashboard")}>My Campaigns</Button>
          <Button size="sm" onClick={() => setView("register")}>Advertise Now</Button>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-4 border-primary/30 bg-primary/10 text-primary">For Advertisers</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Reach learners who are<br className="hidden md:block" /> <span className="text-primary">actively engaged</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          OpenBALC users are focused, curious, and high-intent. Your ads appear naturally in their learning flow.
        </p>
        <div className="flex justify-center gap-3">
          <Button size="lg" onClick={() => setView("register")}>
            Get Started <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => setView("dashboard")}>
            View Dashboard
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Users, label: "Active Learners", value: "10K+" },
            { icon: TrendingUp, label: "Engagement Rate", value: "4.2x" },
            { icon: Zap, label: "Credits Distributed", value: "1M+" },
          ].map(stat => (
            <div key={stat.label} className="text-center p-6 rounded-xl border border-border bg-card">
              <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Register", desc: "Create your business profile and ad creative" },
            { step: "2", title: "Review", desc: "Our team reviews your campaign within 24-48 hours" },
            { step: "3", title: "Reach", desc: "Your ad appears to engaged learners, distributing credits" },
          ].map(item => (
            <div key={item.step} className="text-center p-6 rounded-xl border border-border bg-card">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
