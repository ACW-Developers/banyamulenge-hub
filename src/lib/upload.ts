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
  const { data, error: signErr } = await supabase.storage
    .from("post-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr || !data) throw signErr ?? new Error("Could not sign image URL");
  return data.signedUrl;
}

/**
 * Upload a short video (max 15 MB, max 2 minutes). Duration is validated
 * client-side by loading metadata before upload.
 */
export async function uploadPostVideo(file: File, userId: string): Promise<string> {
  if (file.size > 15 * 1024 * 1024) throw new Error("Video must be under 15 MB");
  const duration = await getVideoDuration(file);
  if (duration > 120.5) throw new Error("Video must be 2 minutes or shorter");
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
  const path = `${userId}/videos/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("post-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr || !data) throw signErr ?? new Error("Could not sign video URL");
  return data.signedUrl;
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video file"));
    };
    v.src = url;
  });
}
