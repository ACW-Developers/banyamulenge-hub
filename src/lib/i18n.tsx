import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DICTS } from "./i18n-dicts";
import type { Lang } from "./i18n-dicts/types";

export type { Lang };

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Swahili", flag: "🇰🇪" },
  { code: "rw", label: "Kinyamulenge", flag: "🇨🇩" },
];

const STORAGE_KEY = "app.lang";

type I18nValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a key; falls back to English, then to the key itself. */
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start at "en" so the server render and first client render match.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && stored in DICTS) setLangState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => DICTS[lang][key] ?? DICTS.en[key] ?? fallback ?? key,
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx)
    return {
      lang: "en",
      setLang: () => {},
      t: (k: string, fallback?: string) => DICTS.en[k] ?? fallback ?? k,
    };
  return ctx;
}
