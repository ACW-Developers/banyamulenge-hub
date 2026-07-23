import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home,
  Users,
  MessageCircle,
  Compass,
  User as UserIcon,
  LogOut,
  Loader2,
  Bell,
  Search,
  Shield,
  Settings,
  Activity,
  ChevronDown,
  Menu,
  X,
  Landmark,
  Trees,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { LanguageSelector } from "@/components/language-selector";

import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trackVisit, logActivity } from "@/lib/tracking";
import { useNotifications } from "@/lib/notifications";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, loading, profile, signOut, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openMenu, setOpenMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop: expanded vs. collapsed to icons
  const [mobileOpen, setMobileOpen] = useState(false);
  const notif = useNotifications();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleHardRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      qc.clear();
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      try {
        const lang = localStorage.getItem("app.lang");
        sessionStorage.clear();
        // preserve auth + language; clear app-cached UI keys
        Object.keys(localStorage)
          .filter((k) => k.startsWith("app.cache.") || k.startsWith("notif."))
          .forEach((k) => localStorage.removeItem(k));
        if (lang) localStorage.setItem("app.lang", lang);
      } catch {
        /* ignore */
      }
      toast.success("Cache cleared. Reloading…");
      setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error("Failed to clear cache");
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    trackVisit(pathname, user.id);
    logActivity(user.id, "page.view", "route", pathname);
    if (pathname === "/") notif.markSeen("feed");
    else if (pathname === "/explore") notif.markSeen("followers");
  }, [pathname, user, notif]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalNotif = notif.unreadMessages + notif.newPosts + notif.newFollowers;

  const nav = [
    { to: "/", label: "Home", icon: Home, badge: notif.newPosts },
    { to: "/explore", label: "Explore", icon: Compass, badge: notif.newFollowers },
    { to: "/community", label: "Community", icon: Users, badge: 0 },
    { to: "/messages", label: "Messages", icon: MessageCircle, badge: notif.unreadMessages },
    { to: "/heritage", label: "Our Heritage", icon: Landmark, badge: 0 },
    { to: "/family-tree", label: "Family Tree", icon: Trees, badge: 0 },
    {
      to: profile?.username ? `/profile/${profile.username}` : "/",
      label: "Profile",
      icon: UserIcon,
      badge: notif.newFollowers,
    },
  ];

  const adminNav = [
    { to: "/admin", label: "Admin", icon: Shield, badge: 0 },
    { to: "/admin/users", label: "User Management", icon: Users, badge: 0 },
    { to: "/admin/logs", label: "Activity Logs", icon: Activity, badge: 0 },
    { to: "/admin/settings", label: "Settings", icon: Settings, badge: 0 },
  ];

  const initial = (profile?.display_name || profile?.username || "U").slice(0, 1).toUpperCase();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  const sidebarWidth = sidebarOpen ? "w-64" : "w-16";

  const NavItem = ({
    to,
    label,
    icon: Icon,
    badge,
    collapsed,
  }: {
    to: string;
    label: string;
    icon: typeof Home;
    badge: number;
    collapsed: boolean;
  }) => {
    const active = isActive(to);
    const link = (
      <Link
        to={to}
        className={`relative flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-primary/10 text-primary border border-primary/20"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <span className="relative flex items-center">
          <Icon className="h-4 w-4" />
          {badge > 0 && (
            <span
              className={`absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ${collapsed ? "" : ""}`}
            >
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
    if (!collapsed) return link;
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">
          {label}
          {badge > 0 && (
            <span className="ml-2 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5">
              {badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50/70">
        {/* Desktop sidebar */}
        <aside
          className={`hidden lg:flex fixed top-0 left-0 bottom-0 flex-col bg-white border-r z-30 transition-all duration-300 ${sidebarWidth}`}
        >
          <div
            className={`h-16 flex items-center border-b ${sidebarOpen ? "px-5" : "justify-center px-2"}`}
          >
            <Link to="/" className="flex items-center gap-2 min-w-0">
              {sidebarOpen ? (
                <Logo variant="horizontal" className="h-9 w-auto object-contain" />
              ) : (
                <Logo variant="stacked" className="h-9 w-9 object-contain" />
              )}
            </Link>
          </div>
          <nav className={`flex-1 overflow-y-auto py-3 space-y-1 ${sidebarOpen ? "px-3" : "px-2"}`}>
            {sidebarOpen && (
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Main
              </div>
            )}
            {nav.map((item) => (
              <NavItem key={item.label} {...item} collapsed={!sidebarOpen} />
            ))}
            {isAdmin && (
              <>
                {sidebarOpen && (
                  <div className="px-3 pt-5 pb-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Administration
                  </div>
                )}
                {!sidebarOpen && <div className="my-3 border-t" />}
                {adminNav.map((item) => (
                  <NavItem key={item.label} {...item} collapsed={!sidebarOpen} />
                ))}
              </>
            )}
          </nav>
          <div className={`p-3 border-t ${sidebarOpen ? "" : "px-2"}`}>
            {sidebarOpen ? (
              <button
                onClick={() => signOut().then(() => navigate({ to: "/auth" }))}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => signOut().then(() => navigate({ to: "/auth" }))}
                    className="w-full flex items-center justify-center rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={`lg:hidden fixed top-0 left-0 bottom-0 w-64 flex flex-col bg-white border-r z-50 transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-16 flex items-center justify-between px-5 border-b">
            <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <Logo variant="horizontal" className="h-9 w-auto object-contain" />
            </Link>
            <button onClick={() => setMobileOpen(false)} className="text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {[...nav, ...(isAdmin ? adminNav : [])].map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="relative flex items-center">
                    <Icon className="h-4 w-4" />
                    {item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className={`transition-all duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-16"}`}>
          <header className="sticky top-0 z-20 bg-white border-b h-16 flex items-center px-4 sm:px-6 gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="text-gray-600 shrink-0 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {/* Desktop collapse toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-gray-600 shrink-0 hidden lg:inline-flex"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden md:flex flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." className="pl-9 h-10 bg-gray-50 border-gray-200" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <LanguageSelector />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleHardRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-600 transition disabled:opacity-50"
                    aria-label="Refresh & clear cache"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Clear cache & refresh</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/messages"
                    onClick={() => notif.markSeen("all")}
                    className="relative inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-600 transition"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {totalNotif > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {totalNotif > 9 ? "9+" : totalNotif}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {totalNotif > 0
                    ? `${notif.unreadMessages} messages · ${notif.newPosts} posts · ${notif.newFollowers} followers`
                    : "No new notifications"}
                </TooltipContent>
              </Tooltip>
              <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 border border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-sm font-semibold text-gray-900">
                        {profile?.display_name || profile?.username}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {isAdmin ? "Administrator" : "Member"}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span>{profile?.display_name || profile?.username}</span>
                    <span className="text-xs text-gray-500 font-normal">@{profile?.username}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile/$username"
                      params={{ username: profile?.username ?? "" }}
                      className="cursor-pointer"
                    >
                      <UserIcon className="h-4 w-4 mr-2" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut().then(() => navigate({ to: "/auth" }))}
                    className="text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-white">
          <div className="grid grid-cols-5">
            {[nav[0], nav[1], nav[2], nav[3], nav[nav.length - 1]].map((item) => {
              const active = isActive(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`relative flex flex-col items-center gap-1 py-3 text-[10px] font-medium ${
                    active ? "text-primary" : "text-gray-500"
                  }`}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </TooltipProvider>
  );
}
