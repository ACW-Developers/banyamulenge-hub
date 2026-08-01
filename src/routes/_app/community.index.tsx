import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Users,
  Plus,
  Loader2,
  LogOut,
  UserPlus,
  ArrowRight,
  Search,
  MessagesSquare,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export const Route = createFileRoute("/_app/community/")({
  head: () => ({
    meta: [
      { title: "Community Groups | Banyamulenge Hub" },
      {
        name: "description",
        content:
          "Discover and join Banyamulenge Hub community groups. Every group has its own private chat for members.",
      },
      { property: "og:title", content: "Community Groups | Banyamulenge Hub" },
      {
        property: "og:description",
        content: "Join community groups and chat with members in dedicated group conversations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

export type GroupRow = {
  id: string;
  title: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  last_message_at: string;
  conversation_participants: {
    user_id: string;
    profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
  }[];
};

function CommunityPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const { data: groups, isLoading } = useQuery({
    queryKey: ["community-groups"],
    queryFn: async (): Promise<GroupRow[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `id, title, description, avatar_url, created_by, last_message_at,
           conversation_participants(user_id, profiles!cp_user_profile_fkey(username, display_name, avatar_url))`,
        )
        .eq("is_group", true)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as GroupRow[]) ?? [];
    },
  });

  const membership = useMutation({
    mutationFn: async ({ groupId, member }: { groupId: string; member: boolean }) => {
      if (!user) throw new Error("Sign in first");
      if (member) {
        const { error } = await supabase
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", groupId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("conversation_participants")
          .insert({ conversation_id: groupId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast.success(v.member ? "You left the group" : "You joined the group");
      qc.invalidateQueries({ queryKey: ["community-groups"] });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function createGroup() {
    if (!user || !name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title: name.trim(),
        description: desc.trim() || null,
        is_group: true,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(false);
      toast.error(error?.message ?? "Could not create group");
      return;
    }
    const { error: cpErr } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: data.id, user_id: user.id });
    setBusy(false);
    if (cpErr) {
      toast.error(cpErr.message);
      return;
    }
    toast.success("Group created");
    setOpen(false);
    setName("");
    setDesc("");
    qc.invalidateQueries({ queryKey: ["community-groups"] });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    navigate({ to: "/community/$id", params: { id: data.id } });
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return groups ?? [];
    return (groups ?? []).filter(
      (g) =>
        (g.title ?? "").toLowerCase().includes(term) ||
        (g.description ?? "").toLowerCase().includes(term),
    );
  }, [groups, q]);

  const mine = filtered.filter((g) => g.conversation_participants.some((p) => p.user_id === user?.id));
  const others = filtered.filter(
    (g) => !g.conversation_participants.some((p) => p.user_id === user?.id),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Groups</h1>
          <p className="text-sm text-gray-500 mt-1">
            Join a group to unlock its private chat. Only members can read and send messages.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!user}>
              <Plus className="h-4 w-4" /> New group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a group</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Group name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nairobi Chapter"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="What is this group about?"
                />
              </div>
              <p className="text-xs text-gray-500">
                You become the group owner and can edit details, set the group icon, remove members
                or delete the group.
              </p>
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

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search groups..."
          className="pl-9 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center">
          <Users className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="text-sm text-gray-600">No groups yet. Create the first one.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {mine.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Your groups
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mine.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    isMember
                    isOwner={g.created_by === user?.id}
                    canManage={g.created_by === user?.id || isAdmin}
                    pending={membership.isPending}
                    onToggle={() => membership.mutate({ groupId: g.id, member: true })}
                  />
                ))}
              </div>
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Discover groups
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {others.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    isMember={false}
                    isOwner={false}
                    canManage={isAdmin}
                    pending={membership.isPending}
                    onToggle={() => membership.mutate({ groupId: g.id, member: false })}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  isMember,
  isOwner,
  canManage,
  pending,
  onToggle,
}: {
  group: GroupRow;
  isMember: boolean;
  isOwner: boolean;
  canManage: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  const members = group.conversation_participants ?? [];
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-12 w-12 rounded-xl">
          <AvatarImage src={group.avatar_url ?? undefined} className="object-cover" />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-bold truncate flex items-center gap-1.5">
            {group.title ?? "Group"}
            {isOwner && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="You own this" />}
          </div>
          <div className="text-xs text-gray-500">
            {members.length} member{members.length === 1 ? "" : "s"} ·{" "}
            {formatDistanceToNow(new Date(group.last_message_at), { addSuffix: true })}
          </div>
        </div>
      </div>
      {group.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{group.description}</p>
      )}
      <div className="flex gap-2 mt-auto">
        {isMember ? (
          <>
            <Button size="sm" asChild className="flex-1 gap-1">
              <Link to="/community/$id" params={{ id: group.id }}>
                <MessagesSquare className="h-4 w-4" /> Open chat
              </Link>
            </Button>
            {!isOwner && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={onToggle}
                disabled={pending}
              >
                <LogOut className="h-4 w-4" /> Exit
              </Button>
            )}
            {isOwner && (
              <Button size="sm" variant="secondary" asChild className="gap-1">
                <Link to="/community/$id" params={{ id: group.id }}>
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </>
        ) : (
          <>
            <Button size="sm" className="flex-1 gap-1" onClick={onToggle} disabled={pending}>
              <UserPlus className="h-4 w-4" /> Join group
            </Button>
            {canManage && (
              <Button size="sm" variant="secondary" asChild className="gap-1">
                <Link to="/community/$id" params={{ id: group.id }}>
                  Manage
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
