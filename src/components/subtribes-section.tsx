import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users2, Plus, Pencil, Trash2, Loader2, Search, Upload, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadPostImage } from "@/lib/upload";
import { toast } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type Subtribe = {
  id: string;
  name: string;
  description: string;
  identity: string | null;
  loved: string | null;
  origins: string | null;
  notable_people: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
};

const KEY = ["subtribes"] as const;

export function SubtribesSection() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subtribe | null>(null);
  const [viewing, setViewing] = useState<Subtribe | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtribes")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subtribe[];
    },
  });

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return data ?? [];
    return (data ?? []).filter(
      (s) =>
        s.name.toLowerCase().includes(ql) ||
        s.description.toLowerCase().includes(ql) ||
        (s.identity ?? "").toLowerCase().includes(ql),
    );
  }, [data, q]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subtribes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subtribe removed");
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: Error) => toast.error(e),
  });

  return (
    <section className="rounded-2xl border bg-white overflow-hidden shadow-sm">
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Users2 className="h-5 w-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">Subtribes of the Banyamulenge</h2>
          {isAdmin && (
            <Button
              size="sm"
              className="ml-auto gap-2"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add subtribe
            </Button>
          )}
        </div>

        <p className="text-gray-700 leading-relaxed">
          Each subtribe carries its own identity, memories and way of life. These records are kept
          by the community so the history is preserved accurately for the generations to come.
        </p>

        {(data ?? []).length > 4 && (
          <div className="relative mt-5 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subtribes…"
              className="pl-9"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            {isAdmin
              ? "No subtribe records yet - use “Add subtribe” to capture the first one."
              : "Subtribe records are being gathered and will appear here soon."}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            {filtered.map((s) => (
              <article
                key={s.id}
                className="group rounded-2xl border bg-gray-50/40 overflow-hidden hover:border-primary/40 hover:shadow-md transition flex flex-col"
              >
                {s.image_url && (
                  <button onClick={() => setViewing(s)} className="relative h-40 w-full">
                    <img
                      loading="lazy"
                      src={s.image_url}
                      alt={s.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </button>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900">{s.name}</h3>
                  <p className="mt-1.5 text-sm text-gray-600 line-clamp-3">{s.description}</p>
                  {s.identity && (
                    <p className="mt-2 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Identity: </span>
                      <span className="line-clamp-2">{s.identity}</span>
                    </p>
                  )}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <button
                      onClick={() => setViewing(s)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Read full record
                    </button>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditing(s);
                            setOpen(true);
                          }}
                          className="text-gray-400 hover:text-primary p-1"
                          aria-label="Edit subtribe"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => confirm(`Delete ${s.name}?`) && del.mutate(s.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          aria-label="Delete subtribe"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {viewing && (
            <>
              {viewing.image_url ? (
                <div className="relative h-52">
                  <img
                    src={viewing.image_url}
                    alt={viewing.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <button
                    onClick={() => setViewing(null)}
                    className="absolute top-3 right-3 rounded-full bg-black/40 text-white p-1.5"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <h2 className="absolute bottom-4 left-5 text-2xl font-bold text-white drop-shadow">
                    {viewing.name}
                  </h2>
                </div>
              ) : (
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle className="text-2xl">{viewing.name}</DialogTitle>
                </DialogHeader>
              )}
              <div className="p-6 space-y-5">
                <Field label="Brief description" value={viewing.description} />
                <Field label="Identity" value={viewing.identity} />
                <Field label="What they loved" value={viewing.loved} />
                <Field label="Origins & movements" value={viewing.origins} />
                <Field label="Notable people" value={viewing.notable_people} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SubtribeDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
      />
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <section>
      <h3 className="text-sm font-bold text-gray-900">{label}</h3>
      <p className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{value}</p>
    </section>
  );
}

function SubtribeDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Subtribe | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [identity, setIdentity] = useState(editing?.identity ?? "");
  const [loved, setLoved] = useState(editing?.loved ?? "");
  const [origins, setOrigins] = useState(editing?.origins ?? "");
  const [notable, setNotable] = useState(editing?.notable_people ?? "");
  const [sortOrder, setSortOrder] = useState(String(editing?.sort_order ?? 0));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(editing?.image_url ?? null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!user) return;
    if (!name.trim() || !description.trim())
      return toast.error("Please fill in the subtribe name and a brief description");
    setBusy(true);
    try {
      let image_url = editing?.image_url ?? null;
      if (file) image_url = await uploadPostImage(file, user.id);
      const payload = {
        name: name.trim(),
        description: description.trim(),
        identity: identity.trim() || null,
        loved: loved.trim() || null,
        origins: origins.trim() || null,
        notable_people: notable.trim() || null,
        sort_order: Number.parseInt(sortOrder, 10) || 0,
        image_url,
      };
      if (editing) {
        const { error } = await supabase.from("subtribes").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Subtribe record updated");
      } else {
        const { error } = await supabase
          .from("subtribes")
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast.success("Subtribe record saved");
      }
      qc.invalidateQueries({ queryKey: KEY });
      onOpenChange(false);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit subtribe" : "New subtribe record"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Subtribe name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abagorora"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brief description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who they are, in a few sentences…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Identity</Label>
            <Textarea
              rows={3}
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="Distinguishing marks, totem, values, reputation…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>What they loved</Label>
            <Textarea
              rows={3}
              value={loved}
              onChange={(e) => setLoved(e.target.value)}
              placeholder="Cattle, songs, hospitality, crafts…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Origins & movements</Label>
            <Textarea
              rows={3}
              value={origins}
              onChange={(e) => setOrigins(e.target.value)}
              placeholder="Where they came from and where they settled…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notable people</Label>
            <Textarea
              rows={2}
              value={notable}
              onChange={(e) => setNotable(e.target.value)}
              placeholder="Elders, leaders, figures remembered by the subtribe…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Display order</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Photo (optional)</Label>
            <label className="flex items-center gap-2 rounded-xl border border-dashed p-3 cursor-pointer hover:border-primary/50 text-sm text-gray-600">
              <Upload className="h-4 w-4" /> Choose an image from your device
              <input type="file" accept="image/*" onChange={pick} className="hidden" />
            </label>
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mt-2 h-36 w-full rounded-xl object-cover border"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Save record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
