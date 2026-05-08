import React, { useState } from "react";
import { useApp } from "benchrex/context/BenchrexContext";
import { Button } from "benchrex/components/ui/button";
import { X, MessageSquare, Pin, Trash2, PinOff, Plus, Search, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "benchrex/components/ui/scroll-area";
import { cn } from "benchrex/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "benchrex/components/ui/alert-dialog";
import type { Conversation } from "benchrex/types";

interface HistorySidebarProps {
  onClose: () => void;
}

const HistorySidebar = ({ onClose }: HistorySidebarProps) => {
  const {
    conversations, activeConversationId, setActiveConversation, user,
    togglePinConversation, deleteConversation, markAsRead,
    students, selectedStudentId, setSelectedStudentId
  } = useApp();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarMode, setSidebarMode] = useState<'chats' | 'students'>('chats');

  const isExpert = user?.role === 'doubt_expert' || user?.role === 'super_admin' || user?.role === 'faculty';

  const filteredConvs = conversations
    .filter((c) => {
      // If we've selected a student, only show their conversations
      if (isExpert && selectedStudentId) {
        return c.userId === selectedStudentId;
      }
      // Otherwise show based on role
      return isExpert ? (c.userId === user?.id || c.isExpertSession) : (c.userId === user?.id);
    })
    .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const pinned = filteredConvs.filter((c) => c.pinned);
  const others = filteredConvs.filter((c) => !c.pinned);

  // Group non-pinned by date
  const grouped: Record<string, Conversation[]> = {};
  others.forEach((c) => {
    const date = new Date(c.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(c);
  });

  const renderItem = (c: Conversation) => (
    <motion.div
      key={c.id}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group relative flex w-full items-center gap-2 rounded-xl px-3 py-2.5 transition-all mb-1 ${
        activeConversationId === c.id
          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
          : "text-foreground/70 hover:bg-muted/50"
      }`}
    >
      <button
        onClick={() => {
          setActiveConversation(c.id);
          const role = (user?.role === 'doubt_expert' || user?.role === 'super_admin' || user?.role === 'faculty') ? 'expert' : 'user';
          markAsRead(c.id, role);
        }}
        className="flex flex-1 items-center gap-3 text-left text-sm min-w-0 group-hover:pr-2 transition-all"
      >
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
          activeConversationId === c.id ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-muted"
        }`}>
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="block truncate font-bold text-[13px]">{c.title || "Untitled Chat"}</span>
            {c.pinned && <Pin className="h-2.5 w-2.5 text-primary shrink-0 fill-primary/20" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="block text-[10px] opacity-60 font-medium">
              {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isExpert && c.userName && c.userId !== user?.id && (
              <span className="text-[9px] font-black uppercase tracking-wider text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded-md">
                {c.userName}
              </span>
            )}
          </div>
        </div>
        {(((user?.role === 'doubt_expert' || user?.role === 'super_admin' || user?.role === 'faculty') ? c.expertHasUnread : c.userHasUnread)) && (
          <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] shrink-0 animate-pulse" />
        )}
      </button>

      <div className={cn(
        "flex items-center gap-0.5 transition-all duration-200 shrink-0",
        activeConversationId === c.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 w-0 group-hover:w-auto overflow-hidden"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-md transition-colors ${c.pinned ? "text-primary bg-primary/10" : "hover:bg-primary/10 hover:text-primary"}`}
          onClick={(e) => {
            e.stopPropagation();
            togglePinConversation(c.id);
          }}
          title={c.pinned ? "Unpin" : "Pin"}
        >
          {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setPendingDelete(c.id);
          }}
          title="Delete Chat"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-xl border-r border-border/50">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-bold tracking-tight uppercase">
              {sidebarMode === 'chats' ? (selectedStudentId ? 'Student History' : 'Recent Chats') : 'Students'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full md:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isExpert && (
          <div className="flex p-1 mb-4 bg-muted/50 rounded-xl">
            <button
              onClick={() => {
                setSidebarMode('chats');
                setSelectedStudentId(null);
              }}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                sidebarMode === 'chats' && !selectedStudentId ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Chats
            </button>
            <button
              onClick={() => setSidebarMode('students')}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                sidebarMode === 'students' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Students
            </button>
          </div>
        )}

        {selectedStudentId ? (
          <Button
            variant="outline"
            onClick={() => setSelectedStudentId(null)}
            className="w-full justify-start gap-3 rounded-xl mb-4 border-dashed"
          >
            <X className="h-4 w-4" />
            <span className="font-bold text-xs uppercase tracking-widest">Clear Filter</span>
          </Button>
        ) : (
          <Button
            onClick={() => setActiveConversation(null)}
            className="w-full justify-start gap-3 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all h-10"
          >
            <Plus className="h-4 w-4" />
            <span className="font-bold text-xs uppercase tracking-widest">New Session</span>
          </Button>
        )}

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={sidebarMode === 'chats' ? "Search history..." : "Search students..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/50 border-none rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-primary/30 transition-all font-medium"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-6">
          {sidebarMode === 'students' ? (
            <div className="space-y-1">
              {students
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(student => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setSidebarMode('chats');
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all ${
                      selectedStudentId === student.id ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10 text-xs font-black uppercase">
                      {student.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-xs truncate">{student.name}</p>
                      <p className="text-[10px] opacity-50 truncate">{student.email}</p>
                      <div className="flex gap-1 mt-1">
                        <span className="px-1.5 py-0.5 rounded-md bg-muted text-[8px] font-black uppercase">{student.course?.name || 'General'}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-muted text-[8px] font-black uppercase">{student.batch?.name || 'Default'}</span>
                      </div>
                    </div>
                  </button>
                ))}
              {students.length === 0 && (
                <div className="py-20 text-center opacity-30">
                  <Plus className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No students found</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="pb-4 mb-4 border-b border-border/30">
                  <p className="px-2 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <Pin className="h-3 w-3 fill-primary/20" />
                    Pinned Conversations
                  </p>
                  <div className="space-y-1">{pinned.map(renderItem)}</div>
                </div>
              )}

              {filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No chats found</p>
                </div>
              ) : (
                Object.entries(grouped).map(([date, convs]) => (
                  <div key={date}>
                    <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                      📅 {date}
                    </p>
                    <div className="space-y-1">{convs.map(renderItem)}</div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border/50 bg-muted/20">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
           <span>{sidebarMode === 'chats' ? `Total: ${filteredConvs.length} Chats` : `Total: ${students.length} Students`}</span>
           <span>v1.0.5</span>
        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-border/50" aria-describedby="delete-conv-description">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription id="delete-conv-description" className="text-sm">
              This will permanently delete this chat thread and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteConversation(pendingDelete);
                setPendingDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-6"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistorySidebar;
