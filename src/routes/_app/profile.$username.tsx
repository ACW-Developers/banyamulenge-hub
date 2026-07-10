import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Calendar,
  Edit3,
  Loader2,
  UserPlus,
  UserCheck,
  Camera,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { uploadPostImage } from "@/lib/upload";
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
import { openConversationWith } from "@/lib/messaging";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/profile/$username")({
  component: ProfilePage,
});

type ProfileFull = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  created_at: string;
};

async function fetchProfile(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, cover_url, location, created_at")
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
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

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
      <div className="rounded-2xl border bg-white p-12 text-center">
        <h2 className="text-lg font-bold">Profile not found</h2>
        <p className="text-sm text-gray-500 mt-1">@{username} doesn't exist.</p>
        <Link to="/" className="text-primary text-sm font-semibold mt-4 inline-block">
          Back to feed
        </Link>
      </div>
    );
  }

  const initial = (profile.display_name || profile.username).slice(0, 1).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div
          className="h-40 bg-gradient-to-r from-primary via-primary-glow to-primary bg-cover bg-center"
          style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : undefined}
        />

        <div className="p-5 pt-0">
          <div className="flex items-end justify-between -mt-12">
            <Avatar className="h-24 w-24 ring-4 ring-white">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="mb-2 flex gap-2">
              {isSelf ? (
                <EditProfileDialog
                  profile={profile}
                  onSaved={() => {
                    qc.invalidateQueries({ queryKey: ["profile", username] });
                    refreshProfile();
                  }}
                />
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={async () => {
                      if (!user) return;
                      try {
                        const cid = await openConversationWith(user.id, profile.id);
                        navigate({ to: "/messages", search: { c: cid } });
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <MessageCircle className="h-4 w-4" /> Message
                  </Button>
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={() => toggleFollow.mutate()}
                    disabled={toggleFollow.isPending}
                    className="gap-2"
                  >
                    {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <div className="text-sm text-gray-500">@{profile.username}</div>
            {profile.bio && <p className="mt-3 text-[15px]">{profile.bio}</p>}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
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
              <FollowersDialog
                userId={profile.id}
                mode="followers"
                count={stats?.followers ?? 0}
                isSelf={isSelf}
              />
              <FollowersDialog
                userId={profile.id}
                mode="following"
                count={stats?.following ?? 0}
                isSelf={isSelf}
              />
              <div>
                <span className="font-bold">{posts?.length ?? 0}</span>{" "}
                <span className="text-gray-500">Posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold mb-1">Posts live in the feed</h2>
        <p className="text-sm text-gray-500">
          {profile.display_name || profile.username} has {posts?.length ?? 0} post{(posts?.length ?? 0) === 1 ? "" : "s"} — visit the home feed to like and comment.
        </p>
        <Link to="/" className="inline-block mt-4 text-primary font-semibold text-sm">
          Open community feed →
        </Link>
      </div>
    </div>
  );
}

async function fileToDataUrl(file: File, maxDim = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [coverUrl, setCoverUrl] = useState(profile.cover_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setCoverUrl(profile.cover_url ?? "");
    }
  }, [open, profile]);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(f);
      setAvatarUrl(dataUrl);
    } catch {
      toast.error("Could not read image");
    }
  }

  async function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingCover(true);
    try {
      const url = await uploadPostImage(f, profile.id);
      setCoverUrl(url);
    } catch (err) {
      toast.error((err as Error).message);
    }
    setUploadingCover(false);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        bio: bio || null,
        location: location || null,
        avatar_url: avatarUrl || null,
        cover_url: coverUrl || null,
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

  const initial = (displayName || profile.username).slice(0, 1).toUpperCase();

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
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cover image</Label>
            <div
              className="h-28 w-full rounded-lg border bg-gradient-to-r from-primary via-primary-glow to-primary bg-cover bg-center relative overflow-hidden"
              style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
            >
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/20">
                <input ref={coverRef} type="file" accept="image/*" hidden onChange={pickCover} />
                <Button type="button" size="sm" variant="secondary" className="gap-2" disabled={uploadingCover} onClick={() => coverRef.current?.click()}>
                  {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {coverUrl ? "Change cover" : "Upload cover"}
                </Button>
                {coverUrl && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setCoverUrl("")}>Remove</Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={pickFile}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-4 w-4" /> Upload photo
              </Button>
              {avatarUrl && (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline text-left"
                  onClick={() => setAvatarUrl("")}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
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

function FollowersDialog({
  userId,
  mode,
  count,
  isSelf,
}: {
  userId: string;
  mode: "followers" | "following";
  count: number;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && isSelf && mode === "followers") {
      // Mark followers as seen when the owner opens the list
      import("@/lib/notifications").then(({ markFollowersSeen }) => markFollowersSeen());
    }
  }, [open, isSelf, mode]);

  const { data: people, isLoading } = useQuery({
    queryKey: ["follow-list", userId, mode],
    enabled: open,
    queryFn: async () => {
      if (mode === "followers") {
        const { data } = await supabase
          .from("follows")
          .select("follower:profiles!follows_follower_profile_fkey(id, username, display_name, avatar_url, bio)")
          .eq("following_id", userId);
        return (data ?? []).map((r: { follower: unknown }) => r.follower).filter(Boolean) as Array<{
          id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null;
        }>;
      }
      const { data } = await supabase
        .from("follows")
        .select("following:profiles!follows_following_profile_fkey(id, username, display_name, avatar_url, bio)")
        .eq("follower_id", userId);
      return (data ?? []).map((r: { following: unknown }) => r.following).filter(Boolean) as Array<{
        id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null;
      }>;
    },
  });

  const label = mode === "followers" ? "Followers" : "Following";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-left hover:text-primary transition">
          <span className="font-bold">{count}</span>{" "}
          <span className="text-gray-500">{label}</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto -mx-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : people && people.length > 0 ? (
            people.map((p) => {
              const initial = (p.display_name || p.username).slice(0, 1).toUpperCase();
              return (
                <Link
                  key={p.id}
                  to="/profile/$username"
                  params={{ username: p.username }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">
                      {p.display_name || p.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">@{p.username}</div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">
              No {label.toLowerCase()} yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

