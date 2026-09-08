import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  UserPlus,
  UserCheck,
  Users,
  MapPin,
  MessageCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/lib/notify";
import { openConversationWith } from "@/lib/messaging";
import { useNavigate } from "@tanstack/react-router";
import { logActivity } from "@/lib/tracking";
import { useI18n } from "@/lib/i18n";

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

const PAGE_SIZE = 30;

function ExplorePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data: people, isLoading } = useQuery({
    queryKey: ["explore-people", user?.id],
    queryFn: async (): Promise<PersonRow[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, cover_url, bio, location")
        .order("created_at", { ascending: false })
        .limit(2000);
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

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return people ?? [];
    return (people ?? []).filter(
      (p) =>
        p.username.toLowerCase().includes(ql) ||
        (p.display_name ?? "").toLowerCase().includes(ql) ||
        (p.location ?? "").toLowerCase().includes(ql),
    );
  }, [people, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

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
      <div className="rounded-2xl border bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{t("explore.title")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("explore.subtitle")}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={t("explore.searchPlaceholder", "Search people by name or username…")}
              className="pl-9"
            />
          </div>
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {filtered.length.toLocaleString()} {t("explore.members", "members")}
            {filtered.length > PAGE_SIZE && (
              <>
                {" · "}
                {t("explore.page", "Page")} {current}/{totalPages}
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : pageRows.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-white">
          <Users className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">
            {t("explore.noResults", "No members match your search.")}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pageRows.map((p) => {
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
                      <span>{t("explore.followers")}</span>
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
                            <UserCheck className="h-4 w-4" /> {t("explore.following")}
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" /> {t("explore.follow")}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => message(p.id)}
                      >
                        <MessageCircle className="h-4 w-4" /> {t("explore.chat")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> {t("explore.prev", "Previous")}
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages })
              .map((_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - current) <= 1)
              .map((n, i, arr) => (
                <span key={n} className="flex items-center gap-1">
                  {i > 0 && arr[i - 1] !== n - 1 && <span className="text-gray-400 px-1">…</span>}
                  <button
                    onClick={() => setPage(n)}
                    className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold border transition ${
                      n === current
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-primary/40"
                    }`}
                  >
                    {n}
                  </button>
                </span>
              ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={current >= totalPages}
            onClick={() => setPage(current + 1)}
          >
            {t("explore.next", "Next")} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
