import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_app/community")({
  component: () => (
    <div className="rounded-2xl border bg-card p-12 text-center shadow-soft">
      <Users className="h-10 w-10 mx-auto text-primary mb-3" />
      <h2 className="text-xl font-bold">Groups & Communities</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Coming soon — join regional chapters, cultural circles, and interest-based groups.
      </p>
    </div>
  ),
});
