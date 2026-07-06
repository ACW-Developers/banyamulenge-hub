import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_app/messages")({
  component: () => (
    <div className="rounded-2xl border bg-card p-12 text-center shadow-soft">
      <MessageCircle className="h-10 w-10 mx-auto text-primary mb-3" />
      <h2 className="text-xl font-bold">Messages</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        Direct messaging is coming soon. You'll be able to chat privately with anyone in the
        community.
      </p>
    </div>
  ),
});
