import { supabase } from "@/integrations/supabase/client";

/**
 * Upload an image file to the private `post-images` bucket and return a
 * long-lived signed URL that can be stored in a post/advert row.
 */
export async function uploadPostImage(file: File, userId: string): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  // 10 years
  const { data, error: signErr } = await supabase.storage
    .from("post-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr || !data) throw signErr ?? new Error("Could not sign image URL");
  return data.signedUrl;
}
