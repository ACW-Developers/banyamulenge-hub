import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
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
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
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

  const initial = (profile?.display_name || profile?.username || "U").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-9" />
          </Link>
          <div className="hidden md:flex flex-1 max-w-md ml-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search the community..." className="pl-9 bg-muted/40 border-transparent" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Link
              to={profile?.username ? "/profile/$username" : "/"}
              params={{ username: profile?.username ?? "" }}
              className="flex items-center gap-2"
            >
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_300px] gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-1">
            {nav.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                signOut().then(() => navigate({ to: "/auth" }));
              }}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground/70 hover:bg-muted transition"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          <Outlet />
        </main>

        {/* Right rail */}
        <aside className="hidden xl:block">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <h3 className="font-bold text-sm mb-3">Welcome, {profile?.display_name || profile?.username}</h3>
              <p className="text-xs text-muted-foreground">
                Share a story, upload a photo, or find a friend in the community.
              </p>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-primary to-primary-glow p-5 text-primary-foreground shadow-warm">
              <h3 className="font-bold text-sm">Heritage Tip</h3>
              <p className="text-xs mt-2 opacity-90">
                Our history is stronger when it's shared. Post a memory today.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur-md">
        <div className="grid grid-cols-5">
          {nav.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-3 text-[10px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
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
