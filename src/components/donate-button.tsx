import { useEffect, useState } from "react";
import { Heart, Globe2, Archive, Server, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { createDonationCheckout, verifyDonation } from "@/lib/donations.functions";

const PRESETS = [5, 10, 25, 50, 100, 200];

const REASONS = [
  {
    icon: Server,
    title: "Keep the platform running",
    text: "Hosting, storage and continuous development of new modules for the community.",
  },
  {
    icon: Archive,
    title: "Preserve our heritage",
    text: "Digitising artifacts, photographs, oral histories and archival documents.",
  },
  {
    icon: Globe2,
    title: "Gather history worldwide",
    text: "Funding researchers and elders across the diaspora to collect Banyamulenge history.",
  },
];

export function DonateButton() {
  const { user, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const startCheckout = useServerFn(createDonationCheckout);
  const confirmDonation = useServerFn(verifyDonation);

  useEffect(() => {
    if (profile?.display_name && !name) setName(profile.display_name);
  }, [profile?.display_name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle the return trip from Stripe Checkout.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("donation");
    if (!sid) return;
    params.delete("donation");
    const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
    window.history.replaceState({}, "", clean);
    if (sid === "cancelled") {
      toast.info("Donation cancelled — no charge was made.");
      return;
    }
    confirmDonation({ data: { sessionId: sid } })
      .then((r) => {
        if (r.paid) toast.success(`Thank you! Your $${(r.amountCents / 100).toFixed(2)} donation was received.`);
        else toast.info("Your donation is still processing.");
      })
      .catch(() => toast.error("We could not confirm the donation status."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveAmount = custom ? Math.round(parseFloat(custom) * 100) : amount * 100;

  const handleDonate = async () => {
    if (!Number.isFinite(effectiveAmount) || effectiveAmount < 100) {
      toast.error("Please enter an amount of at least $1.");
      return;
    }
    if (effectiveAmount > 1000000) {
      toast.error("Maximum online donation is $10,000. Contact us for larger gifts.");
      return;
    }
    setLoading(true);
    try {
      const res = await startCheckout({
        data: {
          amountCents: effectiveAmount,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim() || undefined,
          origin: window.location.origin,
          returnPath: pathname,
          userId: user?.id ?? null,
        },
      });
      if (res.url) window.location.href = res.url;
      else toast.error("Could not start checkout.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary to-primary/80 px-3 sm:px-4 h-10 text-sm font-semibold text-primary-foreground shadow-sm hover:shadow-md hover:brightness-105 transition"
          aria-label="Donate"
        >
          <Heart className="h-4 w-4 fill-current group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Donate</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Heart className="h-5 w-5 text-primary fill-primary" />
            Support Banyamulenge Hub
          </DialogTitle>
          <DialogDescription>
            Every contribution keeps this platform free for the community and funds the worldwide
            effort to gather and safeguard our history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {REASONS.map((r) => (
            <div key={r.title} className="flex gap-3 rounded-xl border bg-muted/30 p-3">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <r.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-1">
          <Label>Choose an amount (USD)</Label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const active = !custom && amount === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setAmount(p);
                    setCustom("");
                  }}
                  className={`rounded-xl border py-3 text-sm font-semibold transition ${
                    active
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  ${p}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="donate-custom">Or enter your own amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                id="donate-custom"
                inputMode="decimal"
                placeholder="Any amount"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                className="pl-7"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="donate-name">Your name</Label>
              <Input
                id="donate-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="donate-email">Email for receipt</Label>
              <Input
                id="donate-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="donate-message">Message (optional)</Label>
            <Textarea
              id="donate-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Say something to the community…"
            />
          </div>

          <Button onClick={handleDonate} disabled={loading} className="w-full h-11 text-base">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2 fill-current" />
                Donate ${(effectiveAmount / 100 || 0).toFixed(2)}
              </>
            )}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Payments are processed securely by Stripe. You'll return here once complete.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
