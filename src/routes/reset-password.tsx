import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifySuccess } from "@/lib/notify";
import logoStacked from "@/assets/logo-stacked.png";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password - Banyamulenge Heritage Hub" },
      {
        name: "description",
        content: "Choose a new password for your Banyamulenge Heritage Hub account.",
      },
      { property: "og:title", content: "Set a new password - Banyamulenge Heritage Hub" },
      {
        property: "og:description",
        content: "Choose a new password for your Banyamulenge Heritage Hub account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Supabase puts the recovery token in the URL hash; the SDK consumes it and
  // emits PASSWORD_RECOVERY once the temporary session exists.
  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) setHasRecoverySession(true);
      setChecking(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      setDone(true);
      notifySuccess("Password updated", { description: "Sign in with your new password." });
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/auth", replace: true }), 1600);
    } catch (err) {
      setError((err as Error).message || "Couldn't update your password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-2xl border-2 bg-card shadow-soft p-6 sm:p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={logoStacked} alt="Banyamulenge Heritage Hub" className="h-20 w-auto" />
          <h1 className="mt-3 text-lg font-bold">Set a new password</h1>
        </div>

        {checking ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Verifying reset link…</p>
        ) : !hasRecoverySession ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm text-destructive">This reset link is invalid or has expired.</p>
            <Button className="w-full" onClick={() => navigate({ to: "/auth", replace: true })}>
              Back to login
            </Button>
          </div>
        ) : done ? (
          <div className="space-y-2 py-6 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="font-medium">Password updated</p>
            <p className="text-sm text-muted-foreground">Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  className="h-11 pl-9 pr-10 border-2 focus-visible:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={6}
                  required
                  className="h-11 pl-9 border-2 focus-visible:border-primary"
                />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full h-11 text-base font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
