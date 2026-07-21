import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Trees, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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

export const Route = createFileRoute("/_app/family-tree")({
  head: () => ({
    meta: [
      { title: "Family Tree — Banyamulenge Community" },
      { name: "description", content: "Build the Banyamulenge family tree — add relatives by lineage." },
      { property: "og:title", content: "Family Tree — Banyamulenge Community" },
      { property: "og:description", content: "Add your family and connect the Banyamulenge diaspora." },
    ],
  }),
  component: FamilyTreePage,
});

const LINEAGES = [
  "Abagorora","Abasinzira","Abega","Abasita","Abasegege","Abanyabzinshi","Abasama","Abitira",
  "Abahondogo","Abazigaba","Abadasomera","Abahima","Abadahugwa","Abazoza","Abasinga","Abapfurika",
  "Abashonga","Abahinda","Abatura","Abatakure","Abahiga","Ababano","Abagabika","Abadinzi",
  "Abongera","Abanyakarama","Abaheto","Abatwari",
];

type Member = {
  id: string;
  added_by: string;
  lineage: string;
  name: string;
  parent_id: string | null;
  relationship: string | null;
  notes: string | null;
  birth_year: number | null;
};

function FamilyTreePage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [lineage, setLineage] = useState<string>("Abega");
  const [search, setSearch] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["family-tree", lineage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("id, added_by, lineage, name, parent_id, relationship, notes, birth_year")
        .eq("lineage", lineage)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const roots = useMemo(() => (members ?? []).filter((m) => !m.parent_id), [members]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Member[]>();
    (members ?? []).forEach((m) => {
      if (m.parent_id) {
        const list = map.get(m.parent_id) ?? [];
        list.push(m);
        map.set(m.parent_id, list);
      }
    });
    return map;
  }, [members]);

  const matches = useMemo(() => {
    if (!search.trim()) return new Set<string>();
    const q = search.toLowerCase();
    return new Set((members ?? []).filter((m) => m.name.toLowerCase().includes(q)).map((m) => m.id));
  }, [members, search]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["family-tree", lineage] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderNode = (m: Member, depth = 0) => {
    const kids = childrenByParent.get(m.id) ?? [];
    const highlighted = matches.has(m.id);
    const canDelete = user?.id === m.added_by || isAdmin;
    return (
      <li key={m.id} className="relative pl-6">
        <span className="absolute left-0 top-4 h-px w-4 bg-gray-300" />
        <div
          className={`inline-flex items-start gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm transition ${
            highlighted ? "ring-2 ring-amber-400 border-amber-300 bg-amber-50" : ""
          }`}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {m.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">{m.name}</div>
            <div className="text-[11px] text-gray-500">
              {[m.relationship, m.birth_year ? `b. ${m.birth_year}` : null].filter(Boolean).join(" · ") ||
                (depth === 0 ? "Ancestor" : "Descendant")}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-1">
            <AddMemberDialog lineage={lineage} parentId={m.id} parentName={m.name}>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Add relative">
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            </AddMemberDialog>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-700"
                onClick={() => del.mutate(m.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        {kids.length > 0 && (
          <ul className="mt-2 border-l border-gray-300 ml-4 space-y-2">
            {kids.map((k) => renderNode(k, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="rounded-3xl border bg-gradient-to-br from-amber-500 via-primary to-primary/80 text-white p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Trees className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black leading-tight">Family Tree</h1>
            <p className="mt-2 text-white/90 max-w-2xl text-sm sm:text-base">
              Choose your lineage (umurara), add yourself and your relatives, and help us
              connect the Banyamulenge diaspora — one family at a time.
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[240px_1fr_auto] items-end">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-gray-500">Lineage</Label>
            <Select value={lineage} onValueChange={setLineage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {LINEAGES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-gray-500">Search a name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Rukundo"
                className="pl-9"
              />
            </div>
          </div>
          <AddMemberDialog lineage={lineage}>
            <Button className="gap-2 h-10"><Plus className="h-4 w-4" /> Add member</Button>
          </AddMemberDialog>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm min-h-[300px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{lineage}</h2>
          <span className="text-xs text-gray-500">{members?.length ?? 0} members</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : roots.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            No one has been added to <strong>{lineage}</strong> yet. Be the first to plant a root.
          </div>
        ) : (
          <ul className="space-y-3">{roots.map((r) => renderNode(r))}</ul>
        )}
      </div>
    </div>
  );
}

function AddMemberDialog({
  lineage,
  parentId,
  parentName,
  children,
}: {
  lineage: string;
  parentId?: string;
  parentName?: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("family_members").insert({
      added_by: user.id,
      lineage,
      name: name.trim(),
      parent_id: parentId ?? null,
      relationship: relationship.trim() || null,
      birth_year: birthYear ? Number(birthYear) : null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Added to the tree");
    setName(""); setRelationship(""); setBirthYear(""); setNotes("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["family-tree", lineage] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {parentName ? `Add relative of ${parentName}` : `Add member to ${lineage}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rukundo Jean" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Son, Grandmother"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Birth year</Label>
              <Input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="1985"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Location, profession, story..."
              className="min-h-[70px]"
            />
          </div>
          <Button onClick={submit} disabled={!name.trim() || busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to tree"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
