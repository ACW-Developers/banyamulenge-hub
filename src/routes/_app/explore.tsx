import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const { data: people, isLoading } = useQuery({
    queryKey: ["explore-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio, location")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Explore the community</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Meet Banyamulenge members from around the world.
        </p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {(people ?? []).map((p) => {
            const initial = (p.display_name || p.username).slice(0, 1).toUpperCase();
            return (
              <Link
                key={p.id}
                to="/profile/$username"
                params={{ username: p.username }}
                className="rounded-2xl border bg-card p-5 shadow-soft hover:shadow-warm hover:border-primary/30 transition"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{p.display_name || p.username}</div>
                    <div className="text-xs text-muted-foreground truncate">@{p.username}</div>
                    {p.location && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {p.location}
                      </div>
                    )}
                  </div>
                </div>
                {p.bio && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
