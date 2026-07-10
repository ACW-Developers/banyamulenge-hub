import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const LAST_SEEN_FEED = "notif:lastSeenFeed";
const LAST_SEEN_FOLLOWERS = "notif:lastSeenFollowers";

function getLastSeen(key: string): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  return localStorage.getItem(key) ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
}

export function markFeedSeen() {
  if (typeof window !== "undefined") localStorage.setItem(LAST_SEEN_FEED, new Date().toISOString());
}
export function markFollowersSeen() {
  if (typeof window !== "undefined")
    localStorage.setItem(LAST_SEEN_FOLLOWERS, new Date().toISOString());
}

export type NotificationCounts = {
  unreadMessages: number;
  newPosts: number;
  newFollowers: number;
};

export function useNotifications(): NotificationCounts {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async (): Promise<NotificationCounts> => {
      if (!user) return { unreadMessages: 0, newPosts: 0, newFollowers: 0 };

      // Unread messages: messages in my conversations that aren't mine and aren't read
      const { data: myConvs } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      const convIds = (myConvs ?? []).map((c) => c.conversation_id);
      let unreadMessages = 0;
      if (convIds.length) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .is("read_at", null);
        unreadMessages = count ?? 0;
      }

      const feedSince = getLastSeen(LAST_SEEN_FEED);
      const followersSince = getLastSeen(LAST_SEEN_FOLLOWERS);

      const [{ count: postsCount }, { count: followersCount }] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .is("group_id", null)
          .neq("user_id", user.id)
          .gt("created_at", feedSince),
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", user.id)
          .gt("created_at", followersSince),
      ]);

      return {
        unreadMessages,
        newPosts: postsCount ?? 0,
        newFollowers: followersCount ?? 0,
      };
    },
  });

  // Realtime refresh when any relevant table changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "follows" },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  return data ?? { unreadMessages: 0, newPosts: 0, newFollowers: 0 };
}
