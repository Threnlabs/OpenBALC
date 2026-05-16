import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  X, Search, BookOpen, Sigma, FileText, HelpCircle, Lightbulb,
  ChevronLeft, ChevronRight, Filter, Layers, Database,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  searchContentBank,
  listContentBank,
  ContentBankItem,
  ContentBankSearchOptions,
  ContentBankContentType,
  ContentBankDifficulty,
} from "../../lib/tools/contentBank";

export type { ContentBankItem };

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<ContentBankContentType, { label: string; icon: React.ReactNode; color: string }> = {
  definition: { label: "Definition", icon: <BookOpen className="h-4 w-4" />,  color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  formula:    { label: "Formula",    icon: <Sigma className="h-4 w-4" />,     color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  text:       { label: "Theory",     icon: <FileText className="h-4 w-4" />,  color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  example:    { label: "Example",    icon: <Lightbulb className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  question:   { label: "Question",   icon: <HelpCircle className="h-4 w-4" />,color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  answer:     { label: "Answer",     icon: <ChevronRight className="h-4 w-4"/>,color: "bg-green-500/10 text-green-400 border-green-500/20" },
};

const DIFFICULTY_COLOR: Record<ContentBankDifficulty, string> = {
  easy:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hard:   "bg-red-500/10 text-red-400 border-red-500/20",
};

interface ContentBankPanelProps {
  onClose: () => void;
  activeItems?: ContentBankItem[]; // kept for future use but not shown
}

const ContentBankPanel = ({ onClose }: ContentBankPanelProps) => {
  const [searchQuery, setSearchQuery]   = useState("");
  const [filterType, setFilterType]     = useState<ContentBankContentType | "">("");
  const [filterDiff, setFilterDiff]     = useState<ContentBankDifficulty | "">("");
  const [selectedItem, setSelectedItem] = useState<ContentBankItem | null>(null);
  const [items, setItems]               = useState<ContentBankItem[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [hasSearched, setHasSearched]   = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const opts: ContentBankSearchOptions = { limit: 15 };
      if (filterType) opts.content_type = filterType;
      if (filterDiff) opts.difficulty   = filterDiff;
      const res = await searchContentBank(searchQuery, opts);
      setItems(res.results);
    } catch (e) {
      console.error("[ContentBankPanel] search error:", e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseAll = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const opts: ContentBankSearchOptions = { limit: 30 };
      if (filterType) opts.content_type = filterType;
      if (filterDiff) opts.difficulty   = filterDiff;
      const res = await listContentBank(opts);
      setItems(res.items);
    } catch (e) {
      console.error("[ContentBankPanel] browse error:", e);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ backgroundColor: "var(--color-sidebar-bg, hsl(var(--card)))" }}
      id="content-bank-panel"
    >

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3"
           style={{ backgroundColor: "inherit" }}>
        <div className="flex items-center gap-2">
          {selectedItem ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedItem(null)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Database className="h-4 w-4 text-primary" />
          )}
          <h2 className="font-semibold text-sm text-foreground">
            {selectedItem ? "Content Detail" : "Content Bank"}
          </h2>
          {!selectedItem && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} id="content-bank-close-btn">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ backgroundColor: "inherit" }}>
        <AnimatePresence mode="wait">
          {/* ── Detail View ─────────────────────────────────────────────── */}
          {selectedItem ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 overflow-y-auto p-6 space-y-4"
              style={{ backgroundColor: "inherit" }}
            >
              {/* Badges */}
              <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md border ${DIFFICULTY_COLOR[selectedItem.difficulty]}`}>
                  {selectedItem.difficulty}
                </span>
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md border flex items-center gap-1 ${TYPE_META[selectedItem.content_type]?.color}`}>
                  {TYPE_META[selectedItem.content_type]?.icon}
                  {TYPE_META[selectedItem.content_type]?.label}
                </span>
              </div>

              {/* Breadcrumb */}
              <div className="text-xs text-muted-foreground space-x-1">
                <span className="font-semibold text-primary">{selectedItem.subject}</span>
                <span>›</span>
                <span>{selectedItem.chapter}</span>
                {selectedItem.section && (<><span>›</span><span>{selectedItem.section}</span></>)}
              </div>

              <h1 className="text-xl font-bold text-foreground leading-tight">{selectedItem.title}</h1>

              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedItem.content}</ReactMarkdown>
              </div>

              {selectedItem.keywords && (
                <div className="pt-4 border-t border-border">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.keywords.split(",").map((kw: string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* ── Browse & Search View ───────────────────────────────────── */
            <motion.div
              key="browse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
              style={{ backgroundColor: "inherit" }}
            >
              {/* Search Controls */}
              <div className="shrink-0 p-3 space-y-2 border-b border-border" style={{ backgroundColor: "inherit" }}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="content-bank-search-input"
                      placeholder="Search topics, formulas, definitions…"
                      className="pl-8 h-8 text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <Button
                    id="content-bank-search-btn"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={handleSearch}
                    disabled={isLoading || searchQuery.length < 2}
                  >
                    {isLoading ? "…" : "Search"}
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                  <select
                    id="content-bank-type-filter"
                    className="text-[10px] bg-muted border border-border rounded px-1.5 py-1 text-foreground"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as ContentBankContentType | "")}
                  >
                    <option value="">All Types</option>
                    {(Object.keys(TYPE_META) as ContentBankContentType[]).map((t) => (
                      <option key={t} value={t}>{TYPE_META[t].label}</option>
                    ))}
                  </select>
                  <select
                    id="content-bank-diff-filter"
                    className="text-[10px] bg-muted border border-border rounded px-1.5 py-1 text-foreground"
                    value={filterDiff}
                    onChange={(e) => setFilterDiff(e.target.value as ContentBankDifficulty | "")}
                  >
                    <option value="">All Levels</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <Button
                    id="content-bank-browse-all-btn"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 ml-auto"
                    onClick={handleBrowseAll}
                    disabled={isLoading}
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    Browse All
                  </Button>
                </div>
              </div>

              {/* Item List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ backgroundColor: "inherit" }}>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                    <div className="mb-4 rounded-2xl bg-primary/10 p-4">
                      <Database className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {hasSearched ? "No results found" : "Search or browse content"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                      {hasSearched
                        ? "Try different keywords or browse all available content."
                        : "Type a topic, formula, or concept and press Search, or click 'Browse All' to explore the curriculum."}
                    </p>
                    {!hasSearched && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 text-xs gap-1.5"
                        onClick={handleBrowseAll}
                        disabled={isLoading}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        Browse All Content
                      </Button>
                    )}
                  </div>
                ) : (
                  <AnimatePresence>
                    {items.map((item, idx) => {
                      const meta = TYPE_META[item.content_type] || TYPE_META.text;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          onClick={() => setSelectedItem(item)}
                          className="group cursor-pointer rounded-xl border border-border bg-muted/30 p-3 hover:bg-muted/60 hover:border-primary/30 transition-all"
                          id={`content-bank-item-${item.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.color}`}>
                              {meta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors text-foreground mb-1">
                                {item.title}
                              </h3>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.content.slice(0, 120)}…
                              </p>
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                  {item.subject}
                                </span>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">
                                  {item.chapter}
                                </span>
                                <span className="text-muted-foreground ml-auto">·</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLOR[item.difficulty]}`}>
                                  {item.difficulty}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ContentBankPanel;
