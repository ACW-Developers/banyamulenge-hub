import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  Loader2,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadPostImage } from "@/lib/upload";
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

export const Route = createFileRoute("/_app/museum")({
  head: () => ({
    meta: [
      { title: "Virtual Museum - Banyamulenge Artifacts" },
      {
        name: "description",
        content:
          "Explore iconic Banyamulenge artifacts: their names, traditional use and the stories behind them.",
      },
      { property: "og:title", content: "Virtual Museum - Banyamulenge Artifacts" },
      {
        property: "og:description",
        content: "Iconic Banyamulenge artifacts, their use and the stories behind them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MuseumPage,
});

type Artifact = {
  id: string;
  name: string;
  category: string;
  era: string | null;
  origin: string | null;
  materials: string | null;
  use_description: string;
  story: string;
  image_url: string | null;
  source_url: string | null;
  sort_order: number;
  created_at: string;
};

const key = ["museum-artifacts"] as const;

function MuseumPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Artifact | null>(null);
  const [viewing, setViewing] = useState<Artifact | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("museum_artifacts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Artifact[];
    },
  });

  const categories = useMemo(
    () => Array.from(new Set((data ?? []).map((a) => a.category).filter(Boolean))),
    [data],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (data ?? []).filter((a) => {
      if (cat !== "all" && a.category !== cat) return false;
      if (!ql) return true;
      return (
        a.name.toLowerCase().includes(ql) ||
        a.use_description.toLowerCase().includes(ql) ||
        a.story.toLowerCase().includes(ql) ||
        (a.origin ?? "").toLowerCase().includes(ql) ||
        (a.materials ?? "").toLowerCase().includes(ql)
      );
    });
  }, [data, q, cat]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("museum_artifacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artifact removed");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-amber-50 via-orange-50 to-primary/10 p-6 md:p-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <Landmark className="h-3.5 w-3.5" /> Virtual Museum
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Objects that carry our story
            </h1>
            <p className="mt-2 text-gray-600 text-sm md:text-base">
              A growing collection of iconic Banyamulenge artifacts - what each one is, how it was
              used, and the story it still tells.
            </p>
          </div>
          {isAdmin && (
            <Button
              className="gap-2"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add artifact
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search artifacts, materials, origins…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Pill active={cat === "all"} onClick={() => setCat("all")}>
            All
          </Pill>
          {categories.map((c) => (
            <Pill key={c} active={cat === c} onClick={() => setCat(c)}>
              {c}
            </Pill>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-white">
          <Landmark className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">No artifacts match your search yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <article
              key={a.id}
              className="group rounded-2xl border bg-white overflow-hidden hover:border-primary/40 hover:shadow-xl transition flex flex-col"
            >
              <button
                onClick={() => setViewing(a)}
                className="relative h-52 w-full bg-gradient-to-br from-amber-100 to-orange-200 text-left"
              >
                {a.image_url ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={a.image_url}
                    alt={a.name}
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <ImageIcon className="h-8 w-8 text-white/80" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <span className="absolute top-2 left-2 rounded-full bg-white/90 text-gray-900 text-[10px] font-bold px-2.5 py-1 shadow">
                  {a.category}
                </span>
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-bold leading-tight drop-shadow line-clamp-2">
                    {a.name}
                  </h3>
                  {a.era && <p className="text-white/80 text-[11px] mt-0.5">{a.era}</p>}
                </div>
              </button>

              <div className="p-4 flex-1 flex flex-col">
                <p className="text-sm text-gray-600 line-clamp-3">{a.use_description}</p>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <button
                    onClick={() => setViewing(a)}
                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Read the story
                  </button>
                  {isAdmin && user && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditing(a);
                          setOpen(true);
                        }}
                        className="text-gray-400 hover:text-primary p-1"
                        aria-label="Edit artifact"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => confirm("Delete this artifact?") && del.mutate(a.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        aria-label="Delete artifact"
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

      <ArtifactDetail artifact={viewing} onClose={() => setViewing(null)} />
      <ArtifactDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
      />
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-white text-gray-600 border-gray-200 hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function ArtifactDetail({
  artifact,
  onClose,
}: {
  artifact: Artifact | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!artifact} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {artifact && (
          <>
            <div className="relative h-60 bg-gradient-to-br from-amber-100 to-orange-200">
              {artifact.image_url && (
                <img
                  src={artifact.image_url}
                  alt={artifact.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-3 right-3 rounded-full bg-black/40 text-white p-1.5 hover:bg-black/60"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <span className="rounded-full bg-white/90 text-gray-900 text-[10px] font-bold px-2.5 py-1">
                  {artifact.category}
                </span>
                <h2 className="mt-2 text-2xl font-bold text-white drop-shadow">{artifact.name}</h2>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ["Era", artifact.era],
                  ["Origin", artifact.origin],
                  ["Materials", artifact.materials],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label} className="rounded-xl border bg-gray-50/60 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">
                        {label}
                      </div>
                      <div className="text-xs text-gray-700 mt-0.5">{value}</div>
                    </div>
                  ) : null,
                )}
              </div>

              <section>
                <h3 className="text-sm font-bold text-gray-900">Traditional use</h3>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {artifact.use_description}
                </p>
              </section>

              <section>
                <h3 className="text-sm font-bold text-gray-900">The story behind it</h3>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {artifact.story}
                </p>
              </section>

              {artifact.source_url && (
                <a
                  href={artifact.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Image source
                </a>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ArtifactDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Artifact | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState(editing?.category ?? "Artifact");
  const [era, setEra] = useState(editing?.era ?? "");
  const [origin, setOrigin] = useState(editing?.origin ?? "");
  const [materials, setMaterials] = useState(editing?.materials ?? "");
  const [useText, setUseText] = useState(editing?.use_description ?? "");
  const [story, setStory] = useState(editing?.story ?? "");
  const [sourceUrl, setSourceUrl] = useState(editing?.source_url ?? "");
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
    if (!name.trim() || !useText.trim() || !story.trim()) {
      toast.error("Name, use and story are required");
      return;
    }
    setBusy(true);
    try {
      let image_url = editing?.image_url ?? null;
      if (file) image_url = await uploadPostImage(file, user.id);
      const payload = {
        name: name.trim(),
        category: category.trim() || "Artifact",
        era: era.trim() || null,
        origin: origin.trim() || null,
        materials: materials.trim() || null,
        use_description: useText.trim(),
        story: story.trim(),
        source_url: sourceUrl.trim() || null,
        sort_order: Number.parseInt(sortOrder, 10) || 0,
        image_url,
      };
      if (editing) {
        const { error } = await supabase
          .from("museum_artifacts")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Artifact updated");
      } else {
        const { error } = await supabase
          .from("museum_artifacts")
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast.success("Artifact added");
      }
      qc.invalidateQueries({ queryKey: key });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit artifact" : "New artifact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Igicuba (Milk Gourd)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Vessel, Craft, Instrument…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Era (optional)</Label>
              <Input value={era ?? ""} onChange={(e) => setEra(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Origin (optional)</Label>
              <Input value={origin ?? ""} onChange={(e) => setOrigin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Materials (optional)</Label>
              <Input value={materials ?? ""} onChange={(e) => setMaterials(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Traditional use</Label>
            <Textarea
              rows={3}
              value={useText}
              onChange={(e) => setUseText(e.target.value)}
              placeholder="How the object was used…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Story behind it</Label>
            <Textarea
              rows={5}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="The history, meaning and traditions attached to it…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Image source URL (optional)</Label>
              <Input value={sourceUrl ?? ""} onChange={(e) => setSourceUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Display order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Photo</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:border-primary/50">
                <ImageIcon className="h-4 w-4" /> Choose image
                <input type="file" accept="image/*" className="hidden" onChange={pick} />
              </label>
              {preview && (
                <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover border" />
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Add artifact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
