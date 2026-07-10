import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Megaphone, Plus, Loader2, Trash2, ExternalLink, Image as ImageIcon } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadPostImage } from "@/lib/upload";

type Advert = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
};

const key = ["adverts"] as const;

export function AdvertsPanel() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: adverts, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("adverts")
        .select("id, user_id, title, content, image_url, link_url, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Advert[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("adverts-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "adverts" }, () => {
        qc.invalidateQueries({ queryKey: key });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Community Board</h3>
              <p className="text-[11px] text-gray-500">Announcements, blogs & partners</p>
            </div>
          </div>
          {isAdmin && <NewAdvertDialog />}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : adverts && adverts.length > 0 ? (
          <div className="space-y-4">
            {adverts.map((a) => (
              <AdvertCard key={a.id} advert={a} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-6">No posts on the board yet.</p>
        )}
      </div>
    </aside>
  );
}

function AdvertCard({ advert }: { advert: Advert }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("adverts").delete().eq("id", advert.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className="rounded-xl border bg-white overflow-hidden hover:border-primary/30 transition">
      {advert.image_url && (
        <img src={advert.image_url} alt="" className="w-full h-46 object-cover" loading="lazy" />
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-sm leading-tight flex-1">{advert.title}</h4>
          {isAdmin && (
            <button
              onClick={() => del.mutate()}
              className="text-gray-300 hover:text-red-500 transition"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">
          {advert.content}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            {formatDistanceToNow(new Date(advert.created_at), { addSuffix: true })}
          </span>
          {advert.link_url && (
            <a
              href={advert.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              Learn more <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function NewAdvertDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!user || !title.trim() || !content.trim()) return;
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadPostImage(file, user.id);
      const { error } = await supabase.from("adverts").insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        image_url,
        link_url: link.trim() || null,
      });
      if (error) throw error;
      toast.success("Published");
      setOpen(false);
      setTitle("");
      setContent("");
      setLink("");
      setFile(null);
      setPreview(null);
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 h-8 px-2">
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New board post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Community announcement"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
          </div>
          <div className="space-y-1.5">
            <Label>Link (optional)</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !title.trim() || !content.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
