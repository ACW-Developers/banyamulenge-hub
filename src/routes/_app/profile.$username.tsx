import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { MapPin, Calendar, Edit3, Loader2, UserPlus, UserCheck } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/profile/$username")({
  component: ProfilePage,
});

type ProfileFull = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  created_at: string;
};

async function fetchProfile(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, location, created_at")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileFull | null;
}

async function fetchUserPosts(userId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("id, content, image_url, created_at, likes(user_id), comments(id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchFollowStats(userId: string) {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers ?? 0, following: following ?? 0 };
}

function ProfilePage() {
  const { username } = useParams({ from: "/_app/profile/$username" });
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => fetchProfile(username),
  });
  const { data: posts } = useQuery({
    queryKey: ["profile-posts", profile?.id],
    queryFn: () => fetchUserPosts(profile!.id),
    enabled: !!profile?.id,
  });
  const { data: stats } = useQuery({
    queryKey: ["follow-stats", profile?.id],
    queryFn: () => fetchFollowStats(profile!.id),
    enabled: !!profile?.id,
  });
  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user?.id, profile?.id],
    enabled: !!user?.id && !!profile?.id && user?.id !== profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user!.id)
        .eq("following_id", profile!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.id);
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["is-following"] });
      qc.invalidateQueries({ queryKey: ["follow-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isSelf = user?.id === profile?.id;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border bg-card p-12 text-center">
        <h2 className="text-lg font-bold">Profile not found</h2>
        <p className="text-sm text-muted-foreground mt-1">@{username} doesn't exist.</p>
        <Link to="/" className="text-primary text-sm font-semibold mt-4 inline-block">
          Back to feed
        </Link>
      </div>
    );
  }

  const initial = (profile.display_name || profile.username).slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Cover + header */}
      <div className="rounded-2xl border bg-card shadow-soft overflow-hidden">
        <div className="h-40 bg-gradient-to-r from-primary via-primary-glow to-primary" />
        <div className="p-5 pt-0">
          <div className="flex items-end justify-between -mt-12">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="mb-2">
              {isSelf ? (
                <EditProfileDialog
                  profile={profile}
                  onSaved={() => {
                    qc.invalidateQueries({ queryKey: ["profile", username] });
                    refreshProfile();
                  }}
                />
              ) : (
                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={() => toggleFollow.mutate()}
                  disabled={toggleFollow.isPending}
                  className="gap-2"
                >
                  {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <div className="text-sm text-muted-foreground">@{profile.username}</div>
            {profile.bio && <p className="mt-3 text-[15px]">{profile.bio}</p>}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {profile.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Joined {format(new Date(profile.created_at), "MMM yyyy")}
              </span>
            </div>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="font-bold">{stats?.followers ?? 0}</span>{" "}
                <span className="text-muted-foreground">Followers</span>
              </div>
              <div>
                <span className="font-bold">{stats?.following ?? 0}</span>{" "}
                <span className="text-muted-foreground">Following</span>
              </div>
              <div>
                <span className="font-bold">{posts?.length ?? 0}</span>{" "}
                <span className="text-muted-foreground">Posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-lg font-bold mb-3 px-1">Posts</h2>
        {posts && posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((p) => (
              <article key={p.id} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="text-xs text-muted-foreground mb-2">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                </div>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{p.content}</p>
                {p.image_url && (
                  <div className="mt-3 rounded-xl overflow-hidden border">
                    <img src={p.image_url} alt="" className="w-full max-h-[520px] object-cover" />
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  {p.likes.length} likes · {p.comments.length} comments
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
            No posts yet.
          </div>
        )}
      </div>
    </div>
  );
}

function EditProfileDialog({
  profile,
  onSaved,
}: {
  profile: ProfileFull;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [open, profile]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        bio: bio || null,
        location: location || null,
        avatar_url: avatarUrl || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Edit3 className="h-4 w-4" />
          Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Update how you appear in the community.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Avatar URL</Label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
