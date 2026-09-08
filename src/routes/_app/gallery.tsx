import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Images, Loader2, Plus, Search, Pencil, Trash2, X, Calendar, Upload } from "lucide-react";

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

export const Route = createFileRoute("/_app/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery - Banyamulenge Key Figures & Events" },
      {
        name: "description",
        content:
          "A visual archive of the Banyamulenge community: key figures, historic events and the places that shaped us.",
      },
      { property: "og:title", content: "Gallery - Banyamulenge Key Figures & Events" },
      {
        property: "og:description",
        content: "Photographs of Banyamulenge key figures, events and places, with their stories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});

type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string;
  taken_on: string | null;
  sort_order: number;
  created_at: string;
};

const KEY = ["gallery-items"] as const;
const CATEGORIES = ["Key figure", "Event", "Place", "Everyday life"];

function GalleryPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [viewing, setViewing] = useState<GalleryItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GalleryItem[];
    },
  });

  const categories = useMemo(
    () => Array.from(new Set([...(data ?? []).map((g) => g.category)].filter(Boolean))),
    [data],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return (data ?? []).filter((g) => {
      if (cat !== "all" && g.category !== cat) return false;
      if (!ql) return true;
      return (
        g.title.toLowerCase().includes(ql) ||
        (g.description ?? "").toLowerCase().includes(ql) ||
        (g.taken_on ?? "").toLowerCase().includes(ql)
      );
    });
  }, [data, q, cat]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Photo removed");
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: Error) => toast.error(e),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-amber-50 to-white p-6 md:p-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <Images className="h-3.5 w-3.5" /> Gallery
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Faces, moments and places of our people
            </h1>
            <p className="mt-2 text-gray-600 text-sm md:text-base">
              A growing visual archive of Banyamulenge key figures, historic events and the places
              that carry our memory.
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
              <Plus className="h-4 w-4" /> Add photo
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
            placeholder="Search people, events, years…"
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
          <Images className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">
            No photos here yet{isAdmin ? " - add the first one." : "."}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
          {filtered.map((g) => (
            <figure
              key={g.id}
              className="mb-5 break-inside-avoid group relative rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-xl transition"
            >
              <button onClick={() => setViewing(g)} className="block w-full text-left">
                <img
                  loading="lazy"
                  decoding="async"
                  src={g.image_url}
                  alt={g.title}
                  className="w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute top-3 left-3 rounded-full bg-white/90 text-gray-900 text-[10px] font-bold px-2.5 py-1 shadow">
                  {g.category}
                </span>
              </button>
              <figcaption className="p-4">
                <h3 className="font-bold text-sm text-gray-900 leading-snug">{g.title}</h3>
                {g.taken_on && (
                  <p className="mt-1 text-[11px] text-gray-500 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {g.taken_on}
                  </p>
                )}
                {g.description && (
                  <p className="mt-2 text-xs text-gray-600 line-clamp-3">{g.description}</p>
                )}
                {isAdmin && user && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditing(g);
                        setOpen(true);
                      }}
                      className="text-gray-400 hover:text-primary p-1"
                      aria-label="Edit photo"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => confirm("Remove this photo?") && del.mutate(g.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          {viewing && (
            <>
              <div className="relative bg-black">
                <img
                  src={viewing.image_url}
                  alt={viewing.title}
                  className="w-full max-h-[65vh] object-contain"
                />
                <button
                  onClick={() => setViewing(null)}
                  className="absolute top-3 right-3 rounded-full bg-black/50 text-white p-1.5 hover:bg-black/70"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-6 space-y-2">
                <span className="rounded-full bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1">
                  {viewing.category}
                </span>
                <h2 className="text-xl font-bold text-gray-900">{viewing.title}</h2>
                {viewing.taken_on && (
                  <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {viewing.taken_on}
                  </p>
                )}
                {viewing.description && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap pt-1">
                    {viewing.description}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <GalleryDialog
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

function GalleryDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: GalleryItem | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [category, setCategory] = useState(editing?.category ?? CATEGORIES[0]!);
  const [takenOn, setTakenOn] = useState(editing?.taken_on ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
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
    if (!title.trim()) return toast.error("Please give the photo a title");
    if (!file && !editing) return toast.error("Please choose an image from your device");
    setBusy(true);
    try {
      let image_url = editing?.image_url ?? "";
      if (file) image_url = await uploadPostImage(file, user.id);
      const payload = {
        title: title.trim(),
        category: category.trim() || "Event",
        taken_on: takenOn.trim() || null,
        description: description.trim() || null,
        sort_order: Number.parseInt(sortOrder, 10) || 0,
        image_url,
      };
      if (editing) {
        const { error } = await supabase.from("gallery_items").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Photo updated");
      } else {
        const { error } = await supabase
          .from("gallery_items")
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast.success("Photo added to the gallery");
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
          <DialogTitle>{editing ? "Edit photo" : "Add photo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Elders gathering at Minembwe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Date / year (optional)</Label>
              <Input
                value={takenOn}
                onChange={(e) => setTakenOn(e.target.value)}
                placeholder="1998, or June 2016"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who is in the photo, what happened, why it matters…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Display order</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Image</Label>
            <label className="flex items-center gap-2 rounded-xl border border-dashed p-3 cursor-pointer hover:border-primary/50 text-sm text-gray-600">
              <Upload className="h-4 w-4" /> Choose an image from your device
              <input type="file" accept="image/*" onChange={pick} className="hidden" />
            </label>
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mt-2 h-40 w-full rounded-xl object-cover border"
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
            {editing ? "Save changes" : "Add photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
