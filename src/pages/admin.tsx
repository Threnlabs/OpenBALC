import React, { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import {
  useGetAIModels,
  useUpdateAIModel,
  useGetAIServices,
  useUpdateAIServiceModel,
  useGetAILogs,
  useClearAILogs,
  useGetAdminStats,
  useGetAdminUsers,
  useUpdateUserCredits
} from "@workspace/api-client-react";
import {
  Shield, Cpu, Activity, Terminal, Users, Settings2, AlertCircle,
  CheckCircle2, Clock, Coins, Search, Trash2, RefreshCw, Play, Copy,
  Plus, Minus, Info, ArrowUpRight, Sliders, Database, Sparkles,
  TrendingUp, BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from "recharts";

type TabType = "overview" | "gateway" | "logs" | "services" | "users";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchLogQuery, setSearchLogQuery] = useState("");
  const [filterLogService, setFilterLogService] = useState("all");
  const [filterLogStatus, setFilterLogStatus] = useState("all");
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  
  // Simulated gateway error state
  const [simulateError, setSimulateError] = useState(() => {
    return localStorage.getItem("openbalc_simulate_error") === "true";
  });

  const queryClient = useQueryClient();
  
  const { data: models = [], isLoading: modelsLoading } = useGetAIModels();
  const { data: services = [], isLoading: servicesLoading } = useGetAIServices();
  const { data: logs = [], isLoading: logsLoading } = useGetAILogs();
  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: adminUsers = [], isLoading: usersLoading } = useGetAdminUsers();
  
  const updateModel = useUpdateAIModel();
  const updateService = useUpdateAIServiceModel();
  const clearLogs = useClearAILogs();
  const updateUserCredits = useUpdateUserCredits();

  // Handle gateway error simulation toggle
  const toggleSimulateError = () => {
    const nextState = !simulateError;
    setSimulateError(nextState);
    localStorage.setItem("openbalc_simulate_error", String(nextState));
    if (nextState) {
      toast.warning("AI Model Gateway error simulation enabled! All primary model calls will fail.");
    } else {
      toast.success("AI Model Gateway error simulation disabled. Gateway returned to normal operation.");
    }
  };

  // Add a sample simulated AI gateway call for testing
  const handleSimulateCall = () => {
    const currentLogs = [...logs];
    const nextId = currentLogs.length > 0 ? Math.max(...currentLogs.map((l: any) => l.id)) + 1 : 1;
    const servicesList = ["Chat Assistant", "Module Creator & Embedding Ingestion", "Quiz / Test Generator"];
    const mockPrompts = [
      "Can you explain vector embeddings in the context of RAG?",
      "Ingest and generate chapters for document: Advanced Algorithms.pdf",
      "Generate a practice test about basic JavaScript asynchronous loops.",
      "Summarize the main learnings of the user profile: CS major interested in ML."
    ];
    const status = Math.random() > 0.85 ? "error" : "success";
    const selectedService = servicesList[Math.floor(Math.random() * servicesList.length)];
    const activeModel = models.find((m: any) => m.status === "active") || models[0];
    
    let modelUsed = activeModel;
    let fallbackTriggered = false;
    let failedLogEntry: any = null;

    if (simulateError) {
      const fallback = models.find((m: any) => m.status === "fallback");
      if (fallback) {
        fallbackTriggered = true;
        failedLogEntry = {
          id: nextId,
          timestamp: new Date().toISOString(),
          service: selectedService,
          modelId: activeModel.id,
          prompt: mockPrompts[Math.floor(Math.random() * mockPrompts.length)],
          response: "Gateway Failure",
          status: "error",
          errorDetails: `GatewayTimeout: Primary model ${activeModel.name} failed to respond. Initiating automatic fallback.`,
          latency: 1200,
          tokensUsed: 0,
          cost: 0
        };
        modelUsed = fallback;
      } else {
        // No fallback, fail completely
        const finalLog = {
          id: nextId,
          timestamp: new Date().toISOString(),
          service: selectedService,
          modelId: activeModel.id,
          prompt: mockPrompts[Math.floor(Math.random() * mockPrompts.length)],
          response: "Gateway Failure",
          status: "error",
          errorDetails: `GatewayTimeout: Primary model ${activeModel.name} failed and no fallback model is configured.`,
          latency: 1200,
          tokensUsed: 0,
          cost: 0
        };
        currentLogs.unshift(finalLog);
        localStorage.setItem("openbalc_ai_logs", JSON.stringify(currentLogs));
        queryClient.invalidateQueries({ queryKey: ["getAILogs"] });
        queryClient.invalidateQueries({ queryKey: ["getAdminStats"] });
        toast.error(`Simulated Call Failed: ${activeModel.name} failed and no fallback is active.`);
        return;
      }
    }

    const finalLog = {
      id: nextId + (fallbackTriggered ? 1 : 0),
      timestamp: new Date().toISOString(),
      service: selectedService,
      modelId: modelUsed.id,
      prompt: mockPrompts[Math.floor(Math.random() * mockPrompts.length)],
      response: `[Simulated Response] Here is a structured summary explaining the concepts based on the active model configurations.`,
      status: "success",
      latency: Math.round(modelUsed.latencyAvg + Math.floor(Math.random() * 100) - 50),
      tokensUsed: Math.floor(Math.random() * 1000) + 300,
      cost: modelUsed.costPerRequest
    };

    if (failedLogEntry) {
      currentLogs.unshift(failedLogEntry);
    }
    currentLogs.unshift(finalLog);
    localStorage.setItem("openbalc_ai_logs", JSON.stringify(currentLogs));
    queryClient.invalidateQueries({ queryKey: ["getAILogs"] });
    queryClient.invalidateQueries({ queryKey: ["getAdminStats"] });
    
    if (fallbackTriggered) {
      toast.warning(`Simulated call triggered primary error, successfully fell back to ${modelUsed.name}!`);
    } else {
      toast.success(`Simulated call completed successfully using ${modelUsed.name}!`);
    }
  };

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
      l.prompt.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      l.service.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
      l.modelId.toLowerCase().includes(searchLogQuery.toLowerCase());
    const matchesService = filterLogService === "all" || l.service === filterLogService;
    const matchesStatus = filterLogStatus === "all" || l.status === filterLogStatus;
    return matchesSearch && matchesService && matchesStatus;
  });

  const selectedLog = logs.find((l: any) => l.id === selectedLogId);
  const selectedModel = models.find((m: any) => m.id === selectedModelId);

  // Colors for model pie chart
  const COLORS = ["#6366f1", "#a855f7", "#ec4899", "#3b82f6"];

  return (
    <AppLayout>
      <div className="w-full px-6 lg:px-10 py-8 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm uppercase tracking-wider mb-1">
              <Shield className="h-4 w-4" /> Admin Console
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">AI Gateway & Ingestion Control</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor server telemetry, configure model endpoints, audit LLM prompts, and track user credit balance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={simulateError ? "destructive" : "outline"}
              onClick={toggleSimulateError}
              className="h-10 text-xs font-semibold gap-2 border-dashed"
            >
              <AlertCircle className="h-4 w-4 animate-pulse" />
              {simulateError ? "Stop Error Simulation" : "Simulate Gateway Outage"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulateCall}
              className="h-10 text-xs font-semibold gap-2"
            >
              <Play className="h-3.5 w-3.5" />
              Simulate AI Call
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["getAILogs"] });
                queryClient.invalidateQueries({ queryKey: ["getAdminStats"] });
                toast.success("Dashboard telemetry refreshed");
              }}
              className="h-10 w-10 border border-border"
              title="Refresh Telemetry"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border mb-8 overflow-x-auto scrollbar-none gap-2">
          {[
            { id: "overview", label: "Dashboard Telemetry", icon: Activity },
            { id: "gateway", label: "AI Models Config", icon: Cpu },
            { id: "logs", label: "Logs & Catching Errors", icon: Terminal },
            { id: "services", label: "Service Mapping", icon: Sliders },
            { id: "users", label: "User Accounts", icon: Users }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap -mb-px outline-none ${
                  isActive
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Overview Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Requests</span>
                  <div className="p-2 bg-indigo-500/10 rounded-lg"><Cpu className="h-4 w-4 text-indigo-400" /></div>
                </div>
                <div className="text-2xl font-bold">{stats?.totalRequests ?? 0}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Across all models & services</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Gateway Error Rate</span>
                  <div className="p-2 bg-red-500/10 rounded-lg"><AlertCircle className="h-4 w-4 text-red-400" /></div>
                </div>
                <div className={`text-2xl font-bold ${stats?.errorRate > 5 ? "text-red-400" : "text-emerald-400"}`}>
                  {stats?.errorRate ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {stats?.errorRate > 0 ? "Targeting gateway fallback..." : "All requests successful"}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Avg Latency</span>
                  <div className="p-2 bg-violet-500/10 rounded-lg"><Clock className="h-4 w-4 text-violet-400" /></div>
                </div>
                <div className="text-2xl font-bold">{stats?.avgLatency ?? 0} ms</div>
                <div className="text-[11px] text-muted-foreground mt-1">Model gateway round-trip time</div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Credits Spent</span>
                  <div className="p-2 bg-amber-500/10 rounded-lg"><Coins className="h-4 w-4 text-amber-400" /></div>
                </div>
                <div className="text-2xl font-bold">{stats?.creditsSpent ?? 0} cr</div>
                <div className="text-[11px] text-muted-foreground mt-1">Simulated model cost totals</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Request Vol chart */}
              <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <h3 className="font-bold text-sm leading-none">Gateway Requests Volume (7 Days)</h3>
                </div>
                <div className="h-72 w-full">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
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
                          contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                        />
                        <Area type="monotone" dataKey="Requests" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#reqVol)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Service & Model Breakdown */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <BarChart2 className="h-4 w-4 text-violet-400" />
                    <h3 className="font-bold text-sm leading-none">Model Requests Distribution</h3>
                  </div>
                  <div className="h-56 w-full flex items-center justify-center">
                    {Object.keys(stats?.modelStats || {}).length === 0 ? (
                      <div className="text-muted-foreground text-xs">No active data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.keys(stats?.modelStats || {}).map(key => ({
                              name: models.find((m: any) => m.id === key)?.name || key,
                              value: stats.modelStats[key]
                            }))}
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
                            contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
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
                        <span className="font-medium text-muted-foreground truncate max-w-[140px]">
                          {models.find((m: any) => m.id === key)?.name || key}
                        </span>
                      </div>
                      <span className="font-bold text-foreground">{stats.modelStats[key]} calls</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ingestion & Embedding Telemetry explanation */}
            <div className="bg-muted/30 border border-border rounded-xl p-6 shadow-inner">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0 mt-0.5">
                  <Database className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Ingestion Pipeline: Background Embeddings</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    OpenBALC implements a <strong>zero-prompt ingestion workflow</strong>. When users paste resource URLs, write custom topics, or upload documents in the user portal, the content is queued and automatically parsed. It is vectorized using the active primary AI model's embeddings template and indexed into localized namespace tables immediately—without prompting the user with vector parameters, token chunk configurations, or threshold parameters. The results are logged directly in the gateway above.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* AI Models Config Tab Content */}
        {activeTab === "gateway" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Left: Model list */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-base">Model Endpoint Routing</h3>
                <span className="text-xs text-muted-foreground">Select a model to view full instructions & parameters</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modelsLoading ? (
                  <div>Loading configurations...</div>
                ) : (
                  models.map((model: any) => (
                    <div
                      key={model.id}
                      onClick={() => setSelectedModelId(model.id)}
                      className={`border rounded-xl p-5 cursor-pointer hover:border-indigo-400/40 transition-colors flex flex-col justify-between h-48 bg-card ${
                        selectedModelId === model.id ? "border-primary ring-1 ring-primary" : "border-border"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground font-semibold">{model.provider}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            model.status === "active" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : model.status === "fallback"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {model.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-base leading-tight mb-1">{model.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{model.systemInstruction}</p>
                      </div>

                      <div className="flex justify-between items-center text-xs border-t border-border/60 pt-3 mt-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Coins className="h-3.5 w-3.5 text-amber-400" />
                          <span>{model.costPerRequest} credits / call</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{model.latencyAvg} ms latency</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Model Editor */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              {selectedModel ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between border-b border-border pb-4">
                    <div>
                      <h3 className="font-bold text-base leading-none mb-1">{selectedModel.name}</h3>
                      <p className="text-xs text-muted-foreground">{selectedModel.provider} Config</p>
                    </div>
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                  </div>

                  {/* Status update */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gateway Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["active", "fallback", "inactive"].map(st => (
                        <button
                          key={st}
                          onClick={() => handleUpdateModelStatus(selectedModel.id, st as any)}
                          className={`text-xs font-bold py-2 rounded-lg capitalize border ${
                            selectedModel.status === st
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-muted border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                      * Active: Primary model for user actions. Fallback: Automatically handles calls if active fails. Inactive: Disabled.
                    </p>
                  </div>

                  {/* Slider parameters */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <label className="font-semibold text-muted-foreground">Temperature</label>
                        <span className="font-bold">{selectedModel.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={selectedModel.temperature}
                        onChange={(e) => handleUpdateModelParams(selectedModel.id, { temperature: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <label className="font-semibold text-muted-foreground">Max Tokens</label>
                        <span className="font-bold">{selectedModel.maxTokens}</span>
                      </div>
                      <input
                        type="number"
                        step="256"
                        min="256"
                        max="16384"
                        value={selectedModel.maxTokens}
                        onChange={(e) => handleUpdateModelParams(selectedModel.id, { maxTokens: parseInt(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <label className="font-semibold text-muted-foreground">Credits Per Ingestion/Request</label>
                        <span className="font-bold">{selectedModel.costPerRequest} credits</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={selectedModel.costPerRequest}
                        onChange={(e) => handleUpdateModelParams(selectedModel.id, { costPerRequest: parseInt(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-input/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* System Instruction */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System instruction</label>
                    <textarea
                      rows={3}
                      value={selectedModel.systemInstruction}
                      onChange={(e) => handleUpdateModelParams(selectedModel.id, { systemInstruction: e.target.value })}
                      className="w-full p-3 bg-input/50 border border-border rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 py-20 text-muted-foreground">
                  <Settings2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h4 className="font-semibold text-sm mb-1 text-foreground">No Model Selected</h4>
                  <p className="text-xs leading-normal">Click any model from the gateway list on the left to edit its instruction parameters or status.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Logs & Errors Tab Content */}
        {activeTab === "logs" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Left: Log list */}
            <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col min-h-[500px]">
              
              {/* Filter controls */}
              <div className="flex flex-col md:flex-row gap-3 mb-6 items-center justify-between border-b border-border pb-4">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    placeholder="Search prompt contents or models..."
                    className="w-full pl-9 pr-4 py-2 bg-input/50 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto justify-end">
                  <select
                    value={filterLogService}
                    onChange={(e) => setFilterLogService(e.target.value)}
                    className="px-3 py-1.5 bg-input/50 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All Services</option>
                    <option value="Chat Assistant">Chat Assistant</option>
                    <option value="Module Creator & Embedding Ingestion">Module Creator</option>
                    <option value="Quiz / Test Generator">Test Generator</option>
                  </select>

                  <select
                    value={filterLogStatus}
                    onChange={(e) => setFilterLogStatus(e.target.value)}
                    className="px-3 py-1.5 bg-input/50 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="success">Success Only</option>
                    <option value="error">Errors Only</option>
                  </select>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearLogs}
                    className="h-8 text-xs text-red-400 hover:text-red-300 gap-1.5 font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="flex-1 overflow-x-auto">
                {logsLoading ? (
                  <div className="text-center py-20 text-muted-foreground text-xs">Loading logs...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground text-xs">No matching logs found.</div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border/80 pb-3 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                        <th className="py-2 pl-2">Status</th>
                        <th className="py-2">Service</th>
                        <th className="py-2">Model</th>
                        <th className="py-2 text-right">Latency</th>
                        <th className="py-2 text-right">Cost</th>
                        <th className="py-2 text-right pr-2">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredLogs.map((log: any) => {
                        const isError = log.status === "error";
                        return (
                          <tr
                            key={log.id}
                            onClick={() => setSelectedLogId(log.id)}
                            className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                              selectedLogId === log.id ? "bg-primary/5" : ""
                            }`}
                          >
                            <td className="py-3 pl-2">
                              {isError ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[10px]">
                                  <AlertCircle className="h-3 w-3" /> Error
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                                  <CheckCircle2 className="h-3 w-3" /> Success
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-semibold truncate max-w-[140px]">{log.service}</td>
                            <td className="py-3 text-muted-foreground">{log.modelId}</td>
                            <td className="py-3 text-right font-medium">{log.latency} ms</td>
                            <td className="py-3 text-right font-medium">{log.cost} cr</td>
                            <td className="py-3 text-right text-muted-foreground pr-2">
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

            {/* Right: Log details & Stack trace */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              {selectedLog ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between border-b border-border pb-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Log details (ID: {selectedLog.id})</span>
                      <h3 className="font-bold text-base mt-0.5">{selectedLog.service}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                        toast.success("Log JSON copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* prompt */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prompt Payload</label>
                    <div className="bg-input/50 p-3 rounded-lg border border-border/80 text-xs leading-relaxed max-h-32 overflow-y-auto break-words font-mono">
                      {selectedLog.prompt}
                    </div>
                  </div>

                  {/* response / error */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {selectedLog.status === "error" ? "Error Message" : "Model Output Response"}
                    </label>
                    
                    {selectedLog.status === "error" ? (
                      <div className="bg-red-500/5 text-red-400 p-3 rounded-lg border border-red-500/10 text-xs leading-relaxed max-h-48 overflow-y-auto font-mono">
                        {selectedLog.response}
                      </div>
                    ) : (
                      <div className="bg-input/50 p-3 rounded-lg border border-border/80 text-xs leading-relaxed max-h-48 overflow-y-auto break-words">
                        {selectedLog.response}
                      </div>
                    )}
                  </div>

                  {/* Error stack trace details (if error) */}
                  {selectedLog.status === "error" && (
                    <div className="space-y-2 border-t border-border pt-4">
                      <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                        <AlertCircle className="h-4 w-4" /> Traceback Debugger
                      </div>
                      
                      <div className="bg-neutral-950 p-3 rounded-lg border border-border/80 text-[10px] leading-relaxed max-h-40 overflow-y-auto font-mono text-red-300">
                        {selectedLog.errorDetails}
                        {"\n"}  at GatewayRouter.eval (index.ts:505)
                        {"\n"}  at runMicrotasks (&lt;anonymous&gt;)
                        {"\n"}  at processTicksAndRejections (node:internal/process/task_queues:95:5)
                        {"\n"}  at async APIClient.request (client.ts:82)
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        * To resolve this error, check the model configuration parameters in the <strong>AI Models Config</strong> tab or check if the API Provider credentials/outage simulations are active.
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 border-t border-border/80 pt-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Latency:</span>
                      <span className="font-bold text-foreground">{selectedLog.latency} ms</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Model Assigned:</span>
                      <span className="font-bold text-foreground">{selectedLog.modelId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Tokens Logged:</span>
                      <span className="font-bold text-foreground">{selectedLog.tokensUsed || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Credits Debited:</span>
                      <span className="font-bold text-foreground">{selectedLog.cost || 0} cr</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 py-20 text-muted-foreground">
                  <Terminal className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <h4 className="font-semibold text-sm mb-1 text-foreground">No Log Selected</h4>
                  <p className="text-xs leading-normal">Click any call log row from the history table on the left to inspect its prompt inputs, raw JSON response, or stack trace.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Mapping Tab Content */}
        {activeTab === "services" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-base">Service Endpoint Router</h3>
              <span className="text-xs text-muted-foreground">Directly route specific AI features to different model gateways</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {servicesLoading ? (
                <div>Loading services...</div>
              ) : (
                services.map((service: any) => (
                  <div key={service.id} className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between h-64">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                          <Sliders className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold font-mono">
                          {service.id}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-base mb-1">{service.name}</h4>
                      <p className="text-xs text-muted-foreground leading-normal mb-4">{service.description}</p>
                    </div>

                    <div className="space-y-2 border-t border-border pt-4">
                      <div className="flex justify-between text-xs items-center">
                        <span className="font-medium text-muted-foreground">Model Route:</span>
                        <select
                          value={service.activeModelId}
                          onChange={(e) => handleUpdateService(service.id, e.target.value)}
                          className="px-2.5 py-1 bg-input border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
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
            
            {/* Zero-prompt embedding explanation */}
            <div className="bg-muted/30 border border-border rounded-xl p-5 mt-6 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground flex items-center gap-1 mb-1">
                <Info className="h-3.5 w-3.5 text-indigo-400" /> Ingestion & Embedding Telemetry Notes
              </span>
              The <strong>Module Creator & Embedding Ingestion</strong> service handles all source uploads, topic parses, and vector embeddings in the user interface. By assigning a model route, you dictate the parameters (temperature, max tokens) that ingest and split pages automatically behind the scenes.
            </div>
          </div>
        )}

        {/* User Management Tab Content */}
        {activeTab === "users" && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <h3 className="font-bold text-base">Workspace Member Telemetry & Credit Controls</h3>
              <span className="text-xs text-muted-foreground">{adminUsers.length} Users found</span>
            </div>

            <div className="overflow-x-auto">
              {usersLoading ? (
                <div className="text-center py-20 text-muted-foreground text-xs">Loading user list...</div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border pb-2 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                      <th className="py-2 pl-2">User Details</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">System Role</th>
                      <th className="py-2 text-center">AI Requests Made</th>
                      <th className="py-2 text-center">Active Credit Balance</th>
                      <th className="py-2 text-right pr-2">Credits Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {adminUsers.map((user: any) => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-4 pl-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                              {user.displayName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{user.displayName}</p>
                              <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-muted-foreground">{user.email}</td>
                        <td className="py-4">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            user.role === "admin"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 text-center font-medium">{user.totalRequests}</td>
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
                              className="h-8 w-8 rounded-lg"
                              onClick={() => handleAdjustCredits(user.id, user.credits, -25)}
                              title="Deduct 25 credits"
                            >
                              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => handleAdjustCredits(user.id, user.credits, 25)}
                              title="Add 25 credits"
                            >
                              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
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

      </div>
    </AppLayout>
  );
}
