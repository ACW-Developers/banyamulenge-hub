import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Plus, Loader2, LogOut, UserPlus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/community")({
  component: CommunityPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function CommunityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("groups")
        .select("id, name, slug, description, cover_url, created_at, group_members(user_id)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const join = useMutation({
    mutationFn: async ({ groupId, member }: { groupId: string; member: boolean }) => {
      if (!user) return;
      if (member) {
        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", user.id);
      } else {
        await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function createGroup() {
    if (!user || !name.trim()) return;
    setBusy(true);
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("groups")
      .insert({
        created_by: user.id,
        name: name.trim(),
        slug,
        description: desc.trim() || null,
      })
      .select("id")
      .single();
    if (!error && data) {
      await supabase
        .from("group_members")
        .insert({ group_id: data.id, user_id: user.id, role: "owner" });
      toast.success("Group created");
      setOpen(false);
      setName("");
      setDesc("");
      qc.invalidateQueries({ queryKey: ["groups"] });
    } else if (error) {
      toast.error(error.message);
    }
    setBusy(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups & Communities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Join regional chapters, cultural circles, and interest-based groups.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a group</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nairobi Chapter"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createGroup} disabled={busy || !name.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
            const members = g.group_members ?? [];
            const isMember = user
              ? members.some((m: { user_id: string }) => m.user_id === user.id)
              : false;
            return (
              <div
                key={g.id}
                className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{g.name}</div>
                    <div className="text-xs text-gray-500">{members.length} members</div>
                  </div>
                </div>
                {g.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{g.description}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant={isMember ? "outline" : "default"}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => join.mutate({ groupId: g.id, member: isMember })}
                    disabled={join.isPending}
                  >
                    {isMember ? (
                      <>
                        <LogOut className="h-4 w-4" /> Leave
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" /> Join
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="secondary" asChild className="gap-1">
                    <Link
                      to="/community/$slug"
                      params={{ slug: g.slug }}
                      search={{ tab: "chat" }}
                    >
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="text-sm text-gray-600">No groups yet. Be the first to create one.</p>
        </div>
      )}
    </div>
  );
}
