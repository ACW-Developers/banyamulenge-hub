import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Lock, User, Loader2, ArrowLeft, Eye, EyeOff, MailCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import authHero from "@/assets/auth-bg.jpg";
import logoStacked from "@/assets/logo-stacked.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login - Banyamulenge Community Heritage" },
      {
        name: "description",
        content: "Log in or join the Banyamulenge Community Heritage platform.",
      },
    ],
  }),
  component: AuthPage,
});

const inputClass = "pl-9 h-11 border-2 border-input focus-visible:border-primary rounded-lg";

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        toast.success("Reset link sent - check your inbox (and spam folder).");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      } else {
        if (!agreed) {
          toast.error("Please accept the Terms and Privacy Policy to continue.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created - welcome!");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isForgot = mode === "forgot";

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left visual - full-bleed hero with darkened bottom */}
      <div
        className="relative hidden lg:flex flex-col justify-end overflow-hidden bg-gray-900"
        style={{
          backgroundImage: `url(${authHero})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="relative z-10 p-10 text-white max-w-xl">
          <h1 className="text-3xl font-bold leading-tight drop-shadow-lg">
            One community. One heritage. Everywhere in the world.
          </h1>
          <p className="mt-3 text-white/90 drop-shadow">
            Preserve our stories, connect across continents, and celebrate Banyamulenge culture.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border-2 bg-card shadow-soft p-6 sm:p-8 pt-6">
            <div className="flex flex-col items-center mb-5">
              <img
                src={logoStacked}
                alt="Banyamulenge Heritage Hub"
                className="h-24 w-auto object-contain"
              />
              <p className="text-xs text-muted-foreground mt-2">Community Heritage Platform</p>
            </div>

            {!isForgot && (
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`py-2 text-sm font-semibold rounded-md transition ${
                    mode === "signin"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`py-2 text-sm font-semibold rounded-md transition ${
                    mode === "signup"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {isForgot && (
              <div className="mb-6 text-center">
                <h2 className="text-lg font-bold">Forgot your password?</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your email and we'll send you a link to set a new password.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                    disabled={isForgot && resetSent}
                    required
                  />
                </div>
              </div>

              {!isForgot && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setResetSent(false);
                        }}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-10`}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPw ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div className="flex items-start gap-2.5 rounded-lg border-2 border-dashed p-3">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(v) => setAgreed(v === true)}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-xs font-normal leading-relaxed text-muted-foreground"
                  >
                    I agree to the{" "}
                    <span className="font-semibold text-primary">Terms and Conditions</span> and the{" "}
                    <span className="font-semibold text-primary">Privacy Policy</span> of
                    Banyamulenge Heritage Hub.
                  </Label>
                </div>
              )}

              {isForgot && resetSent && (
                <div className="flex items-start gap-2 rounded-lg border-2 border-emerald-600/30 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <MailCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Email sent. Open the link in your inbox to set a new password, then log in
                    again.
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  busy ||
                  (mode === "signup" && !agreed) ||
                  (isForgot && (resetSent || !email.trim()))
                }
                className="w-full h-11 text-base font-semibold"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isForgot ? (
                  resetSent ? (
                    "Reset link sent"
                  ) : (
                    "Send reset link"
                  )
                ) : mode === "signin" ? (
                  "Login"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {isForgot && (
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setResetSent(false);
                }}
                className="mt-4 w-full text-center text-xs font-medium text-primary hover:underline"
              >
                Back to login
              </button>
            )}

            <div className="mt-6 text-center text-xs text-muted-foreground">
              <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
                <ArrowLeft className="h-3 w-3" /> Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

