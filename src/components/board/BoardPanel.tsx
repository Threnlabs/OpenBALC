import React, { useState } from "react";
import { useApp } from "benchrex/context/BenchrexContext";
import { Button } from "benchrex/components/ui/button";
import { Input } from "benchrex/components/ui/input";
import { Textarea } from "benchrex/components/ui/textarea";
import { X, Plus, Trash2, StickyNote, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BoardNote } from "benchrex/types";
import { NOTE_COLORS } from "benchrex/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "benchrex/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface BoardPanelProps {
  onClose: () => void;
}

const BoardPanel = ({ onClose }: BoardPanelProps) => {
  const { notes, addNote, deleteNote } = useApp();
  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleAdd = () => {
    if (!title.trim() && !content.trim()) return;
    const note: BoardNote = {
      id: crypto.randomUUID(),
      title: title.trim() || "Untitled",
      content: content.trim(),
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      createdAt: Date.now(),
      source: "manual",
    };
    addNote(note);
    setTitle("");
    setContent("");
    setOpen(false);
  };

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden bg-card border-l border-border transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <StickyNote className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-foreground leading-none">
              Notes Board
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center max-w-[240px] mx-auto py-20">
            <div className="mb-4 h-16 w-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <StickyNote className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-sm font-bold mb-1 text-foreground">Board is empty</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pin AI answers or add your own notes to build your knowledge base.
            </p>
          </div>
        ) : (
          <div className={`grid gap-3 ${isFullscreen ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
            <AnimatePresence>
              {notes.map((n) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div
                    className="group relative rounded-xl border border-border/50 p-4 shadow-sm transition-all hover:shadow-md overflow-hidden"
                    style={{ backgroundColor: n.color }}
                  >
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="absolute right-2 top-2 rounded-lg p-1 bg-black/0 hover:bg-black/10 text-black/40 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <h3 className="pr-6 text-sm font-bold text-black/80 leading-tight mb-2">
                      {n.title}
                    </h3>
                    {n.content && (
                      <div className="prose prose-sm prose-p:text-black/70 text-black/70 mb-3 line-clamp-6">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {n.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5">
                      <span className="text-[9px] font-bold text-black/40 uppercase">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl" aria-describedby="board-note-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <Plus className="h-5 w-5 text-primary" />
               Create New Note
            </DialogTitle>
            <DialogDescription id="board-note-description">
              Capture important information or ideas to your knowledge board.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Title</label>
              <Input
                placeholder="Give your note a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border-border/50 bg-muted/30 h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Content</label>
              <Textarea
                placeholder="Write your note using Markdown..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="rounded-2xl border-border/50 bg-muted/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>
              Discard
            </Button>
            <Button className="rounded-xl px-8" onClick={handleAdd}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoardPanel;
