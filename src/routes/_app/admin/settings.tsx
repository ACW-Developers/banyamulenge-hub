import { createFileRoute } from "@tanstack/react-router";
import { Settings, Shield, Database, Palette, Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/settings")({
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const [signups, setSignups] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [publicFeed, setPublicFeed] = useState(true);

  const notify = (label: string) =>
    toast.success(`${label} preference saved (local only in this build).`);

  const sections = [
    {
      title: "Access",
      icon: Shield,
      items: [
        {
          label: "Allow new sign-ups",
          desc: "When off, only invited users can join the platform.",
          value: signups,
          onChange: (v: boolean) => {
            setSignups(v);
            notify("Sign-ups");
          },
        },
        {
          label: "Public feed",
          desc: "Show posts to unauthenticated visitors on shareable pages.",
          value: publicFeed,
          onChange: (v: boolean) => {
            setPublicFeed(v);
            notify("Public feed");
          },
        },
      ],
    },
    {
      title: "Notifications",
      icon: Mail,
      items: [
        {
          label: "Email notifications",
          desc: "Send transactional emails for follows, mentions, and messages.",
          value: emailNotifs,
          onChange: (v: boolean) => {
            setEmailNotifs(v);
            notify("Email notifications");
          },
        },
      ],
    },
  ];

  const info = [
    { label: "Platform", value: "Banyamulenge Community Heritage", icon: Palette },
    { label: "Version", value: "1.0.0", icon: Settings },
    { label: "Backend", value: "Cloud (managed)", icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform-wide configuration for administrators.
        </p>
      </div>

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

      {sections.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.title} className="rounded-2xl border bg-white shadow-sm">
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="font-bold">{s.title}</h2>
            </div>
            <div className="divide-y">
              {s.items.map((it) => (
                <div key={it.label} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm">{it.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{it.desc}</div>
                  </div>
                  <Switch checked={it.value} onCheckedChange={it.onChange} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
