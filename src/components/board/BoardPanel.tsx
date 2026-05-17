import React, { useState } from "react";
import { useApp } from "../../context/BenchrexContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { X, Plus, Trash2, StickyNote, Maximize2, Minimize2, Star, Link } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { BoardNote } from "../../types";
import { NOTE_COLORS } from "../../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import MarkdownRenderer from "../chat/MarkdownRenderer";

interface BoardPanelProps {
  onClose: () => void;
}

const BoardPanel = ({ onClose }: BoardPanelProps) => {
  const { notes, addNote, updateNote, deleteNote, conversations, setActiveConversation } = useApp();
  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // New note creation state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [newColor, setNewColor] = useState(NOTE_COLORS[0]);
  const [newStarred, setNewStarred] = useState(false);

  // Selected note edit state
  const [selectedNote, setSelectedNote] = useState<BoardNote | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editStarred, setEditStarred] = useState(false);

  const handleAdd = () => {
    if (!title.trim() && !content.trim()) return;
    const note: BoardNote = {
      id: crypto.randomUUID(),
      title: title.trim() || "Untitled",
      content: content.trim(),
      color: newColor,
      createdAt: Date.now(),
      source: "manual",
      isStarred: newStarred,
    };
    addNote(note);
    setTitle("");
    setContent("");
    setNewColor(NOTE_COLORS[0]);
    setNewStarred(false);
    setOpen(false);
  };

  const handleNoteClick = (n: BoardNote) => {
    setSelectedNote(n);
    setEditTitle(n.title);
    setEditContent(n.content || "");
    setEditColor(n.color);
    setEditStarred(!!n.isStarred);
  };

  const handleSave = () => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, {
      title: editTitle.trim() || "Untitled",
      content: editContent.trim(),
      color: editColor,
      isStarred: editStarred,
    });
    setSelectedNote(null);
  };

  const handleCardStarClick = (e: React.MouseEvent, n: BoardNote) => {
    e.stopPropagation();
    updateNote(n.id, { isStarred: !n.isStarred });
  };

  const handleViewConversation = (e: React.MouseEvent, conversationId?: string) => {
    e.stopPropagation();
    if (!conversationId) {
      toast.error("This note was added manually and is not linked to any conversation.");
      return;
    }

    const linkedConversationExists = conversations.some((c) => c.id === conversationId);
    if (!linkedConversationExists) {
      toast.error("The conversation linked to this note could not be found.");
      return;
    }

    setActiveConversation(conversationId);
    onClose(); // Close the notes board to show the active chat conversation
    toast.success("Opened linked conversation!");
  };

  // Sort notes: starred notes float to the top, then ordered by newest creation date
  const sortedNotes = [...notes].sort((a, b) => {
    const aStarred = !!a.isStarred;
    const bStarred = !!b.isStarred;
    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className={`flex h-full w-full flex-col overflow-hidden bg-card border-l border-border transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20 shrink-0">
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
              {sortedNotes.map((n) => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div
                    onClick={() => handleNoteClick(n)}
                    className="group relative rounded-xl border border-border/50 p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col h-full min-h-[160px] hover:scale-[1.01] active:scale-[0.99]"
                    style={{ backgroundColor: n.color }}
                  >
                    {/* Action buttons shown on hover */}
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {n.conversationId && (
                        <button
                          onClick={(e) => handleViewConversation(e, n.conversationId)}
                          className="rounded-lg p-1 bg-black/0 hover:bg-black/10 text-black/40 hover:text-black transition-all"
                          title="View linked conversation"
                        >
                          <Link className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleCardStarClick(e, n)}
                        className={`rounded-lg p-1 transition-all bg-black/0 hover:bg-black/10 ${
                          n.isStarred ? "text-amber-600" : "text-black/40 hover:text-amber-600"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${n.isStarred ? "fill-amber-500 text-amber-500" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(n.id);
                        }}
                        className="rounded-lg p-1 bg-black/0 hover:bg-black/10 text-black/40 hover:text-red-600 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Star indicator shown when not hovering */}
                    {n.isStarred && (
                      <div className="absolute right-2 top-2 p-1 text-amber-500 group-hover:opacity-0 transition-opacity pointer-events-none">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      </div>
                    )}

                    <h3 className="pr-12 text-sm font-bold text-black/80 leading-tight mb-2">
                      {n.title}
                    </h3>
                    {n.content && (
                      <div className="mb-3 line-clamp-6 flex-grow">
                        <MarkdownRenderer content={n.content} variant="note" />
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

      {/* Creation Dialog */}
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
          <div className="space-y-4 py-2">
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
                rows={6}
                className="rounded-2xl border-border/50 bg-muted/30 resize-none animate-none"
              />
            </div>

            {/* Note styling controls during creation */}
            <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Color</label>
                <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/30 w-fit">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`h-5 w-5 rounded-full border transition-all ${
                        newColor === c 
                          ? "scale-110 ring-2 ring-primary/40 border-primary/20" 
                          : "border-border/30 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col items-end">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Star Status</label>
                <button
                  type="button"
                  onClick={() => setNewStarred(!newStarred)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border ${
                    newStarred 
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                      : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/30"
                  }`}
                >
                  <Star className={`h-4 w-4 ${newStarred ? "fill-amber-500 text-amber-500" : ""}`} />
                  {newStarred ? "Starred" : "Star"}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 shrink-0">
            <Button variant="ghost" className="rounded-xl" onClick={() => setOpen(false)}>
              Discard
            </Button>
            <Button className="rounded-xl px-8" onClick={handleAdd}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expanded/Edit Note Dialog (Responsive: Full-screen on mobile, elegant sticky note modal on desktop) */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => { if (!open) setSelectedNote(null); }}>
        <DialogContent 
          className="fixed h-[100dvh] w-screen max-w-none left-0 top-0 translate-x-0 translate-y-0 transform-none rounded-none border-none p-0 flex flex-col overflow-hidden shadow-2xl transition-all sm:h-[550px] sm:w-full sm:max-w-xl sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:transform sm:rounded-3xl sm:border"
          style={{ backgroundColor: editColor }}
          aria-describedby="expanded-note-description"
        >
          <div className="p-6 flex flex-col h-full">
            {/* Header metadata label */}
            <div className="flex items-center justify-between mb-4 mt-2 sm:mt-0 shrink-0">
              <span className="text-[10px] tracking-wider text-black/50 font-bold uppercase">
                {selectedNote?.source === "ai-pin" ? "AI Pinned Note" : "Personal Note"}
              </span>
              <span className="text-[10px] tracking-wider text-black/40 font-bold mr-6">
                {selectedNote && new Date(selectedNote.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Note edit inputs - transparent styling for direct "writing on sticky note" feeling */}
            <div className="flex-grow flex flex-col overflow-y-auto mb-4 pr-1">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-transparent text-2xl font-black text-black/90 placeholder:text-black/30 border-none outline-none focus:outline-none focus:ring-0 p-0 mb-4 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Note content..."
                className="w-full flex-grow bg-transparent text-base text-black/80 placeholder:text-black/30 border-none outline-none focus:outline-none focus:ring-0 p-0 resize-none font-medium leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <span id="expanded-note-description" className="sr-only">
              Edit title, content, color, and star status of this note.
            </span>

            {/* Bottom Actions Bar */}
            <div className="border-t border-black/10 pt-4 mt-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
              {/* Note Style, Star & Link Actions */}
              <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-start">
                {/* Color picker circle buttons */}
                <div className="flex items-center gap-1.5 bg-black/5 px-2.5 py-1.5 rounded-2xl">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`h-5 w-5 rounded-full border transition-all ${
                        editColor === c 
                          ? "scale-110 ring-2 ring-black/40 border-black/20" 
                          : "border-black/10 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                {/* Star toggle button */}
                <button
                  onClick={() => setEditStarred(!editStarred)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border ${
                    editStarred 
                      ? "bg-amber-500/20 text-amber-900 border-amber-500/30" 
                      : "bg-black/5 text-black/50 hover:bg-black/10 border-transparent"
                  }`}
                  title={editStarred ? "Unstar note" : "Star note"}
                >
                  <Star className={`h-4 w-4 ${editStarred ? "fill-amber-500 text-amber-500" : ""}`} />
                  {editStarred ? "Starred" : "Star"}
                </button>

                {/* Link Conversation button */}
                {selectedNote?.conversationId ? (
                  <button
                    onClick={(e) => handleViewConversation(e, selectedNote.conversationId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border bg-black/5 text-black/75 hover:bg-black/10 border-transparent"
                    title="View linked chat conversation"
                  >
                    <Link className="h-4 w-4" />
                    View Chat
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all border bg-black/5 text-black/25 border-transparent cursor-not-allowed"
                    title="Manually added note (no chat linked)"
                  >
                    <Link className="h-4 w-4" />
                    No Chat
                  </button>
                )}
              </div>

              {/* Bottom buttons (Cancel & Save) */}
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost"
                  className="text-black/60 hover:text-black hover:bg-black/5 rounded-xl h-10 px-4 text-sm font-bold"
                  onClick={() => setSelectedNote(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-black text-white hover:bg-black/80 rounded-xl h-10 px-6 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  onClick={handleSave}
                >
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BoardPanel;
