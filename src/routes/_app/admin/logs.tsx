import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/admin/logs")({
  component: LogsAdmin,
});

function LogsAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, user_id, action, target_type, target_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const ids = Array.from(new Set((logs ?? []).map((l) => l.user_id).filter(Boolean))) as string[];
      const { data: profiles } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", ids)
        : { data: [] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (logs ?? []).map((l) => ({ ...l, actor: l.user_id ? byId.get(l.user_id) : null }));
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Chronological record of administrative actions.
        </p>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : data && data.length > 0 ? (
          <ul className="divide-y">
            {data.map((l) => {
              const initial = (l.actor?.display_name || l.actor?.username || "?")
                .slice(0, 1)
                .toUpperCase();
              return (
                <li key={l.id} className="p-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center overflow-hidden shrink-0">
                    {l.actor?.avatar_url ? (
                      <img src={l.actor.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-semibold">
                        {l.actor?.display_name || l.actor?.username || "System"}
                      </span>{" "}
                      <span className="font-mono text-primary">{l.action}</span>
                      {l.target_type && (
                        <span className="text-gray-500">
                          {" on "}
                          {l.target_type}{" "}
                          <span className="font-mono text-xs">{l.target_id?.slice(0, 8)}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })} ·{" "}
                      {format(new Date(l.created_at), "MMM d, HH:mm")}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-12 text-center">
            <Activity className="h-10 w-10 mx-auto text-primary mb-3" />
            <p className="text-sm text-gray-500">No activity logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
