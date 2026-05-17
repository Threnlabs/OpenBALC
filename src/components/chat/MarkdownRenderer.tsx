import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface MarkdownRendererProps {
  content: string;
  variant?: "chat" | "user" | "note";
}

const MarkdownRenderer = ({ content, variant = "chat" }: MarkdownRendererProps) => {
  // A helper component to handle copy action for code blocks
  const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Code copied");
        setTimeout(() => setCopied(false), 1500);
      } catch {
        toast.error("Failed to copy code");
      }
    };

    return (
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-700/50"
        title="Copy code"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    );
  };

  // Base styling classes depending on the variant
  let containerClass = "";
  if (variant === "user") {
    containerClass = "text-sm text-white font-medium space-y-3";
  } else if (variant === "note") {
    containerClass = "text-xs md:text-sm text-black/80 font-normal space-y-3";
  } else {
    // variant === "chat"
    containerClass = "text-sm md:text-base text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal space-y-4";
  }

  // Customized tag components for ReactMarkdown
  const customComponents = {
    // 1. Perfect Tables
    table: ({ node, ...props }: any) => {
      if (variant === "note") {
        return (
          <div className="my-3 overflow-x-auto rounded-xl border border-black/10 shadow-sm bg-white/40 backdrop-blur-sm">
            <table className="w-full text-[11px] md:text-xs border-collapse text-left text-black/80" {...props} />
          </div>
        );
      }
      if (variant === "user") {
        return (
          <div className="my-3 overflow-x-auto rounded-xl border border-white/20 bg-white/10">
            <table className="w-full text-xs border-collapse text-left text-white" {...props} />
          </div>
        );
      }
      return (
        <div className="my-4 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md bg-white dark:bg-zinc-950/30 transition-all">
          <table className="w-full text-xs md:text-sm border-collapse text-left" {...props} />
        </div>
      );
    },
    thead: ({ node, ...props }: any) => {
      if (variant === "note") {
        return <thead className="bg-black/5 border-b border-black/10 font-bold" {...props} />;
      }
      if (variant === "user") {
        return <thead className="bg-white/10 border-b border-white/20 font-bold" {...props} />;
      }
      return <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-900 dark:text-zinc-100" {...props} />;
    },
    tbody: ({ node, ...props }: any) => <tbody {...props} />,
    tr: ({ node, ...props }: any) => {
      if (variant === "note") {
        return <tr className="hover:bg-black/5 border-b border-black/5 last:border-0 transition-colors" {...props} />;
      }
      if (variant === "user") {
        return <tr className="hover:bg-white/5 border-b border-white/10 last:border-0" {...props} />;
      }
      return <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 border-b border-zinc-100 dark:border-zinc-850 last:border-b-0 transition-colors duration-150" {...props} />;
    },
    th: ({ node, ...props }: any) => (
      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] md:text-xs" {...props} />
    ),
    td: ({ node, ...props }: any) => (
      <td className="px-4 py-2.5 leading-normal" {...props} />
    ),

    // 2. Headings with elegant visual weights and dynamic sizes
    h1: ({ node, ...props }: any) => {
      const cls = variant === "user" 
        ? "text-lg font-extrabold text-white mt-4 mb-2 tracking-tight" 
        : variant === "note" 
        ? "text-sm font-bold text-black/90 mt-3 mb-1.5 tracking-tight border-b border-black/10 pb-0.5" 
        : "text-xl md:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-6 mb-3 tracking-tight border-b border-zinc-100 dark:border-zinc-800 pb-1";
      return <h1 className={cls} {...props} />;
    },
    h2: ({ node, ...props }: any) => {
      const cls = variant === "user" 
        ? "text-base font-bold text-white mt-3 mb-2 tracking-tight" 
        : variant === "note" 
        ? "text-xs font-bold text-black/90 mt-2.5 mb-1 tracking-tight" 
        : "text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-5 mb-2.5 tracking-tight";
      return <h2 className={cls} {...props} />;
    },
    h3: ({ node, ...props }: any) => {
      const cls = variant === "user" 
        ? "text-sm font-bold text-white mt-2 mb-1" 
        : variant === "note" 
        ? "text-xs font-bold text-black/80 mt-2 mb-1" 
        : "text-base md:text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-4 mb-2";
      return <h3 className={cls} {...props} />;
    },

    // 3. Spacing between paragraphs
    p: ({ node, ...props }: any) => {
      const cls = variant === "user"
        ? "text-sm text-white/95 leading-relaxed mb-3 last:mb-0 font-medium"
        : variant === "note"
        ? "text-xs md:text-sm text-black/75 leading-relaxed mb-2.5 last:mb-0 font-normal"
        : "text-sm md:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4 last:mb-0";
      return <p className={cls} {...props} />;
    },

    // 4. Beautiful custom rendered list items to fix layout/bullet crashes
    ul: ({ node, ...props }: any) => {
      const cls = variant === "user"
        ? "list-disc pl-5 space-y-1 mb-3 text-white/90"
        : variant === "note"
        ? "list-disc pl-4 space-y-1.5 mb-2.5 text-black/80"
        : "list-disc pl-6 space-y-2 mb-4 text-zinc-700 dark:text-zinc-300 marker:text-primary";
      return <ul className={cls} {...props} />;
    },
    ol: ({ node, ...props }: any) => {
      const cls = variant === "user"
        ? "list-decimal pl-5 space-y-1 mb-3 text-white/90"
        : variant === "note"
        ? "list-decimal pl-4 space-y-1.5 mb-2.5 text-black/80"
        : "list-decimal pl-6 space-y-2 mb-4 text-zinc-700 dark:text-zinc-300 marker:text-primary font-medium";
      return <ol className={cls} {...props} />;
    },
    li: ({ node, ...props }: any) => (
      <li className="leading-relaxed" {...props} />
    ),

    // 5. Code & Code Blocks
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      const codeString = String(children).replace(/\n$/, "");

      if (!inline && match) {
        // High fidelity code block with Copy button
        return (
          <div className="relative group my-4 rounded-xl overflow-hidden border border-zinc-800 shadow-lg bg-zinc-950">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-[10px] md:text-xs text-zinc-400 font-mono">
              <span>{match[1].toUpperCase()}</span>
            </div>
            <CopyButton text={codeString} />
            <pre className="p-4 overflow-x-auto text-[11px] md:text-xs md:leading-relaxed text-zinc-100 font-mono bg-zinc-950/70">
              <code>{codeString}</code>
            </pre>
          </div>
        );
      }

      // Inline code
      if (variant === "user") {
        return (
          <code className="px-1.5 py-0.5 rounded-md text-xs bg-white/20 text-white font-mono border border-white/10" {...props}>
            {children}
          </code>
        );
      }
      if (variant === "note") {
        return (
          <code className="px-1.5 py-0.5 rounded-md text-[11px] md:text-xs bg-black/5 text-black font-mono border border-black/10" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 text-red-500 dark:text-red-400 font-mono border border-zinc-200 dark:border-zinc-700/50" {...props}>
          {children}
        </code>
      );
    },

    // 6. Styled Blockquotes
    blockquote: ({ node, ...props }: any) => {
      if (variant === "user") {
        return (
          <blockquote className="pl-4 border-l-4 border-white/40 italic my-3 text-white/80" {...props} />
        );
      }
      if (variant === "note") {
        return (
          <blockquote className="pl-3 border-l-3 border-black/20 italic my-2.5 text-black/60 bg-black/2.5 py-1 px-3 rounded-r-lg" {...props} />
        );
      }
      return (
        <blockquote className="pl-4 border-l-4 border-primary italic my-4 text-zinc-600 dark:text-zinc-400 bg-primary/5 py-2.5 px-4 rounded-r-2xl border-solid" {...props} />
      );
    },

    // 7. Interactive Links
    a: ({ node, href, children, ...props }: any) => {
      const isExternal = href?.startsWith("http");
      if (variant === "user") {
        return (
          <a
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="underline hover:text-white/85 transition-colors font-semibold inline-flex items-center gap-0.5"
            {...props}
          >
            {children}
            {isExternal && <ExternalLink className="h-3 w-3 inline" />}
          </a>
        );
      }
      if (variant === "note") {
        return (
          <a
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="underline text-black hover:text-black/70 transition-colors font-semibold inline-flex items-center gap-0.5"
            {...props}
          >
            {children}
            {isExternal && <ExternalLink className="h-2.5 w-2.5 inline" />}
          </a>
        );
      }
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-primary hover:text-primary/80 underline font-semibold transition-colors inline-flex items-center gap-0.5"
          {...props}
        >
          {children}
          {isExternal && <ExternalLink className="h-3.5 w-3.5 inline" />}
        </a>
      );
    },

    // 8. Elegant strong tags
    strong: ({ node, ...props }: any) => {
      if (variant === "note") {
        return <strong className="font-bold text-black/95" {...props} />;
      }
      if (variant === "user") {
        return <strong className="font-bold text-white" {...props} />;
      }
      return <strong className="font-bold text-zinc-950 dark:text-zinc-50" {...props} />;
    }
  };

  return (
    <div className={containerClass}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={customComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
