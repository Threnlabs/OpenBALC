import { Link } from "wouter";
import { useState } from "react";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const formatPrice = (usd: number, inr: number, isYearly: boolean = false, isSubscription: boolean = false) => {
    const multiplier = isSubscription && isYearly ? 10 : 1;
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
          <Link href="/pricing" className="text-foreground transition-colors font-bold">Pricing</Link>
          <Link href="/ads" className="hover:text-foreground transition-colors">Advertisers</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Sign in</Link>
          <Link href="/login" className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-32 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Free forever for basic use. Buy credits when you need them, or unlock premium features for advanced capabilities.
            </p>
          </div>

          {/* Toggles */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border border-border">
              <button 
                onClick={() => setCurrency("USD")}
                className={cn("px-5 py-2 text-sm font-medium rounded-md transition-all", currency === "USD" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}
              >
                USD ($)
              </button>
              <button 
                onClick={() => setCurrency("INR")}
                className={cn("px-5 py-2 text-sm font-medium rounded-md transition-all", currency === "INR" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}
              >
                INR (₹)
              </button>
            </div>

            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border border-border">
              <button 
                onClick={() => setBillingCycle("monthly")}
                className={cn("px-5 py-2 text-sm font-medium rounded-md transition-all", billingCycle === "monthly" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle("yearly")}
                className={cn("px-5 py-2 text-sm font-medium rounded-md transition-all", billingCycle === "yearly" ? "bg-primary text-primary-foreground shadow" : "hover:bg-muted")}
              >
                Yearly <span className="text-[10px] ml-1 bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">Save 16%</span>
              </button>
            </div>
          </div>

          <div className="space-y-24">
            {/* Subscription Plans */}
            <div>
              <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-bold">Subscription Plans</h3>
                <p className="text-muted-foreground mt-2">Start for free and upgrade as your needs grow.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {subscriptionPlans.map(plan => (
                  <div key={plan.id} className={cn("p-8 rounded-2xl border flex flex-col relative", plan.isBundle ? "border-primary bg-primary/5 shadow-xl scale-105 z-10" : "border-border bg-card")}>
                    {plan.isBundle && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Most Popular</div>}
                    <div className="mb-6">
                      <h4 className={cn("text-xl font-bold mb-2", plan.isBundle && "text-primary")}>{plan.name}</h4>
                      <p className="text-sm text-muted-foreground min-h-[40px]">{plan.desc}</p>
                    </div>
                    <div className="mb-8">
                      <span className="text-4xl font-extrabold">{formatPrice(plan.usd, plan.inr, billingCycle === "yearly", true)}</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/login" className={cn("w-full text-center py-3 rounded-md font-medium transition-opacity", plan.isBundle ? "bg-primary text-primary-foreground hover:opacity-90" : (plan.id === "free" ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"))}>
                      {plan.id === "free" ? "Get Started" : "Subscribe Now"}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Packs */}
            <div>
              <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-bold">Credit Add-ons</h3>
                <p className="text-muted-foreground mt-2">Buy additional credits as needed for AI-powered actions. Valid for 12 months.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {creditPacks.map(pack => (
                  <div key={pack.id} className={cn("p-6 rounded-xl border flex flex-col", pack.popular ? "border-primary shadow-md relative" : "border-border bg-card hover:border-primary/30 transition-colors")}>
                    {pack.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold px-3 py-1 rounded-full whitespace-nowrap">Most Popular</div>}
                    <div className="mb-4 text-center pt-2">
                      <h4 className="font-bold text-lg text-muted-foreground">{pack.name}</h4>
                      <div className="text-3xl font-bold mt-2">{formatPrice(pack.usd, pack.inr)}</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 mb-6 flex flex-col items-center justify-center gap-1">
                      <Zap className="h-6 w-6 text-amber-400 mb-1" />
                      <span className="text-2xl font-bold">{pack.credits}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Credits</span>
                    </div>
                    <p className="text-sm text-center text-muted-foreground mb-6 flex-1">{pack.desc}</p>
                    <Link href="/login" className={cn("w-full text-center py-2.5 rounded-md text-sm font-medium transition-opacity", pack.popular ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}>
                      Buy Now
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
