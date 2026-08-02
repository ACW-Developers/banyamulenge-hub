import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Users,
  Send,
  Settings,
  UserPlus,
  LogOut,
  Trash2,
  UserMinus,
  Crown,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Camera,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadMessageAttachment } from "@/lib/message-attachments";
import { uploadPostImage } from "@/lib/upload";
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
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/community/$id")({
  head: () => ({
    meta: [
      { title: "Group Chat | Banyamulenge Hub" },
      {
        name: "description",
        content: "Chat with members of your Banyamulenge Hub community group.",
      },
      { property: "og:title", content: "Group Chat | Banyamulenge Hub" },
      { property: "og:description", content: "Private group conversation for members only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupChatPage,
});

type Participant = {
  user_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

type GroupDetail = {
  id: string;
  title: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  is_group: boolean;
  conversation_participants: Participant[];
};

type GroupMessage = {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
};

function GroupChatPage() {
  const { id } = useParams({ from: "/_app/community/$id" });
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const groupKey = ["community-group", id] as const;
  const msgKey = ["community-group-messages", id] as const;

  const { data: group, isLoading } = useQuery({
    queryKey: groupKey,
    queryFn: async (): Promise<GroupDetail | null> => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `id, title, description, avatar_url, created_by, is_group,
           conversation_participants(user_id, profiles!cp_user_profile_fkey(username, display_name, avatar_url))`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as GroupDetail) ?? null;
    },
  });

  const members = useMemo(() => group?.conversation_participants ?? [], [group]);
  const isMember = !!user && members.some((m) => m.user_id === user.id);
  const isOwner = !!user && group?.created_by === user.id;
  const canManage = isOwner || isAdmin;

  const { data: messages } = useQuery({
    queryKey: msgKey,
    enabled: isMember,
    queryFn: async (): Promise<GroupMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, sender_id, content, created_at, attachment_url, attachment_type, attachment_name",
        )
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data as GroupMessage[]) ?? [];
    },
  });

  useEffect(() => {
    if (!isMember) return;
    const ch = supabase
      .channel(`community-group-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: msgKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, isMember, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function send() {
    if (!user || !text.trim()) return;
    const body = text.trim();
    setText("");
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: user.id, content: body });
    setSending(false);
    if (error) {
      setText(body);
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: msgKey });
  }

  async function sendAttachment(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const att = await uploadMessageAttachment(file, user.id);
      const { error } = await supabase.from("messages").insert({
        conversation_id: id,
        sender_id: user.id,
        content: "",
        attachment_url: att.url,
        attachment_type: att.type,
        attachment_name: att.name,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: msgKey });
    } catch (e) {
      toast.error((e as Error).message);
    }
    setUploading(false);
  }

  async function deleteMessage(messageId: string) {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: msgKey });
  }

  async function join() {
    if (!user) return;
    const { error } = await supabase
      .from("conversation_participants")
      .insert({ conversation_id: id, user_id: user.id });
    if (error) return toast.error(error.message);
    toast.success("You joined the group");
    qc.invalidateQueries({ queryKey: groupKey });
    qc.invalidateQueries({ queryKey: ["community-groups"] });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
  }

  async function leave() {
    if (!user) return;
    const { error } = await supabase
      .from("conversation_participants")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("You left the group");
    qc.invalidateQueries({ queryKey: ["community-groups"] });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    navigate({ to: "/community" });
  }

  async function removeMember(userId: string) {
    const { error } = await supabase
      .from("conversation_participants")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    qc.invalidateQueries({ queryKey: groupKey });
  }

  async function deleteGroup() {
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Group deleted");
    qc.invalidateQueries({ queryKey: ["community-groups"] });
    qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    navigate({ to: "/community" });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!group || !group.is_group) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-gray-500">Group not found.</p>
        <Link to="/community" className="text-primary text-sm">
          Back to Community
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link
        to="/community"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>

      <div className="rounded-2xl border bg-white p-5 shadow-sm flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16 rounded-2xl">
          <AvatarImage src={group.avatar_url ?? undefined} className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-[180px]">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{group.title ?? "Group"}</h1>
          <div className="text-xs text-gray-500 mt-1">
            {members.length} member{members.length === 1 ? "" : "s"}
          </div>
          {group.description && (
            <p className="text-sm text-gray-600 mt-2">{group.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMember ? (
            <Button variant="outline" className="gap-2" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" /> Group info
            </Button>
          ) : (
            <Button className="gap-2" onClick={join} disabled={!user}>
              <UserPlus className="h-4 w-4" /> Join group
            </Button>
          )}
        </div>
      </div>

      {isMember ? (
        <div className="rounded-2xl border bg-white shadow-sm flex flex-col h-[62vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/60">
            {messages && messages.length > 0 ? (
              messages.map((m) => {
                const mine = m.sender_id === user?.id;
                const sender = members.find((p) => p.user_id === m.sender_id)?.profiles;
                const name = sender?.display_name || sender?.username || "Member";
                return (
                  <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={sender?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`max-w-[75%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {!mine && <div className="text-xs text-gray-500 mb-0.5 px-1">{name}</div>}
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm break-words ${
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-white border rounded-bl-sm"
                        }`}
                      >
                        {m.attachment_url ? (
                          m.attachment_type?.startsWith("image/") ? (
                            <a href={m.attachment_url} target="_blank" rel="noreferrer">
                              <img
                                loading="lazy"
                                decoding="async"
                                src={m.attachment_url}
                                alt={m.attachment_name ?? "Shared image"}
                                className="rounded-lg max-h-64 object-cover"
                                
                              />
                            </a>
                          ) : (
                            <a
                              href={m.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 underline"
                            >
                              <FileText className="h-4 w-4" />
                              {m.attachment_name ?? "Attachment"}
                            </a>
                          )
                        ) : (
                          m.content
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 px-1">
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(m.created_at), "p")}
                        </span>
                        {(mine || canManage) && (
                          <button
                            onClick={() => deleteMessage(m.id)}
                            className="text-[10px] text-gray-400 hover:text-red-500"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-sm text-gray-500">
                No messages yet. Say hello 👋
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t p-3 flex items-center gap-2 bg-white rounded-b-2xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => imgRef.current?.click()}
              disabled={uploading}
              aria-label="Attach image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message the group..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button onClick={send} disabled={sending || uploading || !text.trim()} className="gap-2">
              {sending || uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-amber-50 border-amber-200 p-8 text-center text-sm text-amber-800">
          This group's chat is private. Join the group to read and send messages.
        </div>
      )}

      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) sendAttachment(f);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) sendAttachment(f);
          e.target.value = "";
        }}
      />

      <GroupInfoDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        group={group}
        members={members}
        canManage={canManage}
        currentUserId={user?.id ?? null}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: groupKey });
          qc.invalidateQueries({ queryKey: ["community-groups"] });
          qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
        }}
        onRemoveMember={removeMember}
        onLeave={leave}
        onDelete={deleteGroup}
      />
    </div>
  );
}

function GroupInfoDialog({
  open,
  onOpenChange,
  group,
  members,
  canManage,
  currentUserId,
  onSaved,
  onRemoveMember,
  onLeave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: GroupDetail;
  members: Participant[];
  canManage: boolean;
  currentUserId: string | null;
  onSaved: () => void;
  onRemoveMember: (userId: string) => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(group.title ?? "");
  const [description, setDescription] = useState(group.description ?? "");
  const [saving, setSaving] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(group.title ?? "");
    setDescription(group.description ?? "");
  }, [group.id, group.title, group.description]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("conversations")
      .update({ title: title.trim() || "Group", description: description.trim() || null })
      .eq("id", group.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Group updated");
    onSaved();
  }

  async function uploadIcon(file: File) {
    if (!currentUserId) return;
    setIconBusy(true);
    try {
      const url = await uploadPostImage(file, currentUserId);
      const { error } = await supabase
        .from("conversations")
        .update({ avatar_url: url })
        .eq("id", group.id);
      if (error) throw error;
      toast.success("Group icon updated");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setIconBusy(false);
  }

  const isOwnerOf = (userId: string) => group.created_by === userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Group info</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 rounded-2xl">
                <AvatarImage src={group.avatar_url ?? undefined} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                  <Users className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              {canManage && (
                <button
                  onClick={() => iconRef.current?.click()}
                  disabled={iconBusy}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"
                  aria-label="Change group icon"
                >
                  {iconBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {canManage
                ? "Tap the camera to upload a group icon from your device."
                : "Only the group owner can change these details."}
            </div>
          </div>

          {canManage ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Group name</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">
              Members ({members.length})
            </div>
            <div className="divide-y rounded-xl border">
              {members.map((m) => {
                const name = m.profiles?.display_name || m.profiles?.username || "Member";
                return (
                  <div key={m.user_id} className="flex items-center gap-3 p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                        {name}
                        {isOwnerOf(m.user_id) && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Owner" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        @{m.profiles?.username ?? "member"}
                      </div>
                    </div>
                    {canManage && !isOwnerOf(m.user_id) && m.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 gap-1"
                        onClick={() => onRemoveMember(m.user_id)}
                      >
                        <UserMinus className="h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentUserId && group.created_by !== currentUserId && (
            <Button variant="outline" className="gap-2" onClick={onLeave}>
              <LogOut className="h-4 w-4" /> Exit group
            </Button>
          )}
          {canManage && (
            <Button variant="destructive" className="gap-2" onClick={onDelete}>
              <Trash2 className="h-4 w-4" /> Delete group
            </Button>
          )}
          <Button variant="ghost" className="gap-2" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" /> Close
          </Button>
        </DialogFooter>

        <input
          ref={iconRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadIcon(f);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
