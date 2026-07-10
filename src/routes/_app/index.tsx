import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PostCard, PostComposer, type FeedPost } from "@/components/post-card";
import { AdvertsPanel } from "@/components/adverts-panel";

export const Route = createFileRoute("/_app/")({
  component: FeedPage,
});

const feedKey = ["feed"] as const;

async function fetchFeed(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, user_id, content, image_url, created_at, is_announcement,
       author:profiles!posts_author_profile_fkey(username, display_name, avatar_url),
       likes(user_id),
       comments(id)`,
    )
    .is("group_id", null)
    .order("is_announcement", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as FeedPost[]) ?? [];
}

function FeedPage() {
  const qc = useQueryClient();
  const { data: posts, isLoading } = useQuery({
    queryKey: feedKey,
    queryFn: fetchFeed,
  });

  // Realtime updates for posts, likes, comments
  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: feedKey });
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Community</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-500">
          Share your stories, celebrate our heritage, and interact with fellow Banyamulenge across the globe.
        </p>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
      <div className="min-w-0 space-y-6">
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

      <div className="lg:sticky lg:top-20 lg:self-start">
        <AdvertsPanel />
      </div>
    </div>
  );
}
