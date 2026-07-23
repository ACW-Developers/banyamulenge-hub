import { useState } from "react";
import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Swahili", flag: "🇰🇪" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

export function LanguageSelector() {
  const [current, setCurrent] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("app.lang") ?? "en" : "en",
  );
  const active = LANGS.find((l) => l.code === current) ?? LANGS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 h-10 px-2.5 rounded-md border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-600 text-sm transition"
          aria-label="Language"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline font-medium">{active.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => {
              setCurrent(l.code);
              try {
                localStorage.setItem("app.lang", l.code);
              } catch { /* ignore */ }
            }}
            className="cursor-pointer flex items-center gap-2"
          >
            <span>{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {current === l.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
