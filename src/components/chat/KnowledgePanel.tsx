import React, { useState, useMemo } from "react";
import { useApp } from "benchrex/context/BenchrexContext";
import { Button } from "benchrex/components/ui/button";
import { X, FileText, FileCode, ChevronLeft, Download, ExternalLink, Search, Globe, BookOpen, Layers, Folder, Save, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "benchrex/components/ui/badge";
import { Input } from "benchrex/components/ui/input";
import type { Message, Attachment, WebSearchResult, Source } from "benchrex/types";
import { supabase } from "@/lib/supabase";
import { cn } from "benchrex/lib/utils";

interface KnowledgePanelProps {
  onClose: () => void;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: "markdown" | "pdf" | "web" | "source";
  timestamp: number;
  url?: string;
  size?: number;
  source?: string;
}

const KnowledgePanel = ({ onClose }: KnowledgePanelProps) => {
  const { conversations, activeConversationId } = useApp();
  const [activeTab, setActiveTab] = useState<"retrieved" | "browse">("retrieved");
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Hierarchy State for Browse mode
  const [browsePath, setBrowsePath] = useState<{id: string, name: string, type: string}[]>([]);
  const [browseLevel, setBrowseLevel] = useState<"courses" | "subjects" | "folders" | "files">("courses");
  const [browseItems, setBrowseItems] = useState<any[]>([]);
  const [loadingBrowse, setLoadingBrowse] = useState(false);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // ─── Retrieved Items logic ───────────────────────────────────────────────
  const retrievedItems = useMemo(() => {
    if (!activeConv) return [];
    
    const extracted: KnowledgeItem[] = [];
    activeConv.messages.forEach((msg: Message) => {
      if (msg.attachments) {
        msg.attachments.forEach((a: Attachment) => {
          if (a.type === "pdf") {
            extracted.push({
              id: a.id, title: a.name, content: "", url: a.url, type: "pdf",
              timestamp: msg.timestamp, source: "User Upload", size: a.size
            });
          }
        });
      }
      if (msg.webSearch && msg.webSearch.results) {
        msg.webSearch.results.forEach((res: WebSearchResult, i: number) => {
          extracted.push({
            id: `web-${msg.id}-${i}`, title: res.title, content: res.description, url: res.url,
            type: "web", timestamp: msg.timestamp, source: "Web Search"
          });
        });
      }
      if (msg.sources) {
        msg.sources.forEach((src: Source) => {
          extracted.push({
            id: `src-${src.chunk_id}`, title: `${src.subject}: ${src.chapter}`,
            content: src.content || "", type: "source", timestamp: msg.timestamp, source: "Curriculum Bank"
          });
        });
      }
    });
    return extracted.sort((a, b) => b.timestamp - a.timestamp);
  }, [activeConv]);

  // ─── Browse Logic ────────────────────────────────────────────────────────
  const fetchBrowseItems = async () => {
    setLoadingBrowse(true);
    try {
      const profile = JSON.parse(localStorage.getItem('admin_profile') || localStorage.getItem('user_profile') || '{}');
      const teamId = profile.team_id;
      if (!teamId) return;

      const last = browsePath[browsePath.length - 1];
      
      if (!last) {
        // Fetch Courses
        const { data } = await supabase.from('courses').select('id, name').eq('team_id', teamId).order('name');
        setBrowseItems(data?.map((i: any) => ({...i, type: 'course'})) || []);
        setBrowseLevel("courses");
      } else if (last.type === 'course') {
        // Fetch Subjects
        const { data } = await supabase.from('subjects').select('id, name').eq('course_id', last.id).eq('team_id', teamId).order('name');
        setBrowseItems(data?.map((i: any) => ({...i, type: 'subject'})) || []);
        setBrowseLevel("subjects");
      } else if (last.type === 'subject') {
        // Fetch Folders
        const { data } = await supabase.from('folders').select('id, name').eq('subject_id', last.id).is('parent_id', null).eq('team_id', teamId).order('sort_order');
        setBrowseItems(data?.map((i: any) => ({...i, type: 'folder'})) || []);
        setBrowseLevel("folders");
      } else if (last.type === 'folder') {
        // Fetch Subfolders and Files
        const [fRes, subRes] = await Promise.all([
          supabase.from('files').select('*').eq('folder_id', last.id).eq('team_id', teamId).order('name'),
          supabase.from('folders').select('*').eq('parent_id', last.id).eq('team_id', teamId).order('sort_order')
        ]);
        const combined = [
          ...(subRes.data?.map((i: any) => ({...i, type: 'folder'})) || []),
          ...(fRes.data?.map((i: any) => ({...i, type: 'file'})) || [])
        ];
        setBrowseItems(combined);
        setBrowseLevel("files");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBrowse(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'browse') fetchBrowseItems();
  }, [browsePath, activeTab]);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = useMemo(() => {
    return !!localStorage.getItem('admin_profile');
  }, []);

  const handleEditToggle = () => {
    if (!isEditing && selectedItem) {
      setEditContent(selectedItem.content);
    }
    setIsEditing(!isEditing);
  };

  const saveContent = async () => {
    if (!selectedItem || !selectedItem.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        
        .from('files')
        .update({ body: editContent })
        .eq('id', selectedItem.id);

      if (error) throw error;
      
      // Update local state
      setSelectedItem({ ...selectedItem, content: editContent });
      setIsEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrowseClick = (item: any) => {
    if (item.type === 'file') {
      setSelectedItem({
        id: item.id,
        title: item.name,
        content: item.body || "",
        type: "markdown",
        timestamp: Date.now(),
        source: "Curriculum Bank"
      });
      setEditContent(item.body || "");
    } else {
      setBrowsePath(prev => [...prev, { id: item.id, name: item.name, type: item.type }]);
    }
  };

  const goBack = () => {
    if (isEditing) setIsEditing(false);
    else if (selectedItem) setSelectedItem(null);
    else if (browsePath.length > 0) setBrowsePath(prev => prev.slice(0, -1));
  };

  const filteredRetrieved = retrievedItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.source && item.source.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-card">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2">
          {(selectedItem || browsePath.length > 0) ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <BookOpen className="h-4 w-4 text-primary" />
          )}
          <h2 className="font-semibold text-sm text-foreground">
            {selectedItem ? (isEditing ? "Editing Source" : "Preview") : activeTab === 'browse' ? "Browse Curriculum" : "Knowledge Base"}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {selectedItem && selectedItem.type !== 'pdf' && isAdmin && (
            <Button 
              variant={isEditing ? "default" : "ghost"} 
              size="sm" 
              className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-wider"
              onClick={isEditing ? saveContent : handleEditToggle}
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                isEditing ? <Save className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />
              )}
              {isEditing ? "Save Changes" : "Edit"}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      {!selectedItem && (
        <div className="flex border-b border-border px-4 bg-muted/10">
          <button 
            onClick={() => setActiveTab("retrieved")}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
              activeTab === "retrieved" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            Retrieved
          </button>
          <button 
            onClick={() => setActiveTab("browse")}
            className={cn(
              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
              activeTab === "browse" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            Browse All
          </button>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!selectedItem ? (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto p-4"
            >
              {activeTab === "retrieved" ? (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search retrieved sources..." 
                      className="pl-9 bg-muted/50 border-none h-9 text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {filteredRetrieved.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
                      <Search className="h-10 w-10 mb-2 opacity-20" />
                      <p className="text-sm">No references found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredRetrieved.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className="group cursor-pointer rounded-xl border border-border bg-card p-3 hover:bg-muted/50 hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              item.type === "pdf" ? "bg-red-500/10 text-red-500" : 
                              item.type === "web" ? "bg-green-500/10 text-green-500" :
                              "bg-primary/10 text-primary"
                            )}>
                              {item.type === "pdf" ? <FileText className="h-4 w-4" /> : 
                               item.type === "web" ? <Globe className="h-4 w-4" /> :
                               <FileCode className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-bold leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                {item.title}
                              </h3>
                              <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                                <span>{item.source}</span>
                                <span>•</span>
                                <span>{new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {/* Breadcrumbs for Browse */}
                  {browsePath.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 mb-2 border-b border-border/50">
                      <button onClick={() => setBrowsePath([])} className="text-[9px] font-black uppercase tracking-widest text-primary shrink-0">Root</button>
                      {browsePath.map((p, i) => (
                        <React.Fragment key={p.id}>
                          <ChevronLeft className="h-2 w-2 rotate-180 shrink-0 text-muted-foreground" />
                          <button 
                            onClick={() => setBrowsePath(browsePath.slice(0, i + 1))}
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest truncate max-w-[80px]",
                              i === browsePath.length - 1 ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {p.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {loadingBrowse ? (
                    <div className="space-y-2 py-4">
                      {[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />)}
                    </div>
                  ) : browseItems.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                      Empty Section
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {browseItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleBrowseClick(item)}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-primary/5 hover:border-primary/30 text-left transition-all group"
                        >
                          <div className={cn(
                            "h-8 w-8 flex items-center justify-center rounded-lg shrink-0",
                            item.type === 'course' ? "bg-indigo-500/10 text-indigo-500" :
                            item.type === 'subject' ? "bg-blue-500/10 text-blue-500" :
                            item.type === 'folder' ? "bg-emerald-500/10 text-emerald-500" :
                            "bg-primary/10 text-primary"
                          )}>
                            {item.type === 'course' ? <BookOpen className="h-4 w-4" /> :
                             item.type === 'subject' ? <Layers className="h-4 w-4" /> :
                             item.type === 'folder' ? <Folder className="h-4 w-4" /> :
                             <FileText className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-black uppercase tracking-tight block truncate group-hover:text-primary transition-colors">
                              {item.name}
                            </span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                              {item.type}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {selectedItem.type === "pdf" ? (
                <div className="flex flex-1 flex-col p-6 items-center justify-center text-center">
                  <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8" />
                  </div>
                  <h3 className="text-sm font-bold mb-1">{selectedItem.title}</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-6">PDF Document</p>
                  <Button className="w-full gap-2 rounded-xl h-12" asChild>
                    <a href={selectedItem.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" /> View Full PDF
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {isEditing ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Overleaf-style Split Editor */}
                      <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Editor Pane */}
                        <div className="h-1/2 border-b border-border relative">
                          <textarea
                            className="w-full h-full p-4 bg-muted/30 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 leading-relaxed"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Write markdown here..."
                            spellCheck={false}
                          />
                          <div className="absolute top-2 right-4 text-[8px] font-black uppercase text-muted-foreground bg-background/50 px-1 rounded">Editor</div>
                        </div>
                        {/* Preview Pane */}
                        <div className="h-1/2 overflow-y-auto p-4 bg-card relative">
                          <div className="max-w-none ai-markdown prose prose-sm dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {editContent}
                            </ReactMarkdown>
                          </div>
                          <div className="absolute top-2 right-4 text-[8px] font-black uppercase text-muted-foreground bg-background/50 px-1 rounded">Preview</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="mb-6">
                        <Badge variant="outline" className="mb-2 text-[8px] font-black uppercase tracking-[0.2em]">{selectedItem.source}</Badge>
                        <h1 className="text-lg font-black text-foreground leading-tight uppercase tracking-tight">{selectedItem.title}</h1>
                      </div>
                      <div className="max-w-none ai-markdown prose prose-sm dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedItem.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KnowledgePanel;
