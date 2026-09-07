import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Database, Download, Upload, Loader2, ShieldAlert } from "lucide-react";

import { exportBackup, importBackup } from "@/lib/backup.functions";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/lib/notify";

export function BackupSection() {
  const runExport = useServerFn(exportBackup);
  const runImport = useServerFn(importBackup);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  async function download() {
    setExporting(true);
    setReport(null);
    try {
      const backup = await (runExport as unknown as () => Promise<{ tables: Record<string, unknown[]> }>)();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `heritage-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const counts = Object.entries(backup.tables)
        .map(([t, rows]) => `${t}: ${(rows as unknown[]).length}`)
        .join(" · ");
      setReport(`Backup downloaded. ${counts}`);
      notifySuccess("Backup downloaded successfully");
    } catch (e) {
      notifyError(e);
    } finally {
      setExporting(false);
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setReport(null);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file could not be read. Please choose a backup file.");
      }
      const result = await runImport({ data: { backup: parsed } });
      const total = Object.values(result.imported).reduce((a, b) => a + b, 0);
      setReport(
        `Restored ${total.toLocaleString()} records.` +
          (result.skipped.length ? ` Some entries were skipped: ${result.skipped.join("; ")}` : ""),
      );
      notifySuccess("Backup restored successfully");
    } catch (err) {
      notifyError(err);
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="px-6 py-4 border-b flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Backup &amp; restore</h2>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Download a complete copy of everything on the platform - members, posts, messages,
          groups, listings, heritage records, gallery photos and donations - as one standard JSON
          file that any other system can read. You can bring the same file back here at any time.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button onClick={download} disabled={exporting} className="gap-2">
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download backup
          </Button>

          <label>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={upload}
              disabled={importing}
            />
            <Button asChild variant="outline" disabled={importing}>
              <span className="gap-2 cursor-pointer">
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Import backup
              </span>
            </Button>
          </label>
        </div>

        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Importing updates existing records and adds missing ones. Nothing is deleted, so a
            restore can never wipe live data.
          </p>
        </div>

        {report && (
          <p className="text-xs text-gray-600 break-words rounded-xl bg-gray-50 border p-3">
            {report}
          </p>
        )}
      </div>
    </section>
  );
}
