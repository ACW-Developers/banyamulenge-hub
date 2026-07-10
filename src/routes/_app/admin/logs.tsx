import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/admin/logs")({
  component: LogsAdmin,
});

const PAGE_SIZE = 25;

function LogsAdmin() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data: logs, count } = await supabase
        .from("activity_logs")
        .select("id, user_id, action, target_type, target_id, metadata, created_at", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .range(from, to);
      const ids = Array.from(
        new Set((logs ?? []).map((l) => l.user_id).filter(Boolean)),
      ) as string[];
      const { data: profiles } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", ids)
        : { data: [] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return {
        rows: (logs ?? []).map((l) => ({ ...l, actor: l.user_id ? byId.get(l.user_id) : null })),
        total: count ?? 0,
      };
    },
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every action, page view, and admin change with timestamps.
        </p>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : data && data.rows.length > 0 ? (
          <ul className="divide-y">
            {data.rows.map((l) => {
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
                          <span className="font-mono text-xs">
                            {typeof l.target_id === "string" ? l.target_id.slice(0, 40) : ""}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })} ·{" "}
                      {format(new Date(l.created_at), "MMM d, yyyy HH:mm:ss")}
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
        <div className="flex items-center justify-between p-3 border-t bg-gray-50/50">
          <div className="text-xs text-gray-500">
            Page {page + 1} of {pages} · {total} entries
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
