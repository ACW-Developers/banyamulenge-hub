import { supabase } from "@/integrations/supabase/client";

/**
 * Upload any file (image or document) to the private `post-images` bucket
 * and return a long-lived signed URL plus type/name for message rendering.
 */
export async function uploadMessageAttachment(file: File, userId: string) {
  if (file.size > 20 * 1024 * 1024) throw new Error("File must be under 20 MB");
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/chat/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("post-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr || !data) throw signErr ?? new Error("Could not sign attachment URL");
  return {
    url: data.signedUrl,
    type: file.type || "application/octet-stream",
    name: file.name,
  };
}
