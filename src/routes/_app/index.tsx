import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PostCard, PostComposer, type FeedPost } from "@/components/post-card";
import { AdvertsPanel } from "@/components/adverts-panel";
import { markFeedSeen } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n";

const OG_IMAGE = "https://project--b0b87b03-ed7f-478e-8e23-548029db89f9.lovable.app/favicon.png";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Community Feed | Banyamulenge Community Heritage" },
      {
        name: "description",
        content:
          "Share stories, photos and announcements with the Banyamulenge community around the world.",
      },
      { property: "og:title", content: "Community Feed | Banyamulenge Community Heritage" },
      {
        property: "og:description",
        content: "Share stories, photos and announcements with the Banyamulenge community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: FeedPage,
  errorComponent: FeedError,
});

function FeedError({ reset }: { reset: () => void }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <h2 className="text-lg font-bold">The feed didn't load</h2>
      <p className="text-sm text-gray-500 mt-1">Check your connection and try again.</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}

const feedKey = ["feed"] as const;

const FEED_LIMIT = 40;

async function fetchFeed(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, user_id, content, image_url, image_urls, video_url, created_at, is_announcement,
       author:profiles!posts_author_profile_fkey(username, display_name, avatar_url),
       likes(user_id),
       comments(id)`,
    )
    .is("group_id", null)
    .order("is_announcement", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (error) throw error;
  return (data as unknown as FeedPost[]) ?? [];
}

function FeedPage() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const { data: posts, isLoading } = useQuery({
    queryKey: feedKey,
    queryFn: fetchFeed,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // Mark feed as seen once loaded
  useEffect(() => {
    if (posts) markFeedSeen();
  }, [posts]);

  // Realtime updates for posts, likes, comments (coalesced to avoid refetch storms)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => qc.invalidateQueries({ queryKey: feedKey }), 600);
    };
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, invalidate)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc]);


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          {t("title.community")}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-500">{t("title.communitySub")}</p>
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
              <h3 className="text-lg font-bold">{t("feed.empty")}</h3>
              <p className="text-sm text-gray-500 mt-1">{t("feed.emptySub")}</p>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <AdvertsPanel />
        </div>
      </div>
    </div>
  );
}
