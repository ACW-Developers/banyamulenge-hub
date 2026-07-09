import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Users, Send, MessageSquare, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PostCard, PostComposer, type FeedPost } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/community/$slug")({
  component: GroupPage,
});

type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

function GroupPage() {
  const { slug } = useParams({ from: "/_app/community/$slug" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"posts" | "chat">("posts");

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ["group", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name, slug, description, cover_url, created_by, group_members(user_id, role)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const feedKey = ["group-feed", group?.id] as const;

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: feedKey,
    enabled: !!group?.id,
    queryFn: async (): Promise<FeedPost[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `id, user_id, content, image_url, created_at, is_announcement,
           author:profiles!posts_author_profile_fkey(username, display_name, avatar_url),
           likes(user_id),
           comments(id)`,
        )
        .eq("group_id", group!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as FeedPost[]) ?? [];
    },
  });

  useEffect(() => {
    if (!group?.id) return;
    const gid = group.id;
    const ch = supabase
      .channel(`group-feed-${gid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `group_id=eq.${gid}` },
        () => qc.invalidateQueries({ queryKey: ["group-feed", gid] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" },
        () => qc.invalidateQueries({ queryKey: ["group-feed", gid] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" },
        () => qc.invalidateQueries({ queryKey: ["group-feed", gid] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [group?.id, qc]);

  if (loadingGroup) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!group) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Group not found.</p>
        <Link to="/community" className="text-primary text-sm">
          Back to Community
        </Link>
      </div>
    );
  }

  const members = group.group_members ?? [];
  const isMember = user ? members.some((m) => m.user_id === user.id) : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/community"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{group.name}</h1>
            <div className="text-xs text-gray-500 mt-1">{members.length} members</div>
          </div>
        </div>
        {group.description && (
          <p className="mt-4 text-sm text-gray-600">{group.description}</p>
        )}
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("posts")}
          className={`px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 border-b-2 -mb-px transition ${
            tab === "posts" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <FileText className="h-4 w-4" /> Posts
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 border-b-2 -mb-px transition ${
            tab === "chat" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Group chat
        </button>
      </div>

      {tab === "posts" ? (
        <>
          {isMember ? (
            <PostComposer groupId={group.id} queryKey={feedKey} />
          ) : (
            <div className="rounded-2xl border bg-amber-50 border-amber-200 p-4 text-sm text-amber-800">
              Join this group from the community page to post here.
            </div>
          )}
          {loadingPosts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} queryKey={feedKey} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">
              No posts in this group yet.
            </div>
          )}
        </>
      ) : (
        <GroupChat groupId={group.id} isMember={isMember} />
      )}
    </div>
  );
}

function GroupChat({ groupId, isMember }: { groupId: string; isMember: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const key = ["group-messages", groupId] as const;

  const { data: messages, isLoading } = useQuery({
    queryKey: key,
    enabled: isMember,
    queryFn: async (): Promise<GroupMessage[]> => {
      const { data, error } = await supabase
        .from("group_messages")
        .select("id, group_id, sender_id, content, created_at, sender:profiles!group_messages_sender_id_fkey(username, display_name, avatar_url)")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data as unknown as GroupMessage[]) ?? [];
    },
  });

  useEffect(() => {
    if (!isMember) return;
    const ch = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [groupId, isMember, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function send() {
    if (!user || !text.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, sender_id: user.id, content: text.trim() });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    qc.invalidateQueries({ queryKey: key });
  }

  if (!isMember) {
    return (
      <div className="rounded-2xl border bg-amber-50 border-amber-200 p-6 text-sm text-amber-800 text-center">
        Join this group to see and send chat messages.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm flex flex-col h-[60vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const name = m.sender?.display_name || m.sender?.username || "User";
            const initial = name.slice(0, 1).toUpperCase();
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={m.sender?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {!mine && <div className="text-xs text-gray-500 mb-0.5 px-1">{name}</div>}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-white border rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 px-1">
                    {format(new Date(m.created_at), "p")}
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
      <div className="border-t p-3 flex gap-2 bg-white rounded-b-2xl">
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
        <Button onClick={send} disabled={sending || !text.trim()} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
        </Button>
      </div>
    </div>
  );
}
