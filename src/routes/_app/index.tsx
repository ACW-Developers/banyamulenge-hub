import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/")({
  component: FeedPage,
});

type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

async function fetchFeed(): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, user_id, content, image_url, created_at,
       author:profiles!posts_user_id_fkey(username, display_name, avatar_url),
       likes(user_id),
       comments(id)`,
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as unknown as FeedPost[]) ?? [];
}

function FeedPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { data: posts, isLoading } = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      setImageUrl("");
      toast.success("Posted!");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user) throw new Error("Not signed in");
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const initial = (profile?.display_name || profile?.username || "U").slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Composer */}
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Share something with the community, ${profile?.display_name || "friend"}...`}
              className="min-h-[80px] resize-none border-0 bg-muted/40 focus-visible:ring-1"
            />
            {imageUrl && (
              <div className="rounded-xl overflow-hidden border">
                <img src={imageUrl} alt="preview" className="w-full max-h-72 object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Optional image URL"
                  className="pl-9 text-sm"
                />
              </div>
              <Button
                disabled={!content.trim() || createPost.isPending}
                onClick={() => createPost.mutate()}
                className="gap-2"
              >
                {createPost.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((p) => {
            const liked = user ? p.likes.some((l) => l.user_id === user.id) : false;
            const authorInitial = (p.author?.display_name || p.author?.username || "?")
              .slice(0, 1)
              .toUpperCase();
            return (
              <article key={p.id} className="rounded-2xl border bg-card p-5 shadow-soft">
                <header className="flex items-center gap-3 mb-3">
                  <Link
                    to="/profile/$username"
                    params={{ username: p.author?.username ?? "" }}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={p.author?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {authorInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-sm">
                        {p.author?.display_name || p.author?.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{p.author?.username} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </Link>
                </header>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{p.content}</p>
                {p.image_url && (
                  <div className="mt-3 rounded-xl overflow-hidden border">
                    <img src={p.image_url} alt="" className="w-full max-h-[520px] object-cover" />
                  </div>
                )}
                <footer className="flex items-center gap-1 mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${liked ? "text-primary" : ""}`}
                    onClick={() => toggleLike.mutate({ postId: p.id, liked })}
                  >
                    <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                    {p.likes.length}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {p.comments.length}
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-12 text-center shadow-soft">
          <h3 className="text-lg font-bold">The feed is quiet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to share something with the community.
          </p>
        </div>
      )}
    </div>
  );
}
