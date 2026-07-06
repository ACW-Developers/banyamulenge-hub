import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, FileText, MessageCircle, Activity, TrendingUp, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, posts, groups, msgs, logs, admins] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("groups").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("activity_logs").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      ]);
      return {
        users: users.count ?? 0,
        posts: posts.count ?? 0,
        groups: groups.count ?? 0,
        msgs: msgs.count ?? 0,
        logs: logs.count ?? 0,
        admins: admins.count ?? 0,
      };
    },
  });

  const { data: latestUsers } = useQuery({
    queryKey: ["admin-latest-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.users, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Posts", value: stats?.posts, icon: FileText, color: "text-orange-600 bg-orange-50" },
    { label: "Groups", value: stats?.groups, icon: Users, color: "text-purple-600 bg-purple-50" },
    { label: "Messages", value: stats?.msgs, icon: MessageCircle, color: "text-emerald-600 bg-emerald-50" },
    { label: "Activity Logs", value: stats?.logs, icon: Activity, color: "text-pink-600 bg-pink-50" },
    { label: "Admins", value: stats?.admins, icon: Shield, color: "text-amber-600 bg-amber-50" },
  ];

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Banyamulenge Community Heritage — Platform Overview</p>
        </div>
        <div className="text-sm text-gray-500">{format(today, "EEEE, MMMM d, yyyy")}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {c.label}
                  </div>
                  <div className="text-2xl font-bold mt-1">{c.value ?? "—"}</div>
                </div>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Recent Sign-ups</h2>
          </div>
          <div className="space-y-3">
            {latestUsers?.map((u) => {
              const initial = (u.display_name || u.username).slice(0, 1).toUpperCase();
              return (
                <Link
                  key={u.id}
                  to="/profile/$username"
                  params={{ username: u.username }}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center overflow-hidden">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {u.display_name || u.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">@{u.username}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(u.created_at), "MMM d")}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/admin/users"
              className="rounded-xl border p-4 hover:border-primary/50 hover:bg-primary/5 transition"
            >
              <Users className="h-5 w-5 text-primary mb-2" />
              <div className="font-semibold text-sm">Manage Users</div>
              <div className="text-xs text-gray-500 mt-1">Roles & members</div>
            </Link>
            <Link
              to="/admin/logs"
              className="rounded-xl border p-4 hover:border-primary/50 hover:bg-primary/5 transition"
            >
              <Activity className="h-5 w-5 text-primary mb-2" />
              <div className="font-semibold text-sm">Activity Logs</div>
              <div className="text-xs text-gray-500 mt-1">Recent actions</div>
            </Link>
            <Link
              to="/admin/settings"
              className="rounded-xl border p-4 hover:border-primary/50 hover:bg-primary/5 transition"
            >
              <Shield className="h-5 w-5 text-primary mb-2" />
              <div className="font-semibold text-sm">Platform Settings</div>
              <div className="text-xs text-gray-500 mt-1">Configuration</div>
            </Link>
            <Link
              to="/community"
              className="rounded-xl border p-4 hover:border-primary/50 hover:bg-primary/5 transition"
            >
              <Users className="h-5 w-5 text-primary mb-2" />
              <div className="font-semibold text-sm">View Community</div>
              <div className="text-xs text-gray-500 mt-1">Groups</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
