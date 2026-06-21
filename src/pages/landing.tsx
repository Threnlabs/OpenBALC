import { Link } from "wouter";
import { useState } from "react";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Landing() {

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-white">
            OB
          </div>
          <span className="font-bold text-lg tracking-tight">OpenBALC</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
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
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">

          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="OpenBALC Logo" className="w-32 h-32 md:w-48 md:h-48 object-contain" />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance leading-tight">
            Structured, intelligent,<br className="hidden md:block"/> and yours.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            OpenBALC is a high-performance workspace that respects your time and rewards your curiosity. Build modules, chat with AI, and manage your knowledge ecosystem.
          </p>
          <div className="flex items-center justify-center gap-4 pt-8">
            <Link href="/login" className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium text-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
              Start Building
            </Link>
          </div>
        </div>

        {/* Features stub */}
        <div className="max-w-5xl mx-auto px-6 py-32 grid md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="text-xl font-bold mb-2">Modules</h3>
            <p className="text-muted-foreground">Structure your knowledge into distinct units and chat with them using AI.</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="text-xl font-bold mb-2">Credits</h3>
            <p className="text-muted-foreground">Earn credits by contributing. Spend them to unlock premium features and AI power.</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="text-xl font-bold mb-2">Workspaces</h3>
            <p className="text-muted-foreground">Collaborate with others in organizations and shared workspaces.</p>
          </div>
        </div>


      </main>
    </div>
  );
}
