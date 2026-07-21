import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  Loader2,
  Plus,
  Search,
  Check,
  CheckCheck,
  Paperclip,
  Image as ImageIcon,
  Phone,
  PhoneOff,
  FileText,
  X,
  Users,
  UsersRound,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openConversationWith } from "@/lib/messaging";
import { uploadMessageAttachment } from "@/lib/message-attachments";
import { CallSession, type CallStatus } from "@/lib/call";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";

const searchSchema = z.object({ c: z.string().optional() });

export const Route = createFileRoute("/_app/messages")({
  validateSearch: searchSchema,
  component: MessagesPage,
});

type MessageRow = {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
};

type ConversationRow = {
  id: string;
  last_message_at: string;
  title: string | null;
  is_group: boolean;
  conversation_participants: {
    user_id: string;
    profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
  }[];
  messages: MessageRow[];
};

function MessagesPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(search.c ?? null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search.c) setActiveId(search.c);
  }, [search.c]);

  const { data: convos, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select(
          `id, last_message_at, title, is_group,
           conversation_participants(user_id, profiles!cp_user_profile_fkey(username, display_name, avatar_url)),
           messages(id, sender_id, content, created_at, delivered_at, read_at, attachment_url, attachment_type, attachment_name)`,
        )
        .order("last_message_at", { ascending: false });
      return (data ?? []) as unknown as ConversationRow[];
    },
  });

  const active = useMemo(() => convos?.find((c) => c.id === activeId) ?? null, [convos, activeId]);
  const otherParticipant = active?.conversation_participants.find((p) => p.user_id !== user?.id);

  const { data: messages } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, sender_id, content, created_at, delivered_at, read_at, attachment_url, attachment_type, attachment_name",
        )
        .eq("conversation_id", activeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  // Mark incoming messages as delivered/read as soon as they're on-screen.
  useEffect(() => {
    if (!user || !activeId || !messages) return;
    const incoming = messages.filter((m) => m.sender_id !== user.id);
    const needDelivered = incoming.filter((m) => !m.delivered_at).map((m) => m.id);
    const needRead = incoming.filter((m) => !m.read_at).map((m) => m.id);
    (async () => {
      const now = new Date().toISOString();
      if (needDelivered.length) {
        await supabase.from("messages").update({ delivered_at: now }).in("id", needDelivered);
      }
      if (needRead.length) {
        await supabase.from("messages").update({ read_at: now }).in("id", needRead);
        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      }
    })();
  }, [user, activeId, messages, qc]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`msg-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const row = (payload.new ?? payload.old) as { conversation_id?: string } | null;
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
        if (row?.conversation_id) {
          qc.invalidateQueries({ queryKey: ["messages", row.conversation_id] });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () =>
        qc.invalidateQueries({ queryKey: ["conversations", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!user || !activeId || !text.trim()) return;
    const body = text.trim();
    setText("");
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: user.id,
      content: body,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setText(body);
      return;
    }
    qc.invalidateQueries({ queryKey: ["messages", activeId] });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
  }

  async function sendAttachment(file: File) {
    if (!user || !activeId) return;
    setUploading(true);
    try {
      const att = await uploadMessageAttachment(file, user.id);
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeId,
        sender_id: user.id,
        content: "",
        attachment_url: att.url,
        attachment_type: att.type,
        attachment_name: att.name,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["messages", activeId] });
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    } catch (e) {
      toast.error((e as Error).message);
    }
    setUploading(false);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">
            Private conversations with community members.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewGroupDialog onOpened={setActiveId} />
          <NewChatDialog onOpened={setActiveId} />
        </div>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Convo list */}
        <div className="rounded-2xl border bg-white overflow-hidden flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." className="pl-9 bg-gray-50 border-gray-200" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : convos && convos.length > 0 ? (
              convos.map((c) => {
                const other = c.conversation_participants.find((p) => p.user_id !== user?.id);
                const p = c.is_group
                  ? {
                      username: c.title ?? "Group",
                      display_name: c.title ?? "Group",
                      avatar_url: null as string | null,
                    }
                  : other?.profiles;
                if (!p) return null;
                const initial = (p.display_name || p.username).slice(0, 1).toUpperCase();
                const sortedMsgs = [...(c.messages ?? [])].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                );
                const lastMsg = sortedMsgs[0];
                const unread = (c.messages ?? []).filter(
                  (m) => m.sender_id !== user?.id && !m.read_at,
                ).length;
                const lastIsMine = lastMsg && lastMsg.sender_id === user?.id;
                const lastText = lastMsg
                  ? lastMsg.attachment_url
                    ? lastMsg.attachment_type?.startsWith("image/")
                      ? "📷 Photo"
                      : `📎 ${lastMsg.attachment_name ?? "Attachment"}`
                    : lastMsg.content ?? ""
                  : "";
                const preview = lastMsg
                  ? `${lastIsMine ? "You: " : ""}${lastText}`
                  : "No messages yet";
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full flex items-center gap-3 p-3 border-b hover:bg-gray-50 transition text-left ${
                      activeId === c.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback
                        className={`${c.is_group ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"} font-semibold`}
                      >
                        {c.is_group ? <Users className="h-5 w-5" /> : initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={`text-sm truncate flex items-center gap-1.5 ${unread > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}
                        >
                          {c.is_group && (
                            <span className="text-[9px] uppercase tracking-wider bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 shrink-0">
                              Group
                            </span>
                          )}
                          <span className="truncate">{p.display_name || p.username}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 shrink-0">
                          {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div
                          className={`text-xs truncate flex-1 ${unread > 0 ? "text-gray-900 font-semibold" : "text-gray-500"}`}
                        >
                          {preview}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {lastIsMine && lastMsg && !c.is_group && (
                            <>
                              {lastMsg.read_at ? (
                                <CheckCheck className="h-3.5 w-3.5 text-sky-500" aria-label="Read" />
                              ) : lastMsg.delivered_at ? (
                                <CheckCheck className="h-3.5 w-3.5 text-gray-400" aria-label="Delivered" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-gray-400" aria-label="Sent" />
                              )}
                            </>
                          )}
                          {unread > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">No conversations yet.</div>
            )}
          </div>
        </div>

        {/* Message pane */}
        <div className="rounded-2xl border bg-white flex flex-col overflow-hidden">
          {active && user ? (
            <ChatPane
              key={active.id}
              convoId={active.id}
              userId={user.id}
              isGroup={active.is_group}
              groupTitle={active.title ?? "Group"}
              participants={active.conversation_participants.map((cp) => ({
                user_id: cp.user_id,
                profile: cp.profiles,
              }))}
              other={otherParticipant?.profiles ?? null}
              messages={messages ?? []}
              text={text}
              setText={setText}
              onSend={send}
              onPickImage={() => imgRef.current?.click()}
              onPickFile={() => fileRef.current?.click()}
              sending={sending}
              uploading={uploading}
              scrollRef={scrollRef}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <MessageCircle className="h-12 w-12 text-primary mb-3" />
              <h3 className="font-bold">Select a conversation</h3>
              <p className="text-sm text-gray-500 mt-1">
                Or start a new one from anyone's profile.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
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
    </div>
  );
}

type Profile = { username: string; display_name: string | null; avatar_url: string | null };

function ChatPane({
  convoId,
  userId,
  isGroup,
  groupTitle,
  participants,
  other,
  messages,
  text,
  setText,
  onSend,
  onPickImage,
  onPickFile,
  sending,
  uploading,
  scrollRef,
}: {
  convoId: string;
  userId: string;
  isGroup: boolean;
  groupTitle: string;
  participants: { user_id: string; profile: Profile | null }[];
  other: Profile | null;
  messages: MessageRow[];
  text: string;
  setText: (s: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onPickFile: () => void;
  sending: boolean;
  uploading: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const sessionRef = useRef<CallSession | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!userId || isGroup) return;
    const s = new CallSession(convoId, userId, {
      onStatus: setCallStatus,
      onRemoteStream: (stream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          void remoteAudioRef.current.play().catch(() => undefined);
        }
      },
      onError: (e) => toast.error(e.message),
    });
    sessionRef.current = s;
    s.init();
    return () => {
      s.dispose();
      sessionRef.current = null;
    };
  }, [convoId, userId, isGroup]);

  const startCall = () => sessionRef.current?.call();
  const acceptCall = () => sessionRef.current?.accept();
  const hangup = () => sessionRef.current?.hangup();

  const headerName = isGroup ? groupTitle : other?.display_name || other?.username || "Unknown";
  const headerSub = isGroup
    ? `${participants.length} members`
    : other?.username ? `@${other.username}` : "";
  const initial = (headerName || "?").slice(0, 1).toUpperCase();
  const inCall = !isGroup && callStatus !== "idle" && callStatus !== "ended";

  // Map user_id -> profile for group sender labels
  const profilesById = new Map(participants.map((p) => [p.user_id, p.profile] as const));

  return (
    <>
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={other?.avatar_url ?? undefined} />
          <AvatarFallback
            className={`${isGroup ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"} font-semibold`}
          >
            {isGroup ? <Users className="h-5 w-5" /> : initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{headerName}</div>
          <div className="text-xs text-gray-500 truncate">{headerSub}</div>
        </div>
        {!isGroup && !inCall && (
          <Button variant="outline" size="icon" onClick={startCall} aria-label="Start audio call" title="Start audio call">
            <Phone className="h-4 w-4 text-primary" />
          </Button>
        )}
        {!isGroup && inCall && (
          <Button variant="destructive" size="icon" onClick={hangup} aria-label="End call">
            <PhoneOff className="h-4 w-4" />
          </Button>
        )}
      </div>

      {inCall && (
        <div className="px-4 py-2 border-b bg-primary/5 text-xs flex items-center justify-between">
          <span className="font-medium text-primary">
            {callStatus === "ringing" && "Calling…"}
            {callStatus === "incoming" && "Incoming call"}
            {callStatus === "connecting" && "Connecting…"}
            {callStatus === "in-call" && "In call · audio"}
          </span>
          {callStatus === "incoming" && (
            <div className="flex gap-2">
              <Button size="sm" onClick={acceptCall} className="gap-1">
                <Phone className="h-3 w-3" /> Accept
              </Button>
              <Button size="sm" variant="destructive" onClick={hangup} className="gap-1">
                <PhoneOff className="h-3 w-3" /> Decline
              </Button>
            </div>
          )}
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay hidden />

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          const senderProfile = isGroup && !mine ? profilesById.get(m.sender_id) ?? null : null;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-white border rounded-bl-sm"
                }`}
              >
                {senderProfile && (
                  <div className="text-[11px] font-semibold text-primary mb-0.5">
                    {senderProfile.display_name || senderProfile.username}
                  </div>
                )}
                {m.attachment_url && (
                  <AttachmentBubble
                    url={m.attachment_url}
                    type={m.attachment_type}
                    name={m.attachment_name}
                    mine={mine}
                  />
                )}
                {m.content && (
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                )}
                <div
                  className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "opacity-90 justify-end" : "text-gray-400"}`}
                >
                  <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                  {mine &&
                    (m.read_at ? (
                      <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="Read" />
                    ) : m.delivered_at ? (
                      <CheckCheck className="h-3.5 w-3.5" aria-label="Delivered" />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-label="Sent" />
                    ))}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-8">Send the first message.</div>
        )}
      </div>

      <div className="p-3 border-t flex gap-2 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPickImage}
          disabled={uploading}
          aria-label="Attach image"
          title="Attach image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onPickFile}
          disabled={uploading}
          aria-label="Attach file"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={uploading ? "Uploading…" : "Type a message..."}
          className="bg-gray-50 border-gray-200"
          disabled={uploading}
        />
        <Button onClick={onSend} disabled={sending || !text.trim()} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

function AttachmentBubble({
  url,
  type,
  name,
  mine,
}: {
  url: string;
  type: string | null;
  name: string | null;
  mine: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isImg = type?.startsWith("image/");
  if (isImg) {
    return (
      <>
        <button onClick={() => setOpen(true)} className="block mb-1">
          <img
            src={url}
            alt={name ?? "attachment"}
            className="max-w-[240px] max-h-[240px] rounded-lg object-cover"
          />
        </button>
        {open && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <button
              className="absolute top-4 right-4 text-white p-2"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={url} alt={name ?? "attachment"} className="max-h-full max-w-full rounded-lg" />
          </div>
        )}
      </>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 mb-1 rounded-md px-2 py-1.5 text-xs font-medium underline ${mine ? "bg-white/10" : "bg-gray-100"}`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[180px]">{name ?? "Download"}</span>
    </a>
  );
}

function NewChatDialog({ onOpened }: { onOpened: (id: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: people } = useQuery({
    queryKey: ["people-search", query],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", user?.id ?? "")
        .limit(20);
      if (query) q = q.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  async function start(otherId: string) {
    if (!user) return;
    setBusy(otherId);
    try {
      const cid = await openConversationWith(user.id, otherId);
      onOpened(cid);
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search members..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-80 overflow-y-auto -mx-2">
          {people?.map((p) => {
            const initial = (p.display_name || p.username).slice(0, 1).toUpperCase();
            return (
              <button
                key={p.id}
                disabled={busy === p.id}
                onClick={() => start(p.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 text-left"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {p.display_name || p.username}
                  </div>
                  <div className="text-xs text-gray-500 truncate">@{p.username}</div>
                </div>
                {busy === p.id && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewGroupDialog({ onOpened }: { onOpened: (id: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data: people } = useQuery({
    queryKey: ["group-people-search", query],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", user?.id ?? "")
        .limit(30);
      if (query) q = q.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);
      const { data } = await q;
      return data ?? [];
    },
  });

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function create() {
    if (!user) return;
    const trimmed = title.trim();
    if (!trimmed) return toast.error("Please give the group a name");
    if (picked.size < 1) return toast.error("Pick at least one member");
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_group_conversation", {
        title: trimmed,
        member_ids: Array.from(picked),
      });
      if (error) throw error;
      if (!data) throw new Error("Could not create group");
      onOpened(data as string);
      setOpen(false);
      setTitle("");
      setPicked(new Set());
      setQuery("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UsersRound className="h-4 w-4" /> New group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a group chat</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Group name (e.g. Family Elders)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          placeholder="Search members to add..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {picked.size > 0 && (
          <div className="text-xs text-gray-500">{picked.size} selected</div>
        )}
        <div className="max-h-72 overflow-y-auto -mx-2">
          {people?.map((p) => {
            const initial = (p.display_name || p.username).slice(0, 1).toUpperCase();
            const isPicked = picked.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition ${
                  isPicked ? "bg-primary/10" : "hover:bg-gray-100"
                }`}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {p.display_name || p.username}
                  </div>
                  <div className="text-xs text-gray-500 truncate">@{p.username}</div>
                </div>
                <div
                  className={`h-5 w-5 rounded-md border flex items-center justify-center ${
                    isPicked ? "bg-primary border-primary text-primary-foreground" : "border-gray-300"
                  }`}
                >
                  {isPicked && <Check className="h-3.5 w-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
