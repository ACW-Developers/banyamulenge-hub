import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Store,
  Plus,
  Loader2,
  Search,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  Trash2,
  Pencil,
  Image as ImageIcon,
  Briefcase,
  Package,
  UserSearch,
  UsersRound,
  Tag,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace - Banyamulenge Community" },
      {
        name: "description",
        content:
          "Advertise services, sell products, find customers and hire employees in the Banyamulenge Marketplace.",
      },
      { property: "og:title", content: "Marketplace - Banyamulenge Community" },
      {
        property: "og:description",
        content: "Services, products, customers and jobs - all in one community marketplace.",
      },
    ],
  }),
  component: MarketplacePage,
});

type Kind = "service" | "product" | "customer" | "job";

type Listing = {
  id: string;
  user_id: string;
  kind: Kind;
  category: string;
  title: string;
  description: string;
  price: number | null;
  currency: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
};

const KINDS: {
  value: Kind;
  label: string;
  desc: string;
  icon: typeof Store;
  color: string;
}[] = [
  {
    value: "service",
    label: "Services",
    desc: "Advertise a service you offer",
    icon: Briefcase,
    color: "from-amber-500 to-orange-500",
  },
  {
    value: "product",
    label: "Products",
    desc: "Sell items in the community",
    icon: Package,
    color: "from-emerald-500 to-teal-500",
  },
  {
    value: "customer",
    label: "Find Customers",
    desc: "Reach potential clients",
    icon: UserSearch,
    color: "from-sky-500 to-blue-500",
  },
  {
    value: "job",
    label: "Hiring",
    desc: "Post open roles",
    icon: UsersRound,
    color: "from-fuchsia-500 to-purple-500",
  },
];

const key = ["marketplace"] as const;

function MarketplacePage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | Kind>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Listing | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Listing[];
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const ql = q.trim().toLowerCase();
    return list.filter((l) => {
      if (tab !== "all" && l.kind !== tab) return false;
      if (!ql) return true;
      return (
        l.title.toLowerCase().includes(ql) ||
        l.description.toLowerCase().includes(ql) ||
        l.category.toLowerCase().includes(ql) ||
        (l.location ?? "").toLowerCase().includes(ql)
      );
    });
  }, [data, tab, q]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing removed");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="rounded-3xl overflow-hidden border bg-gradient-to-br from-primary/10 via-orange-50 to-amber-50 p-6 md:p-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <Store className="h-3.5 w-3.5" /> Community Marketplace
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Trade, hire and grow together
            </h1>
            <p className="mt-2 text-gray-600 text-sm md:text-base">
              Advertise your services, sell products, find customers or hire employees within the
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
              <Plus className="h-4 w-4" /> Post a listing
            </Button>
          )}
        </div>

        {/* Category cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <div className="text-[11px] text-gray-500">{k.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, category, location…"
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

      {/* Listings */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-2xl bg-white">
          <Store className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">No listings match your search yet.</p>
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
              <Plus className="h-4 w-4" /> Create the first one
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => {
            const canManage = user && (user.id === l.user_id || isAdmin);
            const meta = KINDS.find((k) => k.value === l.kind);
            const Icon = meta?.icon ?? Store;
            return (
              <article
                key={l.id}
                className="group rounded-2xl border bg-white overflow-hidden hover:border-primary/40 hover:shadow-lg transition flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
                  {l.image_url ? (
                    <img
                      src={l.image_url}
                      alt={l.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  <span
                    className={`absolute top-2 left-2 rounded-full bg-gradient-to-br ${meta?.color ?? "from-gray-500 to-gray-700"} text-white text-[10px] font-bold px-2.5 py-1 shadow`}
                  >
                    {meta?.label ?? l.kind}
                  </span>
                  {l.price != null && (
                    <span className="absolute top-2 right-2 rounded-full bg-white/95 text-gray-900 text-xs font-bold px-2.5 py-1 shadow">
                      {l.currency ?? "USD"} {Number(l.price).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base leading-snug text-gray-900 line-clamp-2">
                      {l.title}
                    </h3>
                    {canManage && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => {
                            setEditing(l);
                            setOpen(true);
                          }}
                          className="text-gray-400 hover:text-primary p-1"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => confirm("Delete this listing?") && del.mutate(l.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                    <Tag className="h-3 w-3" /> {l.category}
                    {l.location && (
                      <>
                        <span className="mx-1">•</span>
                        <MapPin className="h-3 w-3" /> {l.location}
                      </>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
                    {l.description}
                  </p>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-2">
                      {l.contact_email && (
                        <a
                          href={`mailto:${l.contact_email}`}
                          className="hover:text-primary"
                          title={l.contact_email}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {l.contact_phone && (
                        <a
                          href={`tel:${l.contact_phone}`}
                          className="hover:text-primary"
                          title={l.contact_phone}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {l.link_url && (
                        <a
                          href={l.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ListingDialog
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

function ListingDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Listing | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<Kind>(editing?.kind ?? "service");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [price, setPrice] = useState<string>(editing?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(editing?.currency ?? "USD");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [email, setEmail] = useState(editing?.contact_email ?? "");
  const [phone, setPhone] = useState(editing?.contact_phone ?? "");
  const [link, setLink] = useState(editing?.link_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(editing?.image_url ?? null);

  // reset when opening for a different item
  useState(() => {
    // noop; we rely on remount by unmounting via `open`
  });

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!user || !title.trim() || !description.trim() || !category.trim()) {
      toast.error("Title, category and description are required");
      return;
    }
    setBusy(true);
    try {
      let image_url = editing?.image_url ?? null;
      if (file) image_url = await uploadPostImage(file, user.id);
      const payload = {
        user_id: user.id,
        kind,
        category: category.trim(),
        title: title.trim(),
        description: description.trim(),
        price: price ? Number(price) : null,
        currency: currency || "USD",
        location: location.trim() || null,
        contact_email: email.trim() || null,
        contact_phone: phone.trim() || null,
        link_url: link.trim() || null,
        image_url,
      };
      if (editing) {
        const { error } = await supabase
          .from("marketplace_listings")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Listing updated");
      } else {
        const { error } = await supabase.from("marketplace_listings").insert(payload);
        if (error) throw error;
        toast.success("Listing published");
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
          <DialogTitle>{editing ? "Edit listing" : "New marketplace listing"}</DialogTitle>
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
              <Label>Category</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Tailoring, Electronics"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Price (optional)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={currency ?? ""} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={location ?? ""} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact email</Label>
              <Input value={email ?? ""} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>External link (optional)</Label>
            <Input
              value={link ?? ""}
              onChange={(e) => setLink(e.target.value)}
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
