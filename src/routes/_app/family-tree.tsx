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
      { title: "Family Tree - Banyamulenge Community" },
      {
        name: "description",
        content: "Build the Banyamulenge family tree - add relatives by lineage.",
      },
      { property: "og:title", content: "Family Tree - Banyamulenge Community" },
      {
        property: "og:description",
        content: "Add your family and connect the Banyamulenge diaspora.",
      },
    ],
  }),
  component: FamilyTreePage,
});

const LINEAGES = [
  "Abagorora",
  "Abasinzira",
  "Abega",
  "Abasita",
  "Abasegege",
  "Abanyabzinshi",
  "Abasama",
  "Abitira",
  "Abahondogo",
  "Abazigaba",
  "Abadasomera",
  "Abahima",
  "Abadahugwa",
  "Abazoza",
  "Abasinga",
  "Abapfurika",
  "Abashonga",
  "Abahinda",
  "Abatura",
  "Abatakure",
  "Abahiga",
  "Ababano",
  "Abagabika",
  "Abadinzi",
  "Abongera",
  "Abanyakarama",
  "Abaheto",
  "Abatwari",
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
    return new Set(
      (members ?? []).filter((m) => m.name.toLowerCase().includes(q)).map((m) => m.id),
    );
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

  const renderNode = (m: Member): React.ReactNode => {
    const kids = childrenByParent.get(m.id) ?? [];
    const highlighted = matches.has(m.id);
    const canDelete = user?.id === m.added_by || isAdmin;
    return (
      <li key={m.id} className="ft-node">
        <div
          className={`ft-card group inline-flex flex-col items-center gap-1 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition min-w-[150px] ${
            highlighted
              ? "ring-2 ring-amber-400 border-amber-300 bg-amber-50"
              : "hover:border-primary/40 hover:shadow-md"
          }`}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-amber-500 text-white text-sm font-bold shadow-inner">
            {m.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm leading-tight">{m.name}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {[m.relationship, m.birth_year ? `b. ${m.birth_year}` : null]
                .filter(Boolean)
                .join(" · ") || "Family member"}
            </div>
          </div>
          <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition">
            <AddMemberDialog lineage={lineage} parentId={m.id} parentName={m.name}>
              <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Add relative">
                <UserPlus className="h-3 w-3" />
              </Button>
            </AddMemberDialog>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-700"
                onClick={() => del.mutate(m.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        {kids.length > 0 && <ul className="ft-children">{kids.map((k) => renderNode(k))}</ul>}
      </li>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <style>{`
        .ft-tree, .ft-tree ul { list-style: none; margin: 0; padding: 0; }
        .ft-tree { display: flex; justify-content: center; padding-top: 8px; }
        .ft-tree .ft-children { display: flex; justify-content: center; padding-top: 32px; position: relative; }
        .ft-tree .ft-children::before {
          content: ''; position: absolute; top: 0; left: 50%;
          width: 2px; height: 20px; background: hsl(var(--border, 0 0% 88%));
        }
        .ft-tree .ft-node { position: relative; padding: 0 12px; }
        .ft-tree .ft-node > .ft-card { position: relative; }
        .ft-tree .ft-children > .ft-node { padding-top: 20px; }
        .ft-tree .ft-children > .ft-node::before {
          content: ''; position: absolute; top: 0; left: 50%;
          width: 2px; height: 20px; background: hsl(var(--border, 0 0% 88%));
        }
        .ft-tree .ft-children > .ft-node::after {
          content: ''; position: absolute; top: 0; height: 2px;
          background: hsl(var(--border, 0 0% 88%));
        }
        .ft-tree .ft-children > .ft-node:only-child::after { display: none; }
        .ft-tree .ft-children > .ft-node:first-child::after { left: 50%; right: 0; }
        .ft-tree .ft-children > .ft-node:last-child::after { left: 0; right: 50%; }
        .ft-tree .ft-children > .ft-node:not(:first-child):not(:last-child)::after { left: 0; right: 0; }
      `}</style>

      <header className="rounded-3xl border bg-gradient-to-br from-primary via-primary to-primary/80 text-white p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/20">
            <Trees className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black leading-tight">Family Tree</h1>
            <p className="mt-2 text-white max-w-2xl text-sm sm:text-base">
              Choose your lineage (umurara), add yourself and your relatives, and help us connect
              the Banyamulenge diaspora - one family at a time.
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[240px_1fr_auto] items-end">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-gray-500">Lineage</Label>
            <Select value={lineage} onValueChange={setLineage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {LINEAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
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
            <Button className="gap-2 h-10">
              <Plus className="h-4 w-4" /> Add member
            </Button>
          </AddMemberDialog>
        </div>
      </div>

      <div className="rounded-2xl border bg-gradient-to-b from-white to-gray-50/60 p-4 sm:p-8 shadow-sm min-h-[400px] overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-lg">{lineage}</h2>
            <p className="text-xs text-gray-500">Hover any member to add a relative</p>
          </div>
          <span className="text-xs text-gray-500 rounded-full border px-2.5 py-1 bg-white">
            {members?.length ?? 0} members
          </span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : roots.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-500">
            <Trees className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            No one has been added to <strong>{lineage}</strong> yet. Be the first to plant a root.
          </div>
        ) : (
          <div className="min-w-fit">
            {roots.map((r) => (
              <ul key={r.id} className="ft-tree mb-10 last:mb-0">
                {renderNode(r)}
              </ul>
            ))}
          </div>
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
    setName("");
    setRelationship("");
    setBirthYear("");
    setNotes("");
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rukundo Jean"
            />
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
