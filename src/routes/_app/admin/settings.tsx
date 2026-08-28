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

type Slice = { name: string; value: number };
type TrafficStats = {
  total: number;
  total_all_time: number;
  unique_visitors: number;
  today: number;
  devices: Slice[];
  browsers: Slice[];
  os: Slice[];
  countries: Slice[];
  pages: Slice[];
  timeline: { day: string; visits: number }[];
};

const EMPTY_STATS: TrafficStats = {
  total: 0,
  total_all_time: 0,
  unique_visitors: 0,
  today: 0,
  devices: [],
  browsers: [],
  os: [],
  countries: [],
  pages: [],
  timeline: [],
};

function TrafficSection() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-traffic", days],
    // Analytics must always be current: no stale cache, refresh in the background.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async (): Promise<TrafficStats> => {
      const { data, error } = await supabase.rpc("admin_traffic_stats", { days });
      if (error) throw error;
      return { ...EMPTY_STATS, ...(data as unknown as TrafficStats) };
    },
  });

  const stats = useMemo(() => {
    const s = data ?? EMPTY_STATS;
    return {
      ...s,
      timeline: (s.timeline ?? []).map((r) => ({
        day: format(new Date(`${r.day}T00:00:00`), "MMM d"),
        visits: r.visits,
      })),
    };
  }, [data]);

  const kpis = [
    {
      label: `Total visits (${days}d)`,
      value: stats.total,
      icon: BarChart3,
      accent: "text-primary bg-primary/10",
    },
    {
      label: "Visits today",
      value: stats.today,
      icon: Activity,
      accent: "text-amber-600 bg-amber-100",
    },
    {
      label: "Signed-in visitors",
      value: stats.unique_visitors,
      icon: Users,
      accent: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "All-time visits",
      value: stats.total_all_time,
      icon: Globe,
      accent: "text-violet-600 bg-violet-100",
    },
  ];

  const deviceKpis = [
    {
      label: "Desktop",
      value: stats.devices.find((d) => d.name === "Desktop")?.value ?? 0,
      icon: Monitor,
    },
    {
      label: "Mobile",
      value: stats.devices.find((d) => d.name === "Mobile")?.value ?? 0,
      icon: Smartphone,
    },
  ];

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="px-6 py-4 border-b flex flex-wrap items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Traffic &amp; analytics</h2>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-600"
          >
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {error ? (
          <p className="text-sm text-red-600">
            Could not load analytics: {(error as Error).message}
          </p>
        ) : isLoading ? (
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
                    <div className="mt-3 text-2xl font-bold">{k.value.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {deviceKpis.map((d) => {
                const Icon = d.icon;
                const pct = stats.total ? Math.round((d.value / stats.total) * 100) : 0;
                return (
                  <div
                    key={d.label}
                    className="rounded-xl border p-4 flex items-center gap-3 bg-white"
                  >
                    <Icon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-lg font-bold">{d.value.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        {d.label} · {pct}%
                      </div>
                    </div>
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
