import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useGetAIModels,
  useUpdateAIModel,
  useGetAIServices,
  useUpdateAIServiceModel,
  useGetAILogs,
  useClearAILogs,
  useGetAdminStats,
  useGetAdminUsers,
  useUpdateUserCredits,
  useGetAdminModules
} from "@/lib/api-client-react";
import { supabase } from "@/lib/api-client-react";
import {
  Shield, Cpu, Activity, Terminal, Users, Settings2, AlertCircle,
  CheckCircle2, Clock, Coins, Search, Trash2, RefreshCw, Play, Copy,
  Plus, Minus, Info, ArrowUpRight, Sliders, Database, Sparkles,
  TrendingUp, BarChart2, BookOpen, Globe, FileText, ArrowLeft, Loader2,
  Check, AlertTriangle, XCircle, Layers, SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { cn } from "@/lib/utils";
import { getCacheTelemetry, flushCache, cacheDel } from "@/lib/redis-cache";
import type { CacheTelemetry } from "@/lib/redis-cache";

type TabType = "overview" | "gateway" | "logs" | "services" | "users" | "modules" | "cache";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [filterLogService, setFilterLogService] = useState("all");
  const [filterLogStatus, setFilterLogStatus] = useState("all");
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [triggeringSourceId, setTriggeringSourceId] = useState<number | null>(null);
  const [deIngestingSourceId, setDeIngestingSourceId] = useState<number | null>(null);
  const [deIngestingModuleId, setDeIngestingModuleId] = useState<number | null>(null);
  const [ingestingAllModuleId, setIngestingAllModuleId] = useState<number | null>(null);
  const [searchModuleQuery, setSearchModuleQuery] = useState("");
  const [cacheData, setCacheData] = useState<CacheTelemetry | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [flushingCache, setFlushingCache] = useState(false);
  const [searchKeyQuery, setSearchKeyQuery] = useState("");
  // Chunk config state
  const [chunkTargetTokens, setChunkTargetTokens] = useState(500);
  const [chunkOverlapTokens, setChunkOverlapTokens] = useState(100);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Record<number, number[]>>({});
  const [triggeringIngestion, setTriggeringIngestion] = useState<Record<number, boolean>>({});
  // Live chunk counts: moduleId -> chunkCount
  const [chunkCounts, setChunkCounts] = useState<Record<number, number>>({});
  // Live polling for processing status
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCacheTelemetry = async () => {
    setCacheLoading(true);
    const data = await getCacheTelemetry();
    setCacheData(data);
    setCacheLoading(false);
  };

  // Fetch chunk counts from Supabase for all modules
  const fetchChunkCounts = async (modules: any[]) => {
    if (!modules || modules.length === 0) return;
    try {
      const counts: Record<number, number> = {};
      await Promise.all(modules.map(async (mod: any) => {
        const { count } = await supabase
          .from("module_chunks")
          .select("id", { count: "exact", head: true })
          .eq("module_id", mod.id);
        counts[mod.id] = count ?? 0;
      }));
      setChunkCounts(counts);
    } catch { /* non-fatal */ }
  };

  // Determine if any ingestion is actively processing
  const hasActiveIngestion = (modules: any[]): boolean => {
    return modules.some((mod: any) =>
      (mod.sources || []).some((s: any) => s.ingestionStatus === "processing") ||
      (mod.contents || []).some((t: any) => t.indexingStatus === "processing")
    );
  };

  // Start/stop polling based on active ingestion
  useEffect(() => {
    if (activeTab !== "modules") {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    const runPoll = async () => {
      const result = await refetchModules();
      const mods = (result.data as any[]) || [];
      await fetchChunkCounts(mods);
      if (hasActiveIngestion(mods)) {
        if (!pollingRef.current) {
          pollingRef.current = setInterval(async () => {
            const r = await refetchModules();
            const ms = (r.data as any[]) || [];
            await fetchChunkCounts(ms);
            if (!hasActiveIngestion(ms)) {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
            }
          }, 3000);
        }
      }
    };
    runPoll();
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "cache") fetchCacheTelemetry();
    if (activeTab === "modules") loadChunkConfig();
  }, [activeTab]);

  const loadChunkConfig = async () => {
    setConfigLoading(true);
    try {
      const { data } = await supabase.from("ingestion_config").select("key, value");
      if (data) {
        const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
        if (map["chunk_target_tokens"]) setChunkTargetTokens(parseInt(map["chunk_target_tokens"], 10));
        if (map["chunk_overlap_tokens"]) setChunkOverlapTokens(parseInt(map["chunk_overlap_tokens"], 10));
      }
    } catch { /* non-fatal */ }
    setConfigLoading(false);
  };

  const saveChunkConfig = async () => {
    setConfigSaving(true);
    try {
      await supabase.from("ingestion_config").upsert([
        { key: "chunk_target_tokens", value: String(chunkTargetTokens) },
        { key: "chunk_overlap_tokens", value: String(chunkOverlapTokens) },
      ]);
      toast.success("Chunk config saved.");
    } catch {
      toast.error("Failed to save config.");
    }
    setConfigSaving(false);
  };

  const handleFlushCache = async () => {
    if (!confirm("Are you sure you want to completely flush the cache? This will clear all cached session profiles, module list caches, and chapter metadata.")) return;
    setFlushingCache(true);
    const success = await flushCache();
    setFlushingCache(false);
    if (success) {
      toast.success("Cache cleared successfully!");
      fetchCacheTelemetry();
    } else {
      toast.error("Failed to clear cache.");
    }
  };

  const handleDeleteKey = async (key: string) => {
    await cacheDel(key);
    toast.success(`Deleted key: ${key}`);
    fetchCacheTelemetry();
  };

  const getRedisInfoValue = (infoStr: string | null, keyName: string): string => {
    if (!infoStr) return "";
    const lines = infoStr.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${keyName}:`)) {
        return trimmed.split(":")[1].trim();
      }
    }
    return "";
  };

  const parseRedisInfo = (infoStr: string | null) => {
    if (!infoStr) return [];
    const sections: { title: string; items: { key: string; value: string }[] }[] = [];
    let currentSection: { title: string; items: { key: string; value: string }[] } | null = null;
    
    infoStr.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      if (trimmed.startsWith("#")) {
        const title = trimmed.replace("#", "").trim();
        currentSection = { title, items: [] };
        sections.push(currentSection);
      } else if (currentSection && !trimmed.startsWith("#")) {
        const parts = trimmed.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(":").trim();
          currentSection.items.push({ key, value });
        }
      }
    });
    
    return sections;
  };

  const queryClient = useQueryClient();
  
  const { data: models = [], isLoading: modelsLoading } = useGetAIModels();
  const { data: services = [], isLoading: servicesLoading } = useGetAIServices();
  const { data: logs = [], isLoading: logsLoading } = useGetAILogs();
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: adminUsers = [], isLoading: usersLoading } = useGetAdminUsers();
  const { data: adminModules = [], isLoading: modulesLoading, refetch: refetchModules } = useGetAdminModules();
  
  const updateModel = useUpdateAIModel();
  const updateService = useUpdateAIServiceModel();
  const clearLogs = useClearAILogs();
  const updateUserCredits = useUpdateUserCredits();



  const handleClearLogs = () => {
    if (confirm("Are you sure you want to clear all gateway logs? This will reset your analytics dashboard.")) {
      clearLogs.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getAILogs"] });
          queryClient.invalidateQueries({ queryKey: ["getAdminStats"] });
          setSelectedLogId(null);
          toast.success("Gateway logs cleared successfully.");
        }
      });
    }
  };

  const handleUpdateModelStatus = (modelId: string, status: "active" | "fallback" | "inactive") => {
    // If setting active, set other active models to inactive
    if (status === "active") {
      const activeModel = models.find((m: any) => m.status === "active");
      if (activeModel) {
        updateModel.mutate({ id: activeModel.id, data: { status: "inactive" } });
      }
    }
    // If setting fallback, set other fallback models to inactive
    if (status === "fallback") {
      const fallbackModel = models.find((m: any) => m.status === "fallback");
      if (fallbackModel) {
        updateModel.mutate({ id: fallbackModel.id, data: { status: "inactive" } });
      }
    }

    updateModel.mutate(
      { id: modelId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getAIModels"] });
          toast.success(`Model status updated to ${status}`);
        }
      }
    );
  };

  const handleUpdateModelParams = (modelId: string, params: any) => {
    updateModel.mutate(
      { id: modelId, data: params },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getAIModels"] });
          toast.success("Model parameters saved successfully");
        }
      }
    );
  };

  const handleUpdateService = (serviceId: string, activeModelId: string) => {
    updateService.mutate(
      { id: serviceId, activeModelId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getAIServices"] });
          toast.success("Service routing updated successfully");
        }
      }
    );
  };

  const handleAdjustCredits = (userId: number, currentCredits: number, amount: number) => {
    const nextCredits = Math.max(0, currentCredits + amount);
    updateUserCredits.mutate(
      { userId, credits: nextCredits },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getAdminUsers"] });
          queryClient.invalidateQueries({ queryKey: ["getMe"] });
          toast.success(`User credits updated to ${nextCredits}`);
        }
      }
    );
  };

  const handleTriggerIngestion = async (source: any, moduleId: number) => {
    setTriggeringSourceId(source.id);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: source.id,
          moduleId: moduleId,
          type: source.type,
          name: source.name,
          content: source.content || undefined,
          url: source.url || undefined,
          storagePath: source.storageKey || undefined
        })
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        toast.success(`Ingestion triggered for: ${source.name}`);
      } else {
        toast.warning(`Ingestion notice: ${resJson.error || "triggered successfully"}`);
      }
      refetchModules();
    } catch (err: any) {
      toast.error(`Failed to trigger ingestion: ${err.message || err}`);
    } finally {
      setTriggeringSourceId(null);
    }
  };

  const handleToggleTopic = (moduleId: number, topicId: number) => {
    setSelectedTopics(prev => {
      const current = prev[moduleId] || [];
      const updated = current.includes(topicId)
        ? current.filter(id => id !== topicId)
        : [...current, topicId];
      return { ...prev, [moduleId]: updated };
    });
  };

  const handleIngestContent = async (moduleId: number) => {
    const topicIds = selectedTopics[moduleId] || [];
    setTriggeringIngestion(prev => ({ ...prev, [moduleId]: true }));
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ingest_content",
          moduleId,
          topicIds: topicIds.length > 0 ? topicIds : undefined,
        })
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        const label = topicIds.length > 0
          ? `Indexing ${topicIds.length} section(s) — live status updating below…`
          : "Indexing all unindexed sections — live status updating below…";
        toast.success(label);
        setSelectedTopics(prev => ({ ...prev, [moduleId]: [] }));
        // Kick off live polling immediately
        if (!pollingRef.current) {
          pollingRef.current = setInterval(async () => {
            const r = await refetchModules();
            const ms = (r.data as any[]) || [];
            await fetchChunkCounts(ms);
            if (!hasActiveIngestion(ms)) {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              toast.success("✅ Ingestion complete — all sections indexed.");
            }
          }, 3000);
        }
        refetchModules();
      } else {
        toast.error(`Ingestion failed: ${resJson.error || "unknown error"}`);
      }
    } catch (err: any) {
      toast.error(`Failed to trigger ingestion: ${err.message || err}`);
    } finally {
      setTriggeringIngestion(prev => ({ ...prev, [moduleId]: false }));
    }
  };

  const handleDeIngestSource = async (sourceId: number, sourceName: string) => {
    if (!confirm(`Remove embeddings for "${sourceName}"? The source record is kept but all chunks are deleted and status resets to pending.`)) return;
    setDeIngestingSourceId(sourceId);
    try {
      const res = await fetch("/api/de-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Chunks removed for: ${sourceName}`);
      } else {
        toast.error(`De-ingest failed: ${json.error}`);
      }
      refetchModules();
    } catch (err: any) {
      toast.error(`De-ingest error: ${err.message}`);
    } finally {
      setDeIngestingSourceId(null);
    }
  };

  const handleDeIngestModule = async (moduleId: number, moduleTitle: string) => {
    if (!confirm(`Remove ALL embeddings for module "${moduleTitle}"? All chunk data will be deleted and all sources reset to pending.`)) return;
    setDeIngestingModuleId(moduleId);
    try {
      const res = await fetch("/api/de-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`All embeddings cleared for: ${moduleTitle}`);
      } else {
        toast.error(`Module de-ingest failed: ${json.error}`);
      }
      refetchModules();
    } catch (err: any) {
      toast.error(`Module de-ingest error: ${err.message}`);
    } finally {
      setDeIngestingModuleId(null);
    }
  };

  const handleIngestAll = async (mod: any) => {
    const pending = (mod.sources || []).filter((s: any) => s.ingestionStatus !== "processing");
    if (pending.length === 0) { toast.info("All sources already processing or none available."); return; }
    setIngestingAllModuleId(mod.id);
    try {
      for (const src of pending) {
        await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceId: src.id,
            moduleId: mod.id,
            type: src.type,
            name: src.name,
            content: src.content || undefined,
            url: src.url || undefined,
            storagePath: src.storageKey || undefined,
          }),
        });
      }
      toast.success(`Ingestion triggered for ${pending.length} source(s) in "${mod.title}"`);
      refetchModules();
    } catch (err: any) {
      toast.error(`Batch ingestion error: ${err.message}`);
    } finally {
      setIngestingAllModuleId(null);
    }
  };

  // Generate 7-day request trend from log dates
  const getRequestTrendData = () => {
    const trend: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const dateStr = new Date(Date.now() - i * 86400000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
      });
      trend[dateStr] = 0;
    }
    
    logs.forEach((l: any) => {
      const dateStr = new Date(l.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
      });
      if (trend[dateStr] !== undefined) {
        trend[dateStr]++;
      }
    });

    return Object.keys(trend).map(date => ({
      date,
      Requests: trend[date]
    }));
  };

  // Filtering logs
  const filteredLogs = logs.filter((l: any) => {
    const matchesSearch =
      (l.prompt || "").toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      (l.service || "").toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      (l.modelId || "").toLowerCase().includes(searchLogQuery.toLowerCase());
    const matchesService = filterLogService === "all" || l.service === filterLogService;
    const matchesStatus = filterLogStatus === "all" || l.status === filterLogStatus;
    return matchesSearch && matchesService && matchesStatus;
  });

  // Filtering modules
  const filteredModules = adminModules.filter((m: any) => {
    return (m.title || "").toLowerCase().includes(searchModuleQuery.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(searchModuleQuery.toLowerCase()) ||
      (m.creatorEmail || "").toLowerCase().includes(searchModuleQuery.toLowerCase());
  });

  const selectedLog = logs.find((l: any) => l.id === selectedLogId);
  const selectedModel = models.find((m: any) => m.id === selectedModelId);

  // Colors for model pie chart
  const COLORS = ["#6366f1", "#a855f7", "#ec4899", "#3b82f6"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Dev Top Header Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-none flex items-center gap-2">
              OpenBALC <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">Dev Console</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-1">System Administration & AI Gateway Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/app">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Application</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Grid: Sidebar + Panel Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Menu */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/20 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3">System Control</div>
            <nav className="space-y-1">
              {[
                { id: "overview", label: "Dashboard Telemetry", icon: Activity },
                { id: "gateway", label: "AI Models Config", icon: Cpu },
                { id: "logs", label: "Gateway Audit Logs", icon: Terminal },
                { id: "services", label: "Service Routing", icon: Sliders },
                { id: "users", label: "User Accounts", icon: Users },
                { id: "modules", label: "Modules Ingestion", icon: BookOpen },
                { id: "cache", label: "Cache Telemetry", icon: Database }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left border-0 outline-none",
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-transparent"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>


        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* 1. Dashboard Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-2xl font-bold tracking-tight">Dashboard Telemetry</h2>
                  <p className="text-xs text-slate-400 mt-1">Real-time health, request volume, and debit metrics across the active backend service.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Requests</span>
                      <div className="p-2 bg-indigo-500/10 rounded-lg"><Cpu className="h-4 w-4 text-indigo-400" /></div>
                    </div>
                    <div className="text-2xl font-bold">{stats?.totalRequests ?? 0}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Across all models & services</div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Gateway Error Rate</span>
                      <div className="p-2 bg-red-500/10 rounded-lg"><AlertCircle className="h-4 w-4 text-red-400" /></div>
                    </div>
                    <div className={`text-2xl font-bold ${stats?.errorRate > 5 ? "text-red-400" : "text-emerald-400"}`}>
                      {stats?.errorRate ?? 0}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">All requests successful</div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Avg Latency</span>
                      <div className="p-2 bg-violet-500/10 rounded-lg"><Clock className="h-4 w-4 text-violet-400" /></div>
                    </div>
                    <div className="text-2xl font-bold">{stats?.avgLatency ?? 0} ms</div>
                    <div className="text-[10px] text-slate-500 mt-1">Model gateway round-trip time</div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Credits Spent</span>
                      <div className="p-2 bg-amber-500/10 rounded-lg"><Coins className="h-4 w-4 text-amber-400" /></div>
                    </div>
                    <div className="text-2xl font-bold">{stats?.creditsSpent ?? 0} cr</div>
                    <div className="text-[10px] text-slate-500 mt-1">Actual model cost totals</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  
                  {/* Requests Area Chart */}
                  <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <TrendingUp className="h-4 w-4 text-indigo-400" />
                      <h3 className="font-bold text-xs uppercase tracking-wider">Gateway Requests Volume (7 Days)</h3>
                    </div>
                    <div className="h-72 w-full">
                      {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                          No telemetry logged yet.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={getRequestTrendData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="reqVol" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tickLine={false} style={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                            <YAxis tickLine={false} allowDecimals={false} style={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                            <ChartTooltip
                              contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#fff" }}
                            />
                            <Area type="monotone" dataKey="Requests" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#reqVol)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Pie Chart Model Distribution */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="h-4 w-4 text-violet-400" />
                        <h3 className="font-bold text-xs uppercase tracking-wider">Model Requests Distribution</h3>
                      </div>
                      <div className="h-56 w-full flex items-center justify-center">
                        {Object.keys(stats?.modelStats || {}).every(k => stats.modelStats[k] === 0) ? (
                          <div className="text-slate-500 text-xs">No active data logged yet</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={Object.keys(stats?.modelStats || {}).map(key => ({
                                  name: models.find((m: any) => m.id === key)?.name || key,
                                  value: stats.modelStats[key]
                                })).filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {Object.keys(stats?.modelStats || {}).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip
                                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#fff" }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {Object.keys(stats?.modelStats || {}).map((key, idx) => (
                        <div key={key} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="font-medium text-slate-400 truncate max-w-[140px]">
                              {models.find((m: any) => m.id === key)?.name || key}
                            </span>
                          </div>
                          <span className="font-bold text-slate-200">{stats.modelStats[key]} calls</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-400 leading-relaxed">
                  <div className="flex gap-3">
                    <Database className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-slate-200 mb-1">Actual Server Operations & Logs</h4>
                      <p>
                        This Developer Console directly hooks into Supabase PostgreSQL backend datasets. 
                        Gateway statistics are aggregated from the actual <strong>messages</strong> and <strong>credit_transactions</strong> tables generated by users. 
                        Telemetry logs represent actual student chats, document parses, and system vectorizations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. AI Models Config Tab */}
            {activeTab === "gateway" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <div className="xl:col-span-2 space-y-4">
                  <div className="border-b border-slate-800 pb-3 mb-2 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Model Routing Config</h2>
                      <p className="text-xs text-slate-400 mt-1">Configure weights, latency thresholds, and parameters for active LLM providers.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modelsLoading ? (
                      <div className="text-xs text-slate-400">Loading configurations...</div>
                    ) : (
                      models.map((model: any) => (
                        <div
                          key={model.id}
                          onClick={() => setSelectedModelId(model.id)}
                          className={cn(
                            "border rounded-xl p-5 cursor-pointer hover:border-indigo-500/40 transition-colors flex flex-col justify-between h-48 bg-slate-900",
                            selectedModelId === model.id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-800"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">{model.provider}</span>
                              <span className={cn(
                                "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border",
                                model.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : model.status === "fallback"
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              )}>
                                {model.status}
                              </span>
                            </div>
                            <h4 className="font-bold text-base leading-tight text-slate-200 mb-1">{model.name}</h4>
                            <p className="text-xs text-slate-400 line-clamp-2">{model.systemInstruction}</p>
                          </div>

                          <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-3 mt-3">
                            <div className="flex items-center gap-1 text-slate-400">
                              <Coins className="h-3.5 w-3.5 text-amber-400" />
                              <span>{model.costPerRequest} cr / call</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                              <Clock className="h-3.5 w-3.5 text-indigo-400" />
                              <span>{model.latencyAvg} ms</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Panel Config Editor */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm h-fit">
                  {selectedModel ? (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between border-b border-slate-850 pb-4">
                        <div>
                          <h3 className="font-bold text-base leading-none text-slate-200 mb-1">{selectedModel.name}</h3>
                          <p className="text-xs text-slate-400">{selectedModel.provider} Config</p>
                        </div>
                        <Sparkles className="h-5 w-5 text-indigo-400" />
                      </div>

                      {/* Status select */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gateway Status</label>
                        <div className="grid grid-cols-3 gap-2">
                          {["active", "fallback", "inactive"].map(st => (
                            <button
                              key={st}
                              onClick={() => handleUpdateModelStatus(selectedModel.id, st as any)}
                              className={cn(
                                "text-xs font-bold py-2 rounded-lg capitalize border cursor-pointer",
                                selectedModel.status === st
                                  ? "bg-indigo-600/10 border-indigo-500 text-indigo-300"
                                  : "bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-500 leading-normal mt-1">
                          * Primary model processes general inquiries. Fallback activates during timeout outage scenarios.
                        </p>
                      </div>

                      {/* Params */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <label className="font-semibold text-slate-400">Temperature</label>
                            <span className="font-bold text-slate-200">{selectedModel.temperature}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={selectedModel.temperature}
                            onChange={(e) => handleUpdateModelParams(selectedModel.id, { temperature: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <label className="font-semibold text-slate-400">Max Tokens</label>
                            <span className="font-bold text-slate-200">{selectedModel.maxTokens}</span>
                          </div>
                          <input
                            type="number"
                            step="256"
                            min="256"
                            max="16384"
                            value={selectedModel.maxTokens}
                            onChange={(e) => handleUpdateModelParams(selectedModel.id, { maxTokens: parseInt(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <label className="font-semibold text-slate-400">Credits Per Call</label>
                            <span className="font-bold text-slate-200">{selectedModel.costPerRequest} credits</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={selectedModel.costPerRequest}
                            onChange={(e) => handleUpdateModelParams(selectedModel.id, { costPerRequest: parseInt(e.target.value) })}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* System Instruction */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Instruction</label>
                        <textarea
                          rows={4}
                          value={selectedModel.systemInstruction}
                          onChange={(e) => handleUpdateModelParams(selectedModel.id, { systemInstruction: e.target.value })}
                          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs leading-relaxed text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 py-20 text-slate-500">
                      <Settings2 className="h-10 w-10 text-slate-700 mb-3" />
                      <h4 className="font-semibold text-xs mb-1 text-slate-300">No Model Selected</h4>
                      <p className="text-[11px] leading-normal">Click any model from the router layout list to manage temperature, tokens, or cost structures.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Audit Logs Tab */}
            {activeTab === "logs" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-200">
                <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col min-h-[500px]">
                  
                  {/* Search and filters */}
                  <div className="flex flex-col md:flex-row gap-3 mb-6 items-center justify-between border-b border-slate-800 pb-4">
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchLogQuery}
                        onChange={(e) => setSearchLogQuery(e.target.value)}
                        placeholder="Search prompts, responses, or emails..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto justify-end">
                      <select
                        value={filterLogService}
                        onChange={(e) => setFilterLogService(e.target.value)}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="all">All Services</option>
                        <option value="Chat Assistant">Chat Assistant</option>
                      </select>

                      <select
                        value={filterLogStatus}
                        onChange={(e) => setFilterLogStatus(e.target.value)}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="success">Success</option>
                        <option value="error">Errors</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearLogs}
                        className="h-8 text-xs text-red-400 hover:text-red-300 gap-1.5 font-bold"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear Logs
                      </Button>
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div className="flex-1 overflow-x-auto">
                    {logsLoading ? (
                      <div className="text-center py-20 text-slate-500 text-xs">Loading logs...</div>
                    ) : filteredLogs.length === 0 ? (
                      <div className="text-center py-20 text-slate-500 text-xs">No matching logs found in Supabase.</div>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-850 pb-3 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                            <th className="py-2 pl-2">Status</th>
                            <th className="py-2">User</th>
                            <th className="py-2">Prompt context</th>
                            <th className="py-2 text-right">Latency</th>
                            <th className="py-2 text-right">Cost</th>
                            <th className="py-2 text-right pr-2">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {filteredLogs.map((log: any) => {
                            const isError = log.status === "error";
                            return (
                              <tr
                                key={log.id}
                                onClick={() => setSelectedLogId(log.id)}
                                className={cn(
                                  "hover:bg-slate-850/60 cursor-pointer transition-colors",
                                  selectedLogId === log.id ? "bg-indigo-600/5" : ""
                                )}
                              >
                                <td className="py-3 pl-2">
                                  {isError ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[9px]">
                                      <AlertCircle className="h-3 w-3" /> Error
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[9px]">
                                      <CheckCircle2 className="h-3 w-3" /> Success
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 truncate max-w-[130px]">
                                  <div className="font-semibold text-slate-300">{log.userDisplayName}</div>
                                  <div className="text-[10px] text-slate-500">{log.userEmail}</div>
                                </td>
                                <td className="py-3 text-slate-400 truncate max-w-[180px]">{log.prompt}</td>
                                <td className="py-3 text-right font-medium text-slate-300">{log.latency} ms</td>
                                <td className="py-3 text-right font-medium text-slate-300">{log.cost} cr</td>
                                <td className="py-3 text-right text-slate-500 pr-2">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right Panel Log Details */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                  {selectedLog ? (
                    <div className="space-y-6">
                      <div className="flex items-start justify-between border-b border-slate-850 pb-4">
                        <div>
                          <span className="text-[10px] text-slate-500">Call Log Detail (ID: {selectedLog.id})</span>
                          <h3 className="font-bold text-base mt-0.5 text-slate-200">{selectedLog.service}</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-200"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                            toast.success("Log JSON copied to clipboard");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Prompt */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prompt Payload</label>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs leading-relaxed max-h-32 overflow-y-auto break-words font-mono text-slate-300">
                          {selectedLog.prompt}
                        </div>
                      </div>

                      {/* Response */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {selectedLog.status === "error" ? "Error Message" : "Model Output Response"}
                        </label>
                        {selectedLog.status === "error" ? (
                          <div className="bg-red-950/20 text-red-400 p-3 rounded-lg border border-red-900/30 text-xs leading-relaxed max-h-48 overflow-y-auto font-mono">
                            {selectedLog.response}
                          </div>
                        ) : (
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs leading-relaxed max-h-48 overflow-y-auto break-words text-slate-300">
                            {selectedLog.response}
                          </div>
                        )}
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-4 text-xs">
                        <div>
                          <span className="text-slate-500 block">Latency:</span>
                          <span className="font-bold text-slate-350">{selectedLog.latency} ms</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Model Assigned:</span>
                          <span className="font-bold text-slate-350">{selectedLog.modelId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Tokens:</span>
                          <span className="font-bold text-slate-350">{selectedLog.tokensUsed || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Cost:</span>
                          <span className="font-bold text-slate-350">{selectedLog.cost || 0} cr</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 py-20 text-slate-500">
                      <Terminal className="h-10 w-10 text-slate-700 mb-3" />
                      <h4 className="font-semibold text-xs mb-1 text-slate-300">No Log Selected</h4>
                      <p className="text-[11px] leading-normal">Click any call log row in the history table to audit payloads, model routing parameters, or debited transaction tokens.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Service Mapping Tab */}
            {activeTab === "services" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-2xl font-bold tracking-tight">Service Mapping</h2>
                  <p className="text-xs text-slate-400 mt-1">Bind frontend services to customized gateway routing models.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {servicesLoading ? (
                    <div className="text-xs text-slate-400">Loading services...</div>
                  ) : (
                    services.map((service: any) => (
                      <div key={service.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between h-60">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                              <Sliders className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded bg-slate-850 border border-slate-800 text-slate-400 font-bold font-mono">
                              {service.id}
                            </span>
                          </div>
                          
                          <h4 className="font-bold text-base text-slate-200 mb-1">{service.name}</h4>
                          <p className="text-xs text-slate-400 leading-normal mb-4">{service.description}</p>
                        </div>

                        <div className="space-y-2 border-t border-slate-850 pt-4">
                          <div className="flex justify-between text-xs items-center">
                            <span className="font-medium text-slate-400">Model Route:</span>
                            <select
                              value={service.activeModelId}
                              onChange={(e) => handleUpdateService(service.id, e.target.value)}
                              className="px-2 py-1 bg-slate-950 border border-slate-800 text-slate-350 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                            >
                              {models.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. User Accounts Tab */}
            {activeTab === "users" && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm animate-in fade-in duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-200">User Account Credits & Analytics</h2>
                    <p className="text-xs text-slate-400 mt-1">Audit active user credit transactions and adjust balance allocations manually.</p>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-850 px-3 py-1 rounded-full border border-slate-800">{adminUsers.length} Users Found</span>
                </div>

                <div className="overflow-x-auto">
                  {usersLoading ? (
                    <div className="text-center py-20 text-slate-500 text-xs">Loading user list...</div>
                  ) : (
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 pb-2 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                          <th className="py-2 pl-2">User Details</th>
                          <th className="py-2">Email</th>
                          <th className="py-2">System Role</th>
                          <th className="py-2 text-center">AI Requests Made</th>
                          <th className="py-2 text-center">Active Credit Balance</th>
                          <th className="py-2 text-right pr-2">Credits Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {adminUsers.map((user: any) => (
                          <tr key={user.id} className="hover:bg-slate-850/30 transition-colors">
                            <td className="py-4 pl-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                                  {user.displayName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-350">{user.displayName}</p>
                                  <p className="text-[10px] text-slate-500">@{user.username}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-slate-400">{user.email}</td>
                            <td className="py-4">
                              <span className={cn(
                                "text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase border",
                                user.role === "admin"
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              )}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-4 text-center font-medium text-slate-300">{user.totalRequests}</td>
                            <td className="py-4 text-center">
                              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold">
                                <Coins className="h-3.5 w-3.5" />
                                {user.credits} cr
                              </div>
                            </td>
                            <td className="py-4 text-right pr-2">
                              <div className="flex justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg border-slate-700 text-slate-350 hover:bg-slate-800"
                                  onClick={() => handleAdjustCredits(user.id, user.credits, -25)}
                                  title="Deduct 25 credits"
                                >
                                  <Minus className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg border-slate-700 text-slate-350 hover:bg-slate-800"
                                  onClick={() => handleAdjustCredits(user.id, user.credits, 25)}
                                  title="Add 25 credits"
                                >
                                  <Plus className="h-3.5 w-3.5 text-slate-400" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* 6. Modules Ingestion Tab */}
            {activeTab === "modules" && (() => {
              // Compute live ingestion status across all modules
              const allProcessingSources = adminModules.flatMap((m: any) =>
                (m.sources || []).filter((s: any) => s.ingestionStatus === "processing")
              );
              const allProcessingTopics = adminModules.flatMap((m: any) =>
                (m.contents || []).filter((t: any) => t.indexingStatus === "processing")
              );
              const allFailedTopics = adminModules.flatMap((m: any) =>
                (m.contents || []).filter((t: any) => t.indexingStatus === "failed")
              );
              const isLivePolling = !!pollingRef.current;
              return (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Modules & Ingestion Control</h2>
                    <p className="text-xs text-slate-400 mt-1">Manage embeddings — ingest or remove chunks from the vector database per module or per source.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => { const r = await refetchModules(); await fetchChunkCounts((r.data as any[]) || []); }}
                      className="h-8 text-xs border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", modulesLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchModuleQuery}
                        onChange={(e) => setSearchModuleQuery(e.target.value)}
                        placeholder="Search module titles, creators..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Live Ingestion Status Banner ─────────────────────────── */}
                {(allProcessingSources.length > 0 || allProcessingTopics.length > 0 || allFailedTopics.length > 0) && (
                  <div className="space-y-2">
                    {(allProcessingSources.length > 0 || allProcessingTopics.length > 0) && (
                      <div className="flex items-center gap-3 bg-amber-950/30 border border-amber-500/30 rounded-xl px-4 py-3">
                        <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-amber-300">
                            Ingestion running — auto-refreshing every 3s
                          </p>
                          <p className="text-[10px] text-amber-400/70 mt-0.5">
                            {allProcessingSources.length > 0 && `${allProcessingSources.length} source(s) extracting · `}
                            {allProcessingTopics.length > 0 && `${allProcessingTopics.length} topic(s) embedding chunks`}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold text-amber-400/60 shrink-0">LIVE</span>
                      </div>
                    )}
                    {allFailedTopics.length > 0 && (
                      <div className="flex items-start gap-3 bg-red-950/30 border border-red-500/30 rounded-xl px-4 py-3">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-red-300">{allFailedTopics.length} topic(s) failed to index</p>
                          <div className="mt-1.5 space-y-1">
                            {allFailedTopics.slice(0, 3).map((t: any) => (
                              <div key={t.id} className="flex items-start gap-1.5">
                                <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-red-300/70 break-all">
                                  <span className="font-semibold text-red-300">{t.topic}</span>
                                  {t.indexingError && ` — ${t.indexingError}`}
                                </p>
                              </div>
                            ))}
                            {allFailedTopics.length > 3 && (
                              <p className="text-[10px] text-red-400/50">+{allFailedTopics.length - 3} more failed topics (see below)</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Chunk Configuration Panel ────────────────────────────────── */}
                <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-300">Hybrid Chunking Configuration</h3>
                    {configLoading && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Chunk Size (tokens)</label>
                      <input
                        type="number"
                        min={100} max={2000} step={50}
                        value={chunkTargetTokens}
                        onChange={(e) => setChunkTargetTokens(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <p className="text-[9px] text-slate-500">Applied to content chunks. Tables & image captions are always full-size.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overlap (tokens)</label>
                      <input
                        type="number"
                        min={0} max={500} step={10}
                        value={chunkOverlapTokens}
                        onChange={(e) => setChunkOverlapTokens(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <p className="text-[9px] text-slate-500">Overlap between adjacent content chunks for context continuity.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 text-[10px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                        <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span><span className="text-slate-300 font-semibold">3 chunk types:</span> <span className="text-emerald-400">content</span> (windowed), <span className="text-amber-400">table</span> (whole), <span className="text-violet-400">image_caption</span> (caption+url). <br/><span className="text-slate-500">times_retrieved tracked per chunk for color-map heat.</span></span>
                      </div>
                      <Button
                        size="sm"
                        onClick={saveChunkConfig}
                        disabled={configSaving}
                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1.5"
                      >
                        {configSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Save Config
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ── Module Cards ─────────────────────────────────────────────── */}
                <div className="space-y-4">
                  {modulesLoading ? (
                    <div className="text-center py-20 text-slate-500 text-xs">Loading available modules...</div>
                  ) : filteredModules.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 text-xs">No modules matching query.</div>
                  ) : (
                    filteredModules.map((mod: any) => {
                      const doneCount = (mod.sources || []).filter((s: any) => s.ingestionStatus === "done").length;
                      const totalSrcs = (mod.sources || []).length;
                      const doneTopics = (mod.contents || []).filter((t: any) => t.indexingStatus === "done").length;
                      const failedTopics = (mod.contents || []).filter((t: any) => t.indexingStatus === "failed").length;
                      const processingTopics = (mod.contents || []).filter((t: any) => t.indexingStatus === "processing").length;
                      const totalTopics = (mod.contents || []).length;
                      const chunkCount = chunkCounts[mod.id] ?? null;
                      const isModuleProcessing = processingTopics > 0 || (mod.sources || []).some((s: any) => s.ingestionStatus === "processing");
                      return (
                        <div key={mod.id} className={cn("bg-slate-900 border rounded-xl p-5 space-y-4 shadow-sm transition-colors", isModuleProcessing ? "border-amber-500/30 hover:border-amber-500/50" : "border-slate-800 hover:border-slate-700")}>

                          {/* Module header */}
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-extrabold text-base text-slate-200">{mod.title}</h3>
                                <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono">ID: {mod.id}</span>
                                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-medium">{mod.subject || "No Subject"}</span>
                                <span className={cn(
                                  "text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase border",
                                  mod.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : mod.status === "processing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                                )}>{mod.status}</span>
                              </div>
                              <p className="text-xs text-slate-500">{mod.description || "No description provided."}</p>
                              <p className="text-[10px] text-slate-600 mt-1">By {mod.creatorName} · {mod.creatorEmail}</p>
                            </div>

                            {/* Module-level action buttons */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <div className="text-right mr-1 space-y-0.5">
                                <div className="text-xs font-bold text-slate-300">{doneCount}/{totalSrcs} sources indexed</div>
                                <div className="text-[10px] text-slate-400">
                                  {totalTopics > 0 && (
                                    <span>
                                      <span className="text-emerald-400">{doneTopics}</span>/{totalTopics} topics
                                      {failedTopics > 0 && <span className="text-red-400 ml-1">· {failedTopics} failed</span>}
                                      {processingTopics > 0 && <span className="text-amber-400 ml-1">· {processingTopics} running</span>}
                                    </span>
                                  )}
                                </div>
                                {chunkCount !== null && (
                                  <div className="text-[10px] text-indigo-400 font-mono">{chunkCount.toLocaleString()} chunks in DB</div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleIngestAll(mod)}
                                disabled={ingestingAllModuleId === mod.id}
                                className="h-8 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                                title="Trigger ingestion for all sources in this module"
                              >
                                {ingestingAllModuleId === mod.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Layers className="h-3 w-3" />}
                                Ingest All
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeIngestModule(mod.id, mod.title)}
                                disabled={deIngestingModuleId === mod.id}
                                className="h-8 text-[10px] font-bold border-rose-800/60 hover:bg-rose-950/40 text-rose-400 gap-1.5"
                                title="Delete all vector embeddings for this module"
                              >
                                {deIngestingModuleId === mod.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <XCircle className="h-3 w-3" />}
                                De-ingest All
                              </Button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${mod.processingPct || 0}%` }}
                            />
                          </div>

                          {/* Sources list */}
                          {(!mod.sources || mod.sources.length === 0) ? (
                            <div className="text-slate-500 text-xs italic bg-slate-950/40 p-4 border border-slate-850 rounded-lg">
                              No ingestion sources found for this module.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Sources ({totalSrcs}) — {doneCount} embedded
                              </h4>
                              {mod.sources.map((src: any) => (
                                <div key={src.id} className="flex items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-850 rounded-lg hover:border-slate-800 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {src.type === "pdf" && <FileText className="h-4 w-4 text-rose-400 shrink-0" />}
                                    {src.type === "url" && <Globe className="h-4 w-4 text-emerald-400 shrink-0" />}
                                    {src.type === "text" && <Info className="h-4 w-4 text-indigo-400 shrink-0" />}
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-300 truncate" title={src.name}>{src.name}</p>
                                      <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                                        <span className="capitalize">{src.type}</span>
                                        {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[130px] hover:text-indigo-400">{src.url}</a>}
                                        {src.storageKey && <span className="text-slate-600">Key: {src.storageKey.split("/").pop()}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={cn(
                                      "text-[9px] px-2 py-0.5 rounded font-bold uppercase border",
                                      src.ingestionStatus === "done" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : src.ingestionStatus === "processing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                                      : src.ingestionStatus === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20"
                                      : "bg-slate-800 text-slate-400 border-slate-700"
                                    )}>
                                      {src.ingestionStatus || "pending"}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTriggerIngestion(src, mod.id)}
                                      disabled={triggeringSourceId === src.id}
                                      className="h-7 text-[9px] font-bold border-slate-800 hover:bg-indigo-950/40 hover:border-indigo-800 text-slate-300 gap-1"
                                    >
                                      {triggeringSourceId === src.id
                                        ? <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                                        : <Play className="h-3 w-3 text-indigo-400" />}
                                      {src.ingestionStatus === "done" ? "Re-Ingest" : "Ingest"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeIngestSource(src.id, src.name)}
                                      disabled={deIngestingSourceId === src.id || src.ingestionStatus !== "done"}
                                      className="h-7 text-[9px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 gap-1 disabled:opacity-30"
                                      title="Remove embeddings for this source"
                                    >
                                      {deIngestingSourceId === src.id
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <XCircle className="h-3 w-3" />}
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Chapters & Topics List */}
                          <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Chapter Sections ({mod.contents?.length || 0})
                              </h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleIngestContent(mod.id)}
                                disabled={triggeringIngestion[mod.id]}
                                className="h-7 text-[9px] font-bold border-indigo-500/30 hover:bg-indigo-950/40 text-indigo-400 gap-1"
                              >
                                {triggeringIngestion[mod.id] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Play className="h-3 w-3 text-indigo-400" />
                                )}
                                {(selectedTopics[mod.id] || []).length > 0 ? (
                                  `Ingest Selected (${selectedTopics[mod.id].length})`
                                ) : (
                                  "Ingest Unindexed"
                                )}
                              </Button>
                            </div>
                            
                            {(!mod.contents || mod.contents.length === 0) ? (
                              <div className="text-slate-600 text-[10px] italic">
                                No chapters or topics extracted yet. Ingest a source to extract content.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {mod.contents.map((topic: any) => {
                                  const isSelected = (selectedTopics[mod.id] || []).includes(topic.topicId);
                                  return (
                                    <div
                                      key={topic.id}
                                      className="flex items-center justify-between gap-2 p-2 bg-slate-950/40 border border-slate-850 rounded-lg hover:border-slate-800 transition-colors text-[11px]"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleToggleTopic(mod.id, topic.topicId)}
                                          className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                                        />
                                        <div className="min-w-0">
                                          <p className="font-semibold text-slate-300 truncate" title={topic.topic}>
                                            {topic.topic}
                                          </p>
                                          <p className="text-[9px] text-slate-500 truncate">
                                            {topic.chapter}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span
                                          className={cn(
                                            "text-[8px] px-1.5 py-0.5 rounded font-bold uppercase border",
                                            topic.indexingStatus === "done" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                            : topic.indexingStatus === "processing" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                                            : topic.indexingStatus === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20"
                                            : "bg-slate-800/50 text-slate-500 border-slate-800"
                                          )}
                                        >
                                          {topic.indexingStatus === "done" ? "✓ done"
                                            : topic.indexingStatus === "processing" ? "⏳ running"
                                            : topic.indexingStatus === "failed" ? "✗ failed"
                                            : topic.indexingStatus || "pending"}
                                        </span>
                                        {topic.indexingStatus === "failed" && topic.indexingError && (
                                          <p className="text-[8px] text-red-400/80 max-w-[160px] text-right break-words leading-tight">{topic.indexingError}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              );
            })()}


            {/* 7. Cache Telemetry Tab */}
            {activeTab === "cache" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Cache Telemetry (Upstash / Redis)</h2>
                    <p className="text-xs text-slate-400 mt-1">Monitor cache keys, used memory, client statistics, and connection info from Upstash/Redis console.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchCacheTelemetry}
                      disabled={cacheLoading}
                      className="h-8 text-xs border-slate-800 hover:bg-slate-800 text-slate-300 gap-1.5"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", cacheLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleFlushCache}
                      disabled={flushingCache || !cacheData?.configured}
                      className="h-8 text-xs gap-1.5 font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Flush Cache
                    </Button>
                  </div>
                </div>

                {!cacheData ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-3" />
                    <p className="text-xs font-semibold">Connecting to cache database proxy...</p>
                  </div>
                ) : !cacheData.configured ? (
                  <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-400 text-sm">Redis Connection Offline</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          The Upstash Redis cache layer is not configured or offline. Set <code className="bg-slate-950 text-rose-400 px-1 py-0.5 rounded font-mono">UPSTASH_REDIS_REST_URL</code> and <code className="bg-slate-950 text-rose-400 px-1 py-0.5 rounded font-mono">UPSTASH_REDIS_REST_TOKEN</code> in your environment variables to enable browser-safe REST caching.
                        </p>
                        {cacheData.error && (
                          <div className="mt-3 bg-slate-950/80 p-3 rounded-lg border border-red-900/20 font-mono text-[10px] text-red-300">
                            Error details: {cacheData.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Status</span>
                          <div className="p-2 bg-emerald-500/10 rounded-lg"><Check className="h-4 w-4 text-emerald-400" /></div>
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">Connected</div>
                        <div className="text-[10px] text-slate-500 mt-1">Upstash REST proxy active</div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Keys Tracked</span>
                          <div className="p-2 bg-indigo-500/10 rounded-lg"><Database className="h-4 w-4 text-indigo-400" /></div>
                        </div>
                        <div className="text-2xl font-bold">{cacheData.dbSize ?? 0}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Total database keys</div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Memory Used</span>
                          <div className="p-2 bg-violet-500/10 rounded-lg"><Sliders className="h-4 w-4 text-violet-400" /></div>
                        </div>
                        <div className="text-2xl font-bold">{getRedisInfoValue(cacheData.info, "used_memory_human") || "N/A"}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Used memory allocation</div>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Connected Clients</span>
                          <div className="p-2 bg-amber-500/10 rounded-lg"><Users className="h-4 w-4 text-amber-400" /></div>
                        </div>
                        <div className="text-2xl font-bold">{getRedisInfoValue(cacheData.info, "connected_clients") || "0"}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Active database client links</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Key Inspector */}
                      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col min-h-[400px]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                          <div>
                            <h3 className="font-bold text-xs uppercase tracking-wider">Cache Key Registry</h3>
                            <p className="text-[11px] text-slate-550 mt-0.5">Explore active keys namespaces under <code className="text-indigo-400">openbalc:*</code></p>
                          </div>
                          
                          <div className="relative w-full md:w-56">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                            <input
                              type="text"
                              value={searchKeyQuery}
                              onChange={(e) => setSearchKeyQuery(e.target.value)}
                              placeholder="Search keys..."
                              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[450px] pr-1 space-y-2">
                          {(!cacheData.keys || cacheData.keys.length === 0) ? (
                            <div className="text-center py-20 text-slate-500 text-xs italic">
                              No active cache keys found in Redis.
                            </div>
                          ) : (
                            cacheData.keys
                              .filter(k => k.toLowerCase().includes(searchKeyQuery.toLowerCase()))
                              .map(key => (
                                <div key={key} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-lg hover:border-slate-800 transition-colors">
                                  <div className="min-w-0">
                                    <p className="text-xs font-mono text-indigo-300 truncate" title={key}>{key}</p>
                                    <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                                      <span className="bg-slate-800/80 px-1 py-0.2 rounded uppercase">Namespace: {key.split(":")[1] || "Default"}</span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteKey(key)}
                                    className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border-0"
                                    title="Delete key"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))
                          )}
                        </div>
                      </div>

                      {/* Right: Info Inspector */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
                        <div className="border-b border-slate-800 pb-4 mb-4">
                          <h3 className="font-bold text-xs uppercase tracking-wider">Redis Database Info</h3>
                          <p className="text-[11px] text-slate-550 mt-0.5">Version & performance stats returned from the database server.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[450px] pr-1 space-y-4 text-xs font-mono">
                          {parseRedisInfo(cacheData.info).map((section) => (
                            <div key={section.title} className="space-y-2">
                              <h4 className="font-extrabold text-[10px] text-indigo-400 border-b border-slate-850 pb-1 uppercase tracking-wider">{section.title}</h4>
                              <div className="space-y-1.5 pl-1">
                                {section.items.map((item) => (
                                  <div key={item.key} className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-500 truncate mr-2" title={item.key}>{item.key}</span>
                                    <span className="text-slate-300 font-semibold truncate max-w-[150px]" title={item.value}>{item.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
