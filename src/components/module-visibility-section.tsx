import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { notifyError, notifySuccess } from "@/lib/notify";
import { MODULE_SETTINGS_KEY, useModuleSettings } from "@/lib/module-visibility";
import { Switch } from "@/components/ui/switch";

/** Super-admin-only panel controlling which modules every other user can see. */
export function ModuleVisibilitySection() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { settings, isLoading, isSuperAdmin } = useModuleSettings();

  const toggle = useMutation({
    mutationFn: async ({ key, visible }: { key: string; visible: boolean }) => {
      const { error } = await supabase
        .from("module_settings")
        .update({ visible })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MODULE_SETTINGS_KEY });
      notifySuccess(t("admin.modules.saved"));
    },
    onError: () => notifyError(t("admin.modules.superOnly")),
  });

  if (!isSuperAdmin) return null;

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="px-6 py-4 border-b flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-primary" />
        <h2 className="font-bold">{t("admin.modules.title")}</h2>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Super administrator
        </span>
      </div>
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-5">{t("admin.modules.sub")}</p>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {settings.map((m) => (
              <div
                key={m.key}
                className={`flex items-center gap-3 rounded-xl border-2 p-3.5 transition ${
                  m.visible ? "border-primary/20 bg-primary/[0.03]" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    m.visible ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {m.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{m.label}</div>
                  <div className="text-xs text-gray-500">
                    {m.visible ? t("admin.modules.visible") : t("admin.modules.hidden")}
                  </div>
                </div>
                <Switch
                  checked={m.visible}
                  disabled={toggle.isPending}
                  onCheckedChange={(v) => toggle.mutate({ key: m.key, visible: v })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
