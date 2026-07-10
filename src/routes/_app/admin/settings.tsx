import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Settings,
  Shield,
  Palette,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Globe,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/admin/settings")({
  component: SettingsAdmin,
});

const COLORS = ["#f97316", "#0ea5e9", "#8b5cf6", "#10b981", "#ec4899", "#facc15", "#64748b"];

function SettingsAdmin() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Change your password and monitor platform traffic.
        </p>
      </div>

      <PasswordSection />
      <TrafficSection />
      <PlatformInfo />
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) return toast.error("Password must be at least 6 characters");
    if (next !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    // Re-authenticate with current password
    const { data: sess } = await supabase.auth.getUser();
    const email = sess.user?.email;
    if (!email) {
      setBusy(false);
      return toast.error("Not signed in");
    }
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (signErr) {
      setBusy(false);
      return toast.error("Current password is wrong");
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="px-6 py-4 border-b flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Change password</h2>
      </div>
      <form onSubmit={submit} className="p-6 grid sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <Label>Current password</Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input
            type={show ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Confirm new</Label>
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <div className="sm:col-span-3">
          <Button disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </div>
      </form>
    </section>
  );
}

function TrafficSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-traffic"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      const { data } = await supabase
        .from("page_visits")
        .select("device, browser, country, os, path, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    const byField = (field: "device" | "browser" | "country" | "os" | "path") => {
      const map = new Map<string, number>();
      rows.forEach((r) => {
        const v = (r[field] as string | null) || "Unknown";
        map.set(v, (map.get(v) ?? 0) + 1);
      });
      return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };
    const byDay = new Map<string, number>();
    rows.forEach((r) => {
      const d = format(new Date(r.created_at), "MMM d");
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    });
    const timeline = Array.from(byDay.entries())
      .reverse()
      .map(([day, visits]) => ({ day, visits }));
    return {
      total: rows.length,
      devices: byField("device"),
      browsers: byField("browser"),
      countries: byField("country").slice(0, 8),
      pages: byField("path").slice(0, 6),
      timeline,
    };
  }, [data]);

  const kpis = [
    {
      label: "Total visits (30d)",
      value: stats.total,
      icon: BarChart3,
      accent: "text-primary bg-primary/10",
    },
    {
      label: "Desktop",
      value: stats.devices.find((d) => d.name === "Desktop")?.value ?? 0,
      icon: Monitor,
      accent: "text-sky-600 bg-sky-100",
    },
    {
      label: "Mobile",
      value: stats.devices.find((d) => d.name === "Mobile")?.value ?? 0,
      icon: Smartphone,
      accent: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "Countries/regions",
      value: stats.countries.length,
      icon: Globe,
      accent: "text-violet-600 bg-violet-100",
    },
  ];

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="px-6 py-4 border-b flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Traffic & analytics</h2>
        <span className="ml-auto text-xs text-gray-500">Last 30 days</span>
      </div>
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className="rounded-xl border bg-gray-50/50 p-4">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${k.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-2xl font-bold">{k.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3">Visits over time</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="visits"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3">Devices</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.devices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label
                      >
                        {stats.devices.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3">Browsers</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.browsers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold mb-3">Top countries / regions</h3>
                <ul className="space-y-2">
                  {stats.countries.map((c, i) => {
                    const pct = stats.total ? Math.round((c.value / stats.total) * 100) : 0;
                    return (
                      <li key={c.name} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-500 text-xs">
                            {c.value} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                  {stats.countries.length === 0 && (
                    <li className="text-xs text-gray-500">No visits yet.</li>
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function PlatformInfo() {
  const info = [
    { label: "Platform", value: "Banyamulenge Community Heritage", icon: Palette },
    { label: "Version", value: "1.0.0", icon: Settings },
    { label: "Security", value: "Managed backend, RLS enforced", icon: Shield },
  ];
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {info.map((i) => {
        const Icon = i.icon;
        return (
          <div key={i.label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide">
              <Icon className="h-4 w-4" /> {i.label}
            </div>
            <div className="mt-1 font-semibold">{i.value}</div>
          </div>
        );
      })}
    </div>
  );
}
