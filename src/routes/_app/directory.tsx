import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookUser,
  Plus,
  Loader2,
  Search,
  MapPin,
  Mail,
  Phone,
  Globe,
  Trash2,
  Pencil,
  Image as ImageIcon,
  Briefcase,
  Church,
  Building2,
  Landmark,
  GraduationCap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/directory")({
  head: () => ({
    meta: [
      { title: "Community Directory - Banyamulenge" },
      {
        name: "description",
        content:
          "Search and discover Banyamulenge professionals, churches, organizations, businesses and mentors.",
      },
      { property: "og:title", content: "Community Directory - Banyamulenge" },
      {
        property: "og:description",
        content: "Professionals, churches, organizations, businesses and mentors in one place.",
      },
    ],
  }),
  component: DirectoryPage,
});

type Kind = "professional" | "church" | "organization" | "business" | "mentor";

type Entry = {
  id: string;
  user_id: string;
  kind: Kind;
  name: string;
  description: string;
  category: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  image_url: string | null;
  created_at: string;
};

const KINDS: {
  value: Kind;
  label: string;
  icon: typeof Briefcase;
  color: string;
}[] = [
  { value: "professional", label: "Professionals", icon: Briefcase, color: "from-blue-500 to-indigo-500" },
  { value: "church", label: "Churches", icon: Church, color: "from-amber-500 to-orange-500" },
  { value: "organization", label: "Organizations", icon: Landmark, color: "from-emerald-500 to-teal-500" },
  { value: "business", label: "Businesses", icon: Building2, color: "from-rose-500 to-pink-500" },
  { value: "mentor", label: "Mentors", icon: GraduationCap, color: "from-fuchsia-500 to-purple-500" },
];

const key = ["directory"] as const;

function DirectoryPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | Kind>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("directory_entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const ql = q.trim().toLowerCase();
    return list.filter((e) => {
      if (tab !== "all" && e.kind !== tab) return false;
      if (!ql) return true;
      return (
        e.name.toLowerCase().includes(ql) ||
        e.description.toLowerCase().includes(ql) ||
        (e.category ?? "").toLowerCase().includes(ql) ||
        (e.location ?? "").toLowerCase().includes(ql)
      );
    });
  }, [data, tab, q]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("directory_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry removed");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="rounded-3xl overflow-hidden border bg-gradient-to-br from-primary/10 via-teal-50 to-emerald-50 p-6 md:p-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <BookUser className="h-3.5 w-3.5" /> Community Directory
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Find the people and places you need
            </h1>
            <p className="mt-2 text-gray-600 text-sm md:text-base">
              Search professionals, churches, organizations, businesses and mentors across the
              Banyamulenge community.
            </p>
          </div>
          {user && (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add entry
            </Button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          {KINDS.map((k) => {
            const active = tab === k.value;
            const Icon = k.icon;
            return (
              <button
                key={k.value}
                onClick={() => setTab(active ? "all" : k.value)}
                className={`text-left rounded-2xl border bg-white p-4 hover:shadow-md transition ${
                  active ? "border-primary ring-2 ring-primary/20" : "border-gray-200"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg bg-gradient-to-br ${k.color} text-white flex items-center justify-center`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">{k.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, category, location…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <TabPill active={tab === "all"} onClick={() => setTab("all")}>
            All
          </TabPill>
          {KINDS.map((k) => (
            <TabPill key={k.value} active={tab === k.value} onClick={() => setTab(k.value)}>
              {k.label}
            </TabPill>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-white">
          <BookUser className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">No entries match your search yet.</p>
          {user && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add the first one
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => {
            const canManage = user && (user.id === e.user_id || isAdmin);
            const meta = KINDS.find((k) => k.value === e.kind);
            const Icon = meta?.icon ?? BookUser;
            return (
              <article
                key={e.id}
                className="group rounded-2xl border bg-white overflow-hidden hover:border-primary/40 hover:shadow-lg transition flex flex-col"
              >
                <div
                  className={`h-24 bg-gradient-to-br ${meta?.color ?? "from-gray-500 to-gray-700"} relative`}
                >
                  {e.image_url ? (
                    <img
                      src={e.image_url}
                      alt=""
                      className="w-full h-full object-cover opacity-90"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="h-8 w-8 text-white/70" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-white/90 text-gray-900 text-[10px] font-bold px-2.5 py-1 shadow">
                    {meta?.label ?? e.kind}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base leading-snug text-gray-900 line-clamp-2">
                      {e.name}
                    </h3>
                    {canManage && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => {
                            setEditing(e);
                            setOpen(true);
                          }}
                          className="text-gray-400 hover:text-primary p-1"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => confirm("Delete this entry?") && del.mutate(e.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {(e.category || e.location) && (
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                      {e.category && <span>{e.category}</span>}
                      {e.category && e.location && <span>•</span>}
                      {e.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.location}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="mt-2 text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                    {e.description}
                  </p>

                  <div className="mt-3 pt-3 border-t flex items-center justify-end gap-3 text-gray-500">
                    {e.email && (
                      <a
                        href={`mailto:${e.email}`}
                        className="hover:text-primary"
                        title={e.email}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {e.phone && (
                      <a
                        href={`tel:${e.phone}`}
                        className="hover:text-primary"
                        title={e.phone}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {e.website && (
                      <a
                        href={e.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                        title={e.website}
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <EntryDialog
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={setOpen}
        editing={editing}
      />
    </div>
  );
}

function TabPill({
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

function EntryDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Entry | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind>(editing?.kind ?? "professional");
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [website, setWebsite] = useState(editing?.website ?? "");
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
    if (!user || !name.trim() || !description.trim()) {
      toast.error("Name and description are required");
      return;
    }
    setBusy(true);
    try {
      let image_url = editing?.image_url ?? null;
      if (file) image_url = await uploadPostImage(file, user.id);
      const payload = {
        user_id: user.id,
        kind,
        name: name.trim(),
        description: description.trim(),
        category: category.trim() || null,
        location: location.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        image_url,
      };
      if (editing) {
        const { error } = await supabase
          .from("directory_entries")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Entry updated");
      } else {
        const { error } = await supabase.from("directory_entries").insert(payload);
        if (error) throw error;
        toast.success("Entry added");
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
          <DialogTitle>{editing ? "Edit entry" : "New directory entry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Input
                value={category ?? ""}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Doctor, Baptist"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={location ?? ""} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email ?? ""} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input
              value={website ?? ""}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Image (optional)</Label>
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50 w-fit">
              <ImageIcon className="h-4 w-4" /> Choose image
              <input type="file" accept="image/*" className="hidden" onChange={pick} />
            </label>
            {preview && (
              <img
                src={preview}
                alt="preview"
                className="mt-2 w-full max-h-40 object-cover rounded-lg border"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
