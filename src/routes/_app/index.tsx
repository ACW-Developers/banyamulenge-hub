import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PostCard, PostComposer, type FeedPost } from "@/components/post-card";

export const Route = createFileRoute("/_app/")({
  component: FeedPage,
});

const feedKey = ["feed"] as const;

async function fetchFeed(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, user_id, content, image_url, created_at, is_announcement,
       author:profiles!posts_user_id_fkey(username, display_name, avatar_url),
       likes(user_id),
       comments(id)`,
    )
    .is("group_id", null)
    .order("is_announcement", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as unknown as FeedPost[]) ?? [];
}

function FeedPage() {
  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: feedKey,
    queryFn: fetchFeed,
    refetchInterval: 8000,
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("feed-posts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PostComposer queryKey={feedKey} />

      {isLoading ? (
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
        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
          <h3 className="text-lg font-bold">The feed is quiet</h3>
          <p className="text-sm text-gray-500 mt-1">
            Be the first to share something with the community.
          </p>
        </div>
      )}
    </div>
  );
}
