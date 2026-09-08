import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const SUPER_ADMIN_EMAIL = "admin@banyamulengehub.com";

export type ModuleSetting = {
  key: string;
  label: string;
  visible: boolean;
  sort_order: number;
};

export const MODULE_SETTINGS_KEY = ["module-settings"] as const;

/** Maps a pathname to the module key it belongs to. */
export function moduleKeyForPath(pathname: string): string | null {
  if (pathname === "/") return "home";
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return "home";
  const known = [
    "explore",
    "community",
    "marketplace",
    "directory",
    "messages",
    "heritage",
    "museum",
    "gallery",
    "family-tree",
  ];
  return known.includes(seg) ? seg : null;
}

export function useModuleSettings() {
  const { user } = useAuth();
  const isSuperAdmin = (user?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;

  const { data, isLoading } = useQuery({
    queryKey: MODULE_SETTINGS_KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_settings")
        .select("key, label, visible, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ModuleSetting[];
    },
  });

  const settings = data ?? [];
  const hidden = new Set(settings.filter((s) => !s.visible).map((s) => s.key));

  return {
    settings,
    isLoading,
    isSuperAdmin,
    /** Super admin always sees everything; everyone else respects the switches. */
    isVisible: (key: string | null) => {
      if (!key) return true;
      if (isSuperAdmin) return true;
      return !hidden.has(key);
    },
    isHidden: (key: string) => hidden.has(key),
  };
}
