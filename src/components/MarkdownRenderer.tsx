import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-border">
              <table className="min-w-full divide-y divide-border text-xs" {...props} />
            </div>
          ),
          th: ({ ...props }) => (
            <th className="bg-muted/50 px-4 py-2 text-left font-bold text-foreground" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="px-4 py-2 border-t border-border text-muted-foreground" {...props} />
          ),
          pre: ({ ...props }) => (
            <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[10px] overflow-x-auto whitespace-pre leading-relaxed border border-border/40 shadow-inner my-4" {...props} />
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const inline = !match;
            return inline ? (
              <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-primary" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
