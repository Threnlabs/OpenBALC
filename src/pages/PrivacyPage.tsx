import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowLeft, ShieldCheck, Database, Cpu, UserCheck, Shield } from "lucide-react";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary animate-pulse" />
            <h1 className="font-display text-lg font-semibold">Privacy & Consent Notice</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 text-sm leading-relaxed">
        {/* Overview */}
        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-primary flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Overview
          </h2>
          <p className="text-muted-foreground">
            Benchrex is an AI-driven academic learning portal designed to help students get high-quality study answers and organize study notes. Your privacy and academic data security are extremely important. This notice describes how we process, store, and protect your data.
          </p>
        </section>

        {/* What We Store */}
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-primary flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Information We Process & Store
          </h2>
          <p className="text-muted-foreground">
            To provide real-time tutoring assistant answers and structured study aids, we collect and store:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li><strong>Student Profile Details:</strong> Your name, institutional email address, grade level, course path, and student batch.</li>
            <li><strong>Chat History & Notes:</strong> Chat logs, pinned study threads, board notes, expert live-session logs, and feedback you submit.</li>
            <li><strong>System Preferences:</strong> Theme settings, custom AI personality allocations, and local session preferences.</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            All database operations are strictly protected by Postgres Row Level Security (RLS) policies scoped by your institution's unique identifier. Your data is isolated and cannot be accessed by other tenants. Local parameters may also be cached inside browser storage (localStorage) for faster rendering.
          </p>
        </section>

        {/* AI Processing */}
        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-primary flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            How Your Questions Are Processed
          </h2>
          <p className="text-muted-foreground">
            Your academic queries are sent to secure AI models (such as Groq, OpenAI, or Gemini) to generate tutoring explanations. 
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>We only send contextual academic material and the text of your query.</li>
            <li>We do not use your questions, files, or responses to train generalized, public LLM models.</li>
            <li>Your transcripts are private and are only accessible by you and your institution's authorized administrators.</li>
          </ul>
          <p className="text-muted-foreground font-semibold">
            Warning: Do not submit sensitive personal identifiers (e.g. credit card numbers, passwords, medical data) inside Benchrex prompts.
          </p>
        </section>

        {/* FERPA & Data Rights */}
        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold text-primary flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Your Rights & FERPA Compliance
          </h2>
          <p className="text-muted-foreground">
            Your data is protected under the Family Educational Rights and Privacy Act (FERPA). CalendarSync operates as an authorized "School Official" under direct control of your institution:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>Your academic records and chats are never sold, rented, or shared with commercial entities or advertisers.</li>
            <li>You can review, export, or request the deletion of your personal records and chat logs by contacting your institution's administrator.</li>
          </ul>
        </section>

        {/* Disclaimer */}
        <section className="p-4 rounded-xl border border-warning bg-warning/5 space-y-2">
          <h3 className="font-semibold text-foreground flex items-center gap-1.5">
            Academic Assistant Disclaimer
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Benchrex is designed to assist you with tutoring and study prep. AI-generated answers are educational helpers and are not guaranteed to be 100% correct, complete, or accurate. Please cross-reference all tutoring explanations with standard curriculum textbooks and official instructor guidelines before submitting assignments or preparing for exams.
          </p>
        </section>

        <div className="pt-4 flex gap-4">
          <Button asChild>
            <Link to="/">Back to app</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
