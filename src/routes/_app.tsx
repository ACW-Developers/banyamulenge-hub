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
} from "lucide-react";

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

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, loading, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const nav = [
    { to: "/", label: "Home", icon: Home },
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/community", label: "Community", icon: Users },
    { to: "/messages", label: "Messages", icon: MessageCircle },
    {
      to: profile?.username ? `/profile/${profile.username}` : "/",
      label: "Profile",
      icon: UserIcon,
    },
  ];

  const adminNav = [
    { to: "/admin", label: "Admin", icon: Shield },
    { to: "/admin/users", label: "User Management", icon: Users },
    { to: "/admin/logs", label: "Activity Logs", icon: Activity },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const initial = (profile?.display_name || profile?.username || "U").slice(0, 1).toUpperCase();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-gray-50/70">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 flex-col bg-white border-r z-30">
        <div className="h-16 flex items-center px-5 border-b">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-9" />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
            Main
          </div>
          {nav.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <>
              <div className="px-3 pt-5 pb-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                Administration
              </div>
              {adminNav.map((item) => {
                const active = isActive(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        <div className="p-3 border-t">
          <button
            onClick={() => signOut().then(() => navigate({ to: "/auth" }))}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content wrapper */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <header className="sticky top-0 z-20 bg-white border-b h-16 flex items-center px-4 sm:px-6 gap-4">
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-9 h-10 bg-gray-50 border-gray-200"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-gray-600">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full pr-2 hover:bg-gray-100 transition p-1">
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
          {nav.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-3 text-[10px] font-medium ${
                  active ? "text-primary" : "text-gray-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
