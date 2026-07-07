import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Shield, ShieldOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/tracking";

export const Route = createFileRoute("/_app/admin/users")({
  component: UsersAdmin,
});

type Row = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  created_at: string;
  roles: string[];
};

function UsersAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async (): Promise<Row[]> => {
      let query = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, location, bio, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (q) query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      const { data: profiles } = await query;
      const ids = (profiles ?? []).map((p) => p.id);
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] as { user_id: string; role: string }[] };
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
      logActivity(user?.id ?? null, isAdmin ? "role.revoke.admin" : "role.grant.admin", "user", userId);
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEdit = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: row.display_name,
          username: row.username,
          location: row.location,
          bio: row.bio,
        })
        .eq("id", row.id);
      if (error) throw error;
      logActivity(user?.id ?? null, "user.update", "user", row.id);
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (row: Row) => {
      // Delete profile row (auth account remains but profile & content cascades where linked)
      const { error } = await supabase.from("profiles").delete().eq("id", row.id);
      if (error) throw error;
      logActivity(user?.id ?? null, "user.delete", "user", row.id);
    },
    onSuccess: () => {
      toast.success("User profile removed");
      setConfirmDel(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          View all members. Edit profiles, remove accounts, grant or revoke admin.
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
              const self = u.id === user?.id;
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
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(u)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={isAdminUser ? "outline" : "default"}
                        size="sm"
                        disabled={toggleAdmin.isPending || self}
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
                            <Shield className="h-3 w-3" /> Admin
                          </>
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={self}
                        onClick={() => setConfirmDel(u)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update profile details.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Display name</Label>
                <Input
                  value={editing.display_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={editing.username}
                  onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={editing.location ?? ""}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Textarea
                  value={editing.bio ?? ""}
                  onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editing && saveEdit.mutate(editing)}
              disabled={saveEdit.isPending}
            >
              {saveEdit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user profile</DialogTitle>
            <DialogDescription>
              This removes the profile, posts, and related content. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDel && deleteUser.mutate(confirmDel)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
