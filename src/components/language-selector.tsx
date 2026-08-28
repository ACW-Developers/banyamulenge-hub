import { Languages, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, useI18n } from "@/lib/i18n";

export function LanguageSelector() {
  const { lang, setLang, t } = useI18n();
  const active = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 h-10 px-2.5 rounded-md border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-600 text-sm transition"
          aria-label={t("nav.language")}
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline font-medium">{active.flag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("nav.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className="cursor-pointer flex items-center gap-2"
          >
            <span>{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {lang === l.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
