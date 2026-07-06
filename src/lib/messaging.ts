import { supabase } from "@/integrations/supabase/client";

/**
 * Return conversation id between two users; create if none.
 */
export async function openConversationWith(meId: string, otherId: string): Promise<string> {
  // Find existing 1:1 conversation containing both
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", meId);
  const myIds = (mine ?? []).map((r) => r.conversation_id);
  if (myIds.length > 0) {
    const { data: theirs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherId)
      .in("conversation_id", myIds);
    const shared = theirs?.[0]?.conversation_id;
    if (shared) return shared;
  }
  // Create new
  const { data: convo, error } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();
  if (error) throw error;
  const { error: pErr } = await supabase.from("conversation_participants").insert([
    { conversation_id: convo.id, user_id: meId },
    { conversation_id: convo.id, user_id: otherId },
  ]);
  if (pErr) throw pErr;
  return convo.id;
}
