import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown, ExternalLink, Search, Zap } from "lucide-react";
import type { WebSearchMeta } from "benchrex/types";

interface SearchResultsCardProps {
  webSearch: WebSearchMeta;
}

const PROVIDER_LABELS: Record<WebSearchMeta["provider"], string> = {
  brave: "Brave Search",
  duckduckgo: "DuckDuckGo",
  none: "No results",
};

const SearchResultsCard: React.FC<SearchResultsCardProps> = ({ webSearch }) => {
  const [open, setOpen] = useState(false);

  if (!webSearch.results.length) return null;

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-primary/10 transition-colors"
      >
        {/* Animated spinner when search ran */}
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <Search className="h-3 w-3" />
        </div>

        <span className="flex-1 text-left text-xs font-semibold text-foreground/70 truncate">
          Web search&nbsp;·&nbsp;
          <span className="text-primary">{webSearch.query}</span>
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {/* Provider badge */}
          <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {PROVIDER_LABELS[webSearch.provider]}
          </span>
          {/* Result count */}
          <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
            {webSearch.results.length} sources
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Collapsible results */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="results"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-1 space-y-2">
              {webSearch.results.map((result, i) => (
                <motion.a
                  key={result.url}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group flex items-start gap-3 rounded-lg p-2.5 hover:bg-background/80 transition-colors border border-transparent hover:border-border/50"
                >
                  {/* Citation number + favicon placeholder */}
                  <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${result.domain}&sz=16`}
                      alt=""
                      className="h-3.5 w-3.5 rounded-sm opacity-70"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                        {result.title}
                      </p>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </div>
                    <p className="text-[10px] text-primary/70 mb-1 truncate">{result.domain}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {result.description}
                    </p>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchResultsCard;
