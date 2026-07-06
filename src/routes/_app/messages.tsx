import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Loader2, Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openConversationWith } from "@/lib/messaging";
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

type ConversationRow = {
  id: string;
  last_message_at: string;
  conversation_participants: { user_id: string; profiles: { username: string; display_name: string | null; avatar_url: string | null } | null }[];
};

function MessagesPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(search.c ?? null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          `id, last_message_at,
           conversation_participants(user_id, profiles(username, display_name, avatar_url))`,
        )
        .order("last_message_at", { ascending: false });
      return (data ?? []) as unknown as ConversationRow[];
    },
  });

  const active = useMemo(
    () => convos?.find((c) => c.id === activeId) ?? null,
    [convos, activeId],
  );
  const otherParticipant = active?.conversation_participants.find((p) => p.user_id !== user?.id);

  const { data: messages } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", activeId!)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!user || !activeId || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: user.id,
      content: text.trim(),
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    qc.invalidateQueries({ queryKey: ["messages", activeId] });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Private conversations with community members.</p>
        </div>
        <NewChatDialog onOpened={setActiveId} />
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
                const p = other?.profiles;
                if (!p) return null;
                const initial = (p.display_name || p.username).slice(0, 1).toUpperCase();
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
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-sm truncate">
                          {p.display_name || p.username}
                        </div>
                        <div className="text-[10px] text-gray-400 shrink-0">
                          {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 truncate">@{p.username}</div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                No conversations yet.
              </div>
            )}
          </div>
        </div>

        {/* Message pane */}
        <div className="rounded-2xl border bg-white flex flex-col overflow-hidden">
          {active && otherParticipant?.profiles ? (
            <>
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherParticipant.profiles.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {(otherParticipant.profiles.display_name ||
                      otherParticipant.profiles.username)
                      .slice(0, 1)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">
                    {otherParticipant.profiles.display_name ||
                      otherParticipant.profiles.username}
                  </div>
                  <div className="text-xs text-gray-500">@{otherParticipant.profiles.username}</div>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
                {messages?.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-white border rounded-bl-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        <div className={`text-[10px] mt-1 ${mine ? "opacity-80" : "text-gray-400"}`}>
                          {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!messages || messages.length === 0) && (
                  <div className="text-center text-xs text-gray-400 py-8">
                    Send the first message.
                  </div>
                )}
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message..."
                  className="bg-gray-50 border-gray-200"
                />
                <Button onClick={send} disabled={sending || !text.trim()} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <MessageCircle className="h-12 w-12 text-primary mb-3" />
              <h3 className="font-bold">Select a conversation</h3>
              <p className="text-sm text-gray-500 mt-1">Or start a new one from anyone's profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
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
