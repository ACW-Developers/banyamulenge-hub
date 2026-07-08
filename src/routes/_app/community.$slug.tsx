import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Loader2, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PostCard, PostComposer, type FeedPost } from "@/components/post-card";

export const Route = createFileRoute("/_app/community/$slug")({
  component: GroupPage,
});

function GroupPage() {
  const { slug } = useParams({ from: "/_app/community/$slug" });
  const { user } = useAuth();

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
           author:profiles!posts_user_id_fkey(username, display_name, avatar_url),
           likes(user_id),
           comments(id)`,
        )
        .eq("group_id", group!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as FeedPost[]) ?? [];
    },
  });

  const qc = useQueryClient();
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
    <div className="max-w-2xl mx-auto space-y-6">
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
            <div className="text-xs text-gray-500 mt-1">
              {members.length} members
            </div>
          </div>
        </div>
        {group.description && (
          <p className="mt-4 text-sm text-gray-600">{group.description}</p>
        )}
      </div>

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
    </div>
  );
}
