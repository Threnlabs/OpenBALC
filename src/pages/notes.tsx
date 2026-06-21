import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import {
  useListNotes, useCreateNote, useUpdateNote, useDeleteNote,
  getListNotesQueryKey, getGetNoteQueryKey
} from "@workspace/api-client-react";
import { NOTE_COLORS, cn, timeAgo } from "@/lib/utils";
import { StickyNote, Plus, Pin, PinOff, Star, Trash2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function NoteCard({ note, onClick }: { note: any; onClick: () => void }) {
  const qc = useQueryClient();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  function handlePin(e: React.MouseEvent) {
    e.stopPropagation();
    updateNote.mutate({ id: note.id, data: { pinned: !note.pinned } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotesQueryKey() })
    });
  }

  function handleStar(e: React.MouseEvent) {
    e.stopPropagation();
    updateNote.mutate({ id: note.id, data: { starred: !note.starred } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListNotesQueryKey() })
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    deleteNote.mutate({ id: note.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
        toast.success("Note deleted");
      }
    });
  }

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-black/20 transition-all group relative"
      onClick={onClick}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: note.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm leading-tight">{note.title}</h3>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handlePin} className="p-1 rounded hover:bg-muted">
              {note.pinned ? <PinOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button onClick={handleStar} className="p-1 rounded hover:bg-muted">
              <Star className={cn("h-3.5 w-3.5", note.starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </button>
            <button onClick={handleDelete} className="p-1 rounded hover:bg-muted">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-6 leading-relaxed">{note.content}</p>
        {note.sourceTitle && (
          <div className="mt-3 text-[10px] text-muted-foreground border-t border-border pt-2">
            From: {note.sourceTitle}
          </div>
        )}
        <div className="mt-2 text-[10px] text-muted-foreground">{timeAgo(note.updatedAt)}</div>
      </div>
    </div>
  );
}

function NoteModal({ note, open, onClose }: { note: any | null; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [color, setColor] = useState(note?.color ?? NOTE_COLORS[0]);
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const qc = useQueryClient();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  function handleSave() {
    if (!title.trim()) return;
    if (note) {
      updateNote.mutate({ id: note.id, data: { title, content, color, pinned } }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
          qc.invalidateQueries({ queryKey: getGetNoteQueryKey(note.id) });
          onClose();
          toast.success("Note saved");
        }
      });
    } else {
      createNote.mutate({ data: { title, content, color, pinned } }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
          onClose();
          toast.success("Note created");
        }
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{note ? "Edit Note" : "New Note"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Title</Label>
            <Input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Note title..."
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Content</Label>
            <textarea
              value={content} onChange={e => setContent(e.target.value)}
              placeholder="Write your note..."
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary min-h-[200px] resize-none"
            />
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2">
              {NOTE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-all",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox" checked={pinned}
              onChange={e => setPinned(e.target.checked)}
              className="rounded"
            />
            Pin this note
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || createNote.isPending || updateNote.isPending}>
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function NotesPage() {
  const [search, setSearch] = useState("");
  const [editNote, setEditNote] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: notes, isLoading } = useListNotes();

  const filtered = Array.isArray(notes) ? notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const pinned = filtered?.filter(n => n.pinned) ?? [];
  const others = filtered?.filter(n => !n.pinned) ?? [];

  function openCreate() {
    setEditNote(null);
    setModalOpen(true);
  }

  function openEdit(note: any) {
    setEditNote(note);
    setModalOpen(true);
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Notes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Capture insights from your chats and modules</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New Note
          </Button>
        </div>

        <div className="relative max-w-sm mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="break-inside-avoid rounded-xl border border-border bg-card p-4 space-y-2 mb-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : !Array.isArray(filtered) || filtered.length === 0 ? (
          <EmptyState
            icon={<StickyNote className="h-6 w-6" />}
            title="No notes yet"
            description="Capture insights from your conversations and modules"
            action={{ label: "Create Note", onClick: openCreate }}
          />
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pinned</h2>
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                  {pinned.map(n => (
                    <div key={n.id} className="break-inside-avoid mb-4">
                      <NoteCard note={n} onClick={() => openEdit(n)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">All Notes</h2>
                )}
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                  {others.map(n => (
                    <div key={n.id} className="break-inside-avoid mb-4">
                      <NoteCard note={n} onClick={() => openEdit(n)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <NoteModal
        note={editNote}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditNote(null); }}
      />
    </AppLayout>
  );
}
