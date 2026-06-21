import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetMe, useListNotifications, useMarkAllNotificationsRead, useGetCreditsBalance, useGetOrg } from "@workspace/api-client-react";
import { getInitials, cn } from "@/lib/utils";
import {
  LayoutDashboard, MessageSquare, BookOpen, StickyNote, FlaskConical,
  Users, Building2, Megaphone, Bell, Settings, ChevronLeft, ChevronRight,
  LogOut, Menu, X, Zap, ChevronsUpDown, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { getListNotificationsQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/chat", label: "Chat", icon: MessageSquare },
  { href: "/app/modules", label: "Modules", icon: BookOpen },
  { href: "/app/notes", label: "Notes", icon: StickyNote },
  { href: "/app/tests", label: "Tests", icon: FlaskConical },
];

const bottomItems = [
  { href: "/app/profile", label: "Profile & Settings", icon: Settings },
];

function NavItem({ href, label, icon: Icon, collapsed, exact }: {
  href: string; label: string; icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean; exact?: boolean;
}) {
  const [location] = useLocation();
  const active = exact ? location === href : location.startsWith(href);

  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-3 py-3 cursor-pointer transition-all duration-150 group",
        active
          ? "bg-primary/15 text-primary rounded-r-full mr-4 pl-6 pr-4"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-r-full mr-4 pl-6 pr-4",
        collapsed && "justify-center px-0 w-12 mx-auto rounded-xl mr-auto ml-auto"
      )}>
        <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
        {!collapsed && <span className="text-[15px] font-medium truncate">{label}</span>}
        {collapsed && (
          <span className="sr-only">{label}</span>
        )}
      </div>
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const { data: user } = useGetMe();
  const { data: org } = useGetOrg();
  const { data: notifications } = useListNotifications();
  const { data: credits } = useGetCreditsBalance();
  const queryClient = useQueryClient();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast.success("All notifications marked as read");
      }
    });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[280px]",
        "hidden lg:flex",
        mobileOpen && "flex w-[280px]"
      )}>
        {/* Logo */}
        <div className={cn(
          "h-16 flex items-center border-b border-border pl-6 pr-4 shrink-0",
          collapsed && "justify-center px-0"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              OB
            </div>
            {!collapsed && <span className="font-bold text-[15px] tracking-tight truncate">OpenBALC</span>}
          </div>
        </div>
        
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {navItems.map(item => (
            <NavItem key={item.href} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-border py-4 space-y-1">
          {bottomItems.map(item => (
            <NavItem key={item.href} {...item} collapsed={collapsed} />
          ))}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-3 py-3 rounded-r-full mr-4 pl-6 pr-4 text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-colors",
              collapsed && "justify-center px-0 w-12 mx-auto rounded-xl mr-auto ml-auto"
            )}
          >
            {collapsed
              ? <ChevronRight className="h-5 w-5 mx-auto" />
              : <><ChevronLeft className="h-5 w-5" /><span className="text-[15px]">Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-200",
        collapsed ? "lg:ml-[72px]" : "lg:ml-[280px]"
      )}>
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center px-6 gap-4">
          <button className="lg:hidden p-2 rounded-md hover:bg-muted shrink-0" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu className="h-6 w-6" />
          </button>

          {/* Workspace Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-foreground hover:bg-muted/60 border border-border bg-card">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate max-w-[160px]">
                  {org?.name || "Workspace"}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="w-[220px]">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Workspaces
              </div>
              <DropdownMenuItem className="cursor-pointer font-medium bg-accent/25">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    {org?.name ? getInitials(org.name) : "W"}
                  </div>
                  <span className="flex-1 truncate">{org?.name || "Primary Workspace"}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-muted-foreground hover:text-foreground">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                    S
                  </div>
                  <span className="flex-1 truncate">Secondary Workspace</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link href="/app/org" className="cursor-pointer w-full flex items-center text-muted-foreground hover:text-foreground">
                  <Settings className="h-4 w-4 mr-2 shrink-0" />
                  <span>Workspace Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-muted-foreground hover:text-foreground">
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                <span>New Workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Credits badge */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-base font-medium">
              <Zap className="h-4 w-4" />
              <span>{credits?.balance ?? user?.credits ?? 0}</span>
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-sm font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={handleMarkAllRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!Array.isArray(notifications) || notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className={cn("px-3 py-3 border-b border-border last:border-0", !n.read && "bg-primary/5")}>
                      <div className="flex items-start gap-2">
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                        <div className={!n.read ? "" : "pl-3.5"}>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                  {user?.avatarUrl
                    ? <img src={user.avatarUrl} className="h-10 w-10 rounded-full object-cover" alt="" />
                    : <div className="h-10 w-10 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">
                        {user ? getInitials(user.displayName || user.username) : "?"}
                      </div>
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
                  <p className="text-xs text-muted-foreground">@{user?.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/profile">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
