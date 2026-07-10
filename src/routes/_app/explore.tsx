import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, UserCheck, Users, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { openConversationWith } from "@/lib/messaging";
import { useNavigate } from "@tanstack/react-router";
import { logActivity } from "@/lib/tracking";

export const Route = createFileRoute("/_app/explore")({
  component: ExplorePage,
});

type PersonRow = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  followers: number;
  isFollowing: boolean;
};

function ExplorePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: people, isLoading } = useQuery({
    queryKey: ["explore-people", user?.id],
    queryFn: async (): Promise<PersonRow[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, cover_url, bio, location")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const rows = profiles ?? [];
      const ids = rows.map((p) => p.id);
      const [{ data: followerRows }, { data: myFollows }] = await Promise.all([
        ids.length
          ? supabase.from("follows").select("following_id").in("following_id", ids)
          : Promise.resolve({ data: [] as { following_id: string }[] }),
        user
          ? supabase.from("follows").select("following_id").eq("follower_id", user.id)
          : Promise.resolve({ data: [] as { following_id: string }[] }),
      ]);
      const counts = new Map<string, number>();
      (followerRows ?? []).forEach((f) => {
        counts.set(f.following_id, (counts.get(f.following_id) ?? 0) + 1);
      });
      const following = new Set((myFollows ?? []).map((f) => f.following_id));
      return rows.map((p) => ({
        ...p,
        followers: counts.get(p.id) ?? 0,
        isFollowing: following.has(p.id),
      }));
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async ({ id, isFollowing }: { id: string; isFollowing: boolean }) => {
      if (!user) throw new Error("Sign in first");
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", id);
        if (error) throw error;
        logActivity(user.id, "user.unfollow", "user", id);
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: id });
        if (error) throw error;
        logActivity(user.id, "user.follow", "user", id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["explore-people", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function message(otherId: string) {
    if (!user) return;
    try {
      const cid = await openConversationWith(user.id, otherId);
      navigate({ to: "/messages", search: { c: cid } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Explore the community</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Meet Banyamulenge members from around the world.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(people ?? []).map((p) => {
            const initial = (p.display_name || p.username).slice(0, 1).toUpperCase();
            const isSelf = user?.id === p.id;
            return (
              <div
                key={p.id}
                className="group rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-primary/40 transition-all"
              >
                <div
                  className="h-20 bg-gradient-to-br from-primary via-primary-glow to-primary/80 relative bg-cover bg-center"
                  style={p.cover_url ? { backgroundImage: `url(${p.cover_url})` } : undefined}
                >
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent)]" />
                </div>
                <div className="px-5 pb-5 -mt-10">
                  <Link to="/profile/$username" params={{ username: p.username }} className="block">
                    <Avatar className="h-20 w-20 ring-4 ring-white shadow-md">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mt-3">
                      <div className="font-bold truncate group-hover:text-primary transition">
                        {p.display_name || p.username}
                      </div>
                      <div className="text-xs text-gray-500 truncate">@{p.username}</div>
                    </div>
                  </Link>
                  {p.location && (
                    <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" />
                      {p.location}
                    </div>
                  )}
                  {p.bio && <p className="text-sm text-gray-600 mt-3 line-clamp-2">{p.bio}</p>}
                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      <strong className="text-gray-900">{p.followers}</strong>
                      <span>followers</span>
                    </span>
                  </div>
                  {!isSelf && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant={p.isFollowing ? "outline" : "default"}
                        className="flex-1 gap-1"
                        disabled={toggleFollow.isPending}
                        onClick={() =>
                          toggleFollow.mutate({ id: p.id, isFollowing: p.isFollowing })
                        }
                      >
                        {p.isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4" /> Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" /> Follow
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => message(p.id)}
                      >
                        <MessageCircle className="h-4 w-4" /> Chat
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
