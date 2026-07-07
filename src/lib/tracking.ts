import { supabase } from "@/integrations/supabase/client";

function parseUA(ua: string) {
  let browser = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/OPR\//.test(ua)) browser = "Opera";

  let os = "Other";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua) && !/Mobile/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  const device = /Mobi|Android|iPhone|iPod/.test(ua)
    ? "Mobile"
    : /iPad|Tablet/.test(ua)
    ? "Tablet"
    : "Desktop";

  return { browser, os, device };
}

function guessCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    // "Africa/Nairobi" -> "Kenya"-ish: keep the city as an approximate region label
    const city = tz.split("/")[1]?.replace(/_/g, " ");
    return city || tz || "Unknown";
  } catch {
    return "Unknown";
  }
}

export async function trackVisit(path: string, userId: string | null) {
  try {
    const { browser, os, device } = parseUA(navigator.userAgent);
    await supabase.from("page_visits").insert({
      user_id: userId,
      path,
      device,
      browser,
      os,
      country: guessCountry(),
    });
  } catch {
    // ignore tracking failures
  }
}

export async function logActivity(
  userId: string | null,
  action: string,
  target_type?: string | null,
  target_id?: string | null,
  metadata?: Record<string, unknown>,
) {
  if (!userId) return;
  try {
    await supabase.from("activity_logs").insert({
      user_id: userId,
      action,
      target_type: target_type ?? null,
      target_id: target_id ?? null,
      metadata: metadata ?? {},
    });
  } catch {
    // ignore
  }
}
