import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../../context/BenchrexContext";
import { Button } from "../../components/ui/button";
import { THEMES } from "../../types";
import {
  UserCircle2, Moon, Sun, ShieldCheck, User as UserIcon, FileText, LayoutGrid, Palette, LogOut, Sparkles, MessageSquare, Menu
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { Switch } from "../../components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { MODELS } from "../../lib/models";
import { toast } from "sonner";

interface ChatHeaderProps {
  onNewChat?: () => void;
}

const ChatHeader = ({ onNewChat: _onNewChat }: ChatHeaderProps) => {
  const {
    historyOpen, setHistoryOpen, theme, setTheme, logout, user,
    boardOpen, setBoardOpen, darkMode, setDarkMode,
    knowledgeOpen, setKnowledgeOpen,
    conversations, activeConversationId,
    activeModel, setActiveModel,
    students,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const credits = user?.credits ?? 0;

  const isExpert = user?.role === 'doubt_expert' || user?.role === 'super_admin' || user?.role === 'faculty';
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeStudent = isExpert ? students.find(s => s.id === activeConversation?.userId) : null;

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setHistoryOpen(!historyOpen)}
          aria-label="Toggle chat history"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <h1 className="font-display text-lg font-semibold truncate">
          {activeStudent ? `Helping ${activeStudent.name}` : "Benchrex"}
        </h1>
        {activeConversation?.isExpertSession && (
          <div className="ml-2 flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm animate-in fade-in zoom-in duration-300">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>EXPERT SESSION ACTIVE</span>
          </div>
        )}
      </div>

      {/* Desktop Menu - hidden on mobile */}
      <div className="hidden md:flex items-center gap-1">

        {/* Credits */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mr-1 flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="tabular-nums">{credits}</span>
              <span className="text-muted-foreground">credits</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Credits remaining for this period</TooltipContent>
        </Tooltip>


        {/* Knowledge toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setKnowledgeOpen(!knowledgeOpen)}
              aria-label="Open knowledge content"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Conversation Content</TooltipContent>
        </Tooltip>


        {/* Board toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setBoardOpen(!boardOpen)}
              aria-label="Open notes board"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notes Board</TooltipContent>
        </Tooltip>


        {/* Theme picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Theme">
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">Mood Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {THEMES.map((t) => (
              <DropdownMenuItem
                key={t.name}
                onClick={() => setTheme(t.name)}
                className="gap-2"
              >
                <div
                  className="h-3.5 w-3.5 rounded-full border border-border"
                  style={{ backgroundColor: t.color }}
                />
                <span>{t.label}</span>
                {theme === t.name && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Profile">
              <UserCircle2 className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-medium truncate">{user?.name || "User"}</span>
              <span className="text-[10px] font-normal text-muted-foreground truncate">
                {user?.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="gap-2">
              <Link to="/profile">
                <UserIcon className="h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>

            {!isExpert && (
              <div
                className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span>Dark mode</span>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  aria-label="Toggle dark mode"
                />
              </div>
            )}

            <DropdownMenuItem asChild className="gap-2">
              <Link to="/privacy">
                <ShieldCheck className="h-4 w-4" />
                Privacy & Consent
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout()} className="gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Menu - shown only on mobile */}
      <div className="flex md:hidden items-center gap-2">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] p-6 flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-xl font-bold">Menu</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-6 mt-6 flex-1 overflow-y-auto pr-1">
              {/* Credits */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-4 py-3">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Credits
                </span>
                <span className="text-sm font-bold tabular-nums">{credits}</span>
              </div>

              {/* Panels */}
              <div className="flex flex-col gap-1.5">
                <Button
                  variant={knowledgeOpen ? "secondary" : "ghost"}
                  className="justify-start gap-3 h-11 rounded-xl w-full"
                  onClick={() => {
                    setKnowledgeOpen(!knowledgeOpen);
                    setMobileMenuOpen(false);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  <span>Conversation Content</span>
                </Button>


                <Button
                  variant={boardOpen ? "secondary" : "ghost"}
                  className="justify-start gap-3 h-11 rounded-xl w-full"
                  onClick={() => {
                    setBoardOpen(!boardOpen);
                    setMobileMenuOpen(false);
                  }}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>Notes Board</span>
                </Button>
              </div>

              {/* Theme */}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <span className="text-xs font-medium text-muted-foreground px-2">Theme</span>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <Button
                      key={t.name}
                      variant={theme === t.name ? "secondary" : "outline"}
                      size="sm"
                      className="justify-start gap-2 rounded-xl h-10"
                      onClick={() => setTheme(t.name)}
                    >
                      <div
                        className="h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-xs truncate">{t.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Profile & Settings */}
              <div className="flex flex-col gap-2 pt-4 border-t border-border mt-auto">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>

                <Button asChild variant="ghost" className="justify-start gap-3 h-11 rounded-xl" onClick={() => setMobileMenuOpen(false)}>
                  <Link to="/profile">
                    <UserIcon className="h-4 w-4" />
                    View Profile
                  </Link>
                </Button>

                {!isExpert && (
                  <div className="flex items-center justify-between px-2 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      Dark mode
                    </span>
                    <Switch
                      checked={darkMode}
                      onCheckedChange={(checked) => {
                        setDarkMode(checked);
                      }}
                    />
                  </div>
                )}

                <Button asChild variant="ghost" className="justify-start gap-3 h-11 rounded-xl" onClick={() => setMobileMenuOpen(false)}>
                  <Link to="/privacy">
                    <ShieldCheck className="h-4 w-4" />
                    Privacy & Consent
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  className="justify-start gap-3 h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 w-full mt-2"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

    </header>
  );
};

export default ChatHeader;
