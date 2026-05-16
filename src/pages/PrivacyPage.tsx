import React from "react";
import { Link } from "react-router-dom";
import { Button } from "benchrex/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="font-display text-lg font-semibold">Privacy & Consent</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-display text-base font-semibold mb-2">Overview</h2>
          <p className="text-muted-foreground">
            Benchrex helps commerce students get academic answers. This page describes
            what information we collect in this demo, how it is used, and your choices.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold mb-2">Information We Store</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Profile details you provide (name, student ID, grade, course, batch).</li>
            <li>Chat history, pinned threads, board notes, and feedback you submit.</li>
            <li>Theme and appearance preferences.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            All data is stored locally in your browser (localStorage). Nothing is sent to
            external servers in this demo unless an AI backend is explicitly configured.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold mb-2">How Your Questions Are Used</h2>
          <p className="text-muted-foreground">
            Questions are sent to the configured AI backend to generate answers. They may include
            tagged topics and hashtags you select. Do not submit personal, sensitive, or
            confidential information.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold mb-2">Your Consent</h2>
          <p className="text-muted-foreground">
            By using this app you consent to local storage of the data above. You can clear it
            anytime by logging out and clearing your browser data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold mb-2">Contact</h2>
          <p className="text-muted-foreground">
            For any privacy questions, please reach out to your institution's administrator.
          </p>
        </section>

        <div className="pt-4">
          <Button asChild>
            <Link to="/">Back to app</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
