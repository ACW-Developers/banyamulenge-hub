import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Tables included in a full backup, in dependency order so that an import can
 * be replayed top-to-bottom without breaking foreign keys.
 */
const TABLES = [
  "profiles",
  "user_roles",
  "groups",
  "group_members",
  "posts",
  "comments",
  "likes",
  "follows",
  "conversations",
  "conversation_participants",
  "messages",
  "group_messages",
  "adverts",
  "directory_entries",
  "marketplace_listings",
  "family_members",
  "museum_artifacts",
  "subtribes",
  "gallery_items",
  "donations",
  "activity_logs",
  "page_visits",
] as const;

type TableName = (typeof TABLES)[number];

/** Tables whose primary key is composite (no single `id` column). */
const COMPOSITE_KEYS: Partial<Record<TableName, string>> = {
  likes: "user_id,post_id",
  follows: "follower_id,following_id",
  group_members: "group_id,user_id",
  conversation_participants: "conversation_id,user_id",
};

type Row = Record<string, unknown>;
type Backup = {
  format: string;
  version: number;
  exported_at: string;
  tables: Record<string, Row[]>;
};

async function assertAdmin(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

/** Admin-only. Returns every record in the system as one portable JSON object. */
export const exportBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as unknown as { from: (t: string) => any }, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (t: string) => any };

    const tables: Record<string, Row[]> = {};
    for (const table of TABLES) {
      const rows: Row[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await db
          .from(table)
          .select("*")
          .range(from, from + pageSize - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        const batch = (data ?? []) as Row[];
        rows.push(...batch);
        if (batch.length < pageSize) break;
      }
      tables[table] = rows;
    }

    const backup: Backup = {
      format: "banyamulenge-heritage-hub-backup",
      version: 1,
      exported_at: new Date().toISOString(),
      tables,
    };
    return backup;
  });

/**
 * Admin-only. Restores a backup produced by `exportBackup`. Existing rows are
 * updated, missing rows are inserted; nothing is deleted.
 */
export const importBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { backup: unknown }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as unknown as { from: (t: string) => any }, context.userId);

    const backup = data.backup as Backup | null;
    if (!backup || typeof backup !== "object" || !backup.tables) {
      throw new Error("That file is not a valid backup file.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (t: string) => any };

    const imported: Record<string, number> = {};
    const skipped: string[] = [];

    for (const table of TABLES) {
      const rows = backup.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const onConflict = COMPOSITE_KEYS[table] ?? "id";
      let done = 0;
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await db.from(table).upsert(chunk, { onConflict });
        if (error) {
          skipped.push(`${table}: ${error.message}`);
          break;
        }
        done += chunk.length;
      }
      imported[table] = done;
    }

    return { imported, skipped };
  });
