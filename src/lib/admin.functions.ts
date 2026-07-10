import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only. Lists every account in auth and makes sure a matching
 * public.profiles row exists for each one. Returns the number of profiles
 * created and the total number of auth accounts.
 */
export const syncAuthUsersToProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Admin access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let page = 1;
    const perPage = 200;
    let created = 0;
    let total = 0;

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      const users = data.users;
      if (users.length === 0) break;
      total += users.length;

      const rows = users.map((u) => {
        const base = (
          (u.user_metadata?.username as string | undefined) ||
          (u.email ? u.email.split("@")[0] : `user_${u.id.slice(0, 8)}`)
        )
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "");
        const username = base || `user_${u.id.slice(0, 8)}`;
        return {
          id: u.id,
          username,
          display_name:
            (u.user_metadata?.display_name as string | undefined) ||
            (u.user_metadata?.full_name as string | undefined) ||
            username,
          avatar_url: (u.user_metadata?.avatar_url as string | undefined) ?? null,
        };
      });

      // Only insert profiles that do not already exist. Do it one by one so a
      // unique-username collision on one row doesn't fail the whole batch.
      for (const row of rows) {
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", row.id)
          .maybeSingle();
        if (existing) continue;

        let username = row.username;
        for (let i = 0; i < 20; i++) {
          const { data: clash } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("username", username)
            .maybeSingle();
          if (!clash) break;
          username = `${row.username}${i + 1}`;
        }

        const { error: insErr } = await supabaseAdmin.from("profiles").insert({ ...row, username });
        if (!insErr) created += 1;
      }

      if (users.length < perPage) break;
      page += 1;
    }

    return { created, total };
  });
