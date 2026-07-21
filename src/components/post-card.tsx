import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  Send,
  Megaphone,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logActivity } from "@/lib/tracking";

export type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  is_announcement?: boolean;
  author: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  likes: { user_id: string }[];
  comments: { id: string }[];
};

export function PostCard({ post, queryKey }: { post: FeedPost; queryKey: readonly unknown[] }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const liked = user ? post.likes.some((l) => l.user_id === user.id) : false;
  const authorInitial = (post.author?.display_name || post.author?.username || "?")
    .slice(0, 1)
    .toUpperCase();

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: user.id });
        if (error) throw error;
        logActivity(user.id, "post.like", "post", post.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAnnouncement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("posts")
        .update({ is_announcement: !post.is_announcement })
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(post.is_announcement ? "Unmarked as announcement" : "Marked as announcement");
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["comments", post.id],
    enabled: showComments,
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select(
          "id, content, created_at, user_id, profiles!comments_author_profile_fkey(username, display_name, avatar_url)",
        )
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  async function submitComment() {
    if (!user || !commentText.trim()) return;
    const { error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: user.id, content: commentText.trim() });
    if (error) return toast.error(error.message);
    setCommentText("");
    logActivity(user.id, "post.comment", "post", post.id);
    refetchComments();
    qc.invalidateQueries({ queryKey });
  }

  async function share() {
    const url = `${window.location.origin}/?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Community post", text: post.content.slice(0, 80), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
      if (user) logActivity(user.id, "post.share", "post", post.id);
    } catch {
      // user cancelled
    }
  }

  const canDelete = user?.id === post.user_id;

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        post.is_announcement ? "border-amber-300 bg-amber-50/40" : ""
      }`}
    >
      {post.is_announcement && (
        <div className="flex items-center gap-2 mb-3 text-amber-700 text-xs font-bold uppercase tracking-wider">
          <Megaphone className="h-4 w-4" /> Community Announcement
        </div>
      )}
      <header className="flex items-center gap-3 mb-3">
        <Link
          to="/profile/$username"
          params={{ username: post.author?.username ?? "" }}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {authorInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">
              {post.author?.display_name || post.author?.username}
            </div>
            <div className="text-xs text-gray-500 truncate">
              @{post.author?.username} ·{" "}
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </div>
          </div>
        </Link>
        {(canDelete || isAdmin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAdmin && (
                <DropdownMenuItem onClick={() => toggleAnnouncement.mutate()}>
                  <Megaphone className="h-4 w-4 mr-2" />
                  {post.is_announcement ? "Unmark announcement" : "Mark as announcement"}
                </DropdownMenuItem>
              )}
              {(canDelete || isAdmin) && (
                <DropdownMenuItem onClick={() => del.mutate()} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
      {post.image_url && (
        <div className="mt-3 rounded-xl overflow-hidden border">
          <img src={post.image_url} alt="" className="w-full max-h-[520px] object-cover" />
        </div>
      )}
      {post.video_url && (
        <div className="mt-3 rounded-xl overflow-hidden border bg-black">
          <video
            src={post.video_url}
            controls
            playsInline
            className="w-full max-h-[520px] object-contain bg-black"
          />
        </div>
      )}
      <footer className="flex items-center gap-1 mt-4 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${liked ? "text-primary" : ""}`}
          onClick={() => toggleLike.mutate()}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          {post.likes.length}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments.length}
        </Button>
        <Button variant="ghost" size="sm" className="gap-2" onClick={share}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </footer>

      {showComments && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {(comments ?? []).map((c) => {
            const ci = (c.profiles?.display_name || c.profiles?.username || "?")
              .slice(0, 1)
              .toUpperCase();
            return (
              <div key={c.id} className="flex gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {ci}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-xl bg-gray-50 px-3 py-2">
                  <div className="text-xs font-semibold">
                    {c.profiles?.display_name || c.profiles?.username}
                    <span className="text-gray-400 font-normal ml-2">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{c.content}</div>
                </div>
              </div>
            );
          })}
          {user && (
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="min-h-[40px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />
              <Button size="icon" onClick={submitComment} disabled={!commentText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export function PostComposer({
  groupId,
  queryKey,
}: {
  groupId?: string;
  queryKey: readonly unknown[];
}) {
  const { user, profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [busy, setBusy] = useState(false);

  const initial = (profile?.display_name || profile?.username || "U").slice(0, 1).toUpperCase();

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!user || !content.trim()) return;
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const { uploadPostImage } = await import("@/lib/upload");
        image_url = await uploadPostImage(file, user.id);
      }
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url,
        is_announcement: isAnnouncement && isAdmin,
        group_id: groupId ?? null,
      });
      if (error) throw error;
      setContent("");
      setFile(null);
      setPreview(null);
      setIsAnnouncement(false);
      toast.success("Posted");
      logActivity(user.id, "post.create", "post");
      qc.invalidateQueries({ queryKey });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
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
            className="min-h-[80px] resize-none border-0 bg-gray-50 focus-visible:ring-1"
          />
          {preview && (
            <div className="relative rounded-xl overflow-hidden border">
              <img src={preview} alt="preview" className="w-full max-h-72 object-cover" />
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 rounded-full bg-black/60 text-white p-1 hover:bg-black"
                aria-label="Remove image"
                type="button"
              >
                <TrashIcon />
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">
              <ImageIcon />
              Photo
              <input type="file" accept="image/*" className="hidden" onChange={pickImage} />
            </label>
            {isAdmin && !groupId && (
              <button
                type="button"
                onClick={() => setIsAnnouncement((v) => !v)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                  isAnnouncement
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "text-gray-600 hover:bg-orange-50"
                }`}
              >
                <Megaphone className="h-4 w-4" />
                Announcement
              </button>
            )}
            <div className="ml-auto">
              <Button disabled={!content.trim() || busy} onClick={submit} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function TrashIcon() {
  return <Trash2 className="h-4 w-4" />;
}
