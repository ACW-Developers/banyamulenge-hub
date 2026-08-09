import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  DollarSign,
  Users,
  TrendingUp,
  Receipt,
  Search,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listDonations } from "@/lib/donations.functions";

export const Route = createFileRoute("/_app/admin/payments")({
  component: PaymentsDashboard,
  head: () => ({
    meta: [
      { title: "Donations & Payments | Banyamulenge Hub Admin" },
      {
        name: "description",
        content: "Admin dashboard for tracking donations, donors and Stripe transaction codes.",
      },
      { property: "og:title", content: "Donations & Payments | Banyamulenge Hub Admin" },
      {
        property: "og:description",
        content: "Track donations, donors and transaction codes in one dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function PaymentsDashboard() {
  const fetchDonations = useServerFn(listDonations);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "donations"],
    queryFn: () => fetchDonations({ data: undefined as never }),
    staleTime: 30_000,
  });

  const rows = useMemo(() => data ?? [], [data]);
  const paid = useMemo(() => rows.filter((r) => r.status === "paid"), [rows]);

  const stats = useMemo(() => {
    const total = paid.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const donors = new Set(paid.map((r) => r.donor_email ?? r.user_id ?? r.id)).size;
    const avg = paid.length ? Math.round(total / paid.length) : 0;
    return { total, donors, avg, count: paid.length, pending: rows.length - paid.length };
  }, [paid, rows]);

  const series = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    paid.forEach((r) => {
      const k = String(r.created_at).slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + (r.amount_cents ?? 0) / 100);
    });
    return Array.from(map, ([date, amount]) => ({
      date: date.slice(5),
      amount: Number(amount.toFixed(2)),
    }));
  }, [paid]);

  const buckets = useMemo(() => {
    const defs = [
      { label: "< $10", test: (v: number) => v < 1000 },
      { label: "$10–24", test: (v: number) => v >= 1000 && v < 2500 },
      { label: "$25–49", test: (v: number) => v >= 2500 && v < 5000 },
      { label: "$50–99", test: (v: number) => v >= 5000 && v < 10000 },
      { label: "$100–199", test: (v: number) => v >= 10000 && v < 20000 },
      { label: "$200+", test: (v: number) => v >= 20000 },
    ];
    return defs.map((d) => ({
      label: d.label,
      count: paid.filter((r) => d.test(r.amount_cents ?? 0)).length,
    }));
  }, [paid]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.donor_name, r.donor_email, r.stripe_session_id, r.stripe_payment_intent_id, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [rows, q]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "Total raised", value: money(stats.total), icon: DollarSign, tint: "from-emerald-500 to-emerald-600" },
    { label: "Donations", value: String(stats.count), icon: Receipt, tint: "from-blue-500 to-blue-600" },
    { label: "Unique donors", value: String(stats.donors), icon: Users, tint: "from-violet-500 to-violet-600" },
    { label: "Average gift", value: money(stats.avg), icon: TrendingUp, tint: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground text-sm">
          Donations received through Stripe, with donors and transaction codes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="overflow-hidden border-none shadow-sm ring-1 ring-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-xl bg-gradient-to-br ${c.tint} text-white flex items-center justify-center shadow`}
              >
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                  {c.label}
                </p>
                <p className="text-2xl font-bold tabular-nums truncate">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="don" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip formatter={(v: number) => [`$${v}`, "Raised"]} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#don)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gift sizes</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">
            Transactions{" "}
            <span className="text-muted-foreground font-normal">({filtered.length})</span>
          </CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search donor, email or code"
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Donor</th>
                  <th className="text-left font-semibold px-4 py-3">Email</th>
                  <th className="text-right font-semibold px-4 py-3">Amount</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-left font-semibold px-4 py-3">Transaction code</th>
                  <th className="text-left font-semibold px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No donations recorded yet.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.donor_name || "Anonymous"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.donor_email || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {money(r.amount_cents ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "paid" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" /> {r.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {r.stripe_payment_intent_id || r.stripe_session_id || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {stats.pending > 0 && (
        <p className="text-xs text-muted-foreground">
          {stats.pending} incomplete checkout{stats.pending > 1 ? "s" : ""} are excluded from totals.
        </p>
      )}
    </div>
  );
}
