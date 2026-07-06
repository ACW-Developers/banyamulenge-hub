import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Shield, ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/admin/users")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, location, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      const { data: profiles } = await query;
      const ids = (profiles ?? []).map((p) => p.id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] };
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      }
      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        action: isAdmin ? "role.revoke.admin" : "role.grant.admin",
        target_type: "user",
        target_id: userId,
      });
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all members. Grant or revoke administrator access.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users..."
          className="pl-9 bg-white"
        />
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Location</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary inline" />
                </td>
              </tr>
            )}
            {data?.map((u) => {
              const isAdminUser = u.roles.includes("admin");
              const initial = (u.display_name || u.username).slice(0, 1).toUpperCase();
              return (
                <tr key={u.id} className="border-t hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{u.display_name || u.username}</div>
                        <div className="text-xs text-gray-500">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {u.location || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isAdminUser ? (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                        <Shield className="h-3 w-3 mr-1" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Member</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={isAdminUser ? "outline" : "default"}
                      size="sm"
                      disabled={toggleAdmin.isPending || u.id === user?.id}
                      onClick={() =>
                        toggleAdmin.mutate({ userId: u.id, isAdmin: isAdminUser })
                      }
                      className="gap-1"
                    >
                      {isAdminUser ? (
                        <>
                          <ShieldOff className="h-3 w-3" /> Revoke
                        </>
                      ) : (
                        <>
                          <Shield className="h-3 w-3" /> Make Admin
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
