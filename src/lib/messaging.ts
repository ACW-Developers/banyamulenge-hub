import { supabase } from "@/integrations/supabase/client";

/**
 * Return conversation id between two users; create if none.
 * Uses a security-definer RPC so both participant rows insert atomically
 * without hitting per-row RLS ordering issues.
 */
export async function openConversationWith(_meId: string, otherId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_direct_conversation", {
    other_user: otherId,
  });
  if (error) throw error;
  if (!data) throw new Error("Could not open conversation");
  return data as string;
}
