import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "sw" | "rw";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Swahili", flag: "🇰🇪" },
  { code: "rw", label: "Kinyamulenge", flag: "🇨🇩" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "nav.main": "Main",
  "nav.administration": "Administration",
  "nav.home": "Home",
  "nav.explore": "Explore",
  "nav.community": "Community",
  "nav.marketplace": "Marketplace",
  "nav.directory": "Directory",
  "nav.messages": "Messages",
  "nav.heritage": "Our Heritage",
  "nav.museum": "Virtual Museum",
  "nav.familyTree": "Family Tree",
  "nav.profile": "Profile",
  "nav.admin": "Admin",
  "nav.users": "User Management",
  "nav.logs": "Activity Logs",
  "nav.payments": "Payments",
  "nav.settings": "Settings",
  "nav.signOut": "Sign out",
  "nav.search": "Search...",
  "nav.language": "Language",
  "nav.notifications": "Notifications",
  "nav.refresh": "Clear cache & refresh",
  "nav.administrator": "Administrator",
  "nav.member": "Member",
  "title.community": "Community",
  "title.communitySub":
    "Share your stories, celebrate our heritage, and interact with fellow Banyamulenge across the globe.",
  "feed.empty": "The feed is quiet",
  "feed.emptySub": "Be the first to share something with the community.",
};

const sw: Dict = {
  "nav.main": "Kuu",
  "nav.administration": "Utawala",
  "nav.home": "Nyumbani",
  "nav.explore": "Gundua",
  "nav.community": "Jumuiya",
  "nav.marketplace": "Soko",
  "nav.directory": "Orodha",
  "nav.messages": "Ujumbe",
  "nav.heritage": "Urithi Wetu",
  "nav.museum": "Jumba la Makumbusho",
  "nav.familyTree": "Mti wa Familia",
  "nav.profile": "Wasifu",
  "nav.admin": "Msimamizi",
  "nav.users": "Usimamizi wa Watumiaji",
  "nav.logs": "Kumbukumbu za Shughuli",
  "nav.payments": "Malipo",
  "nav.settings": "Mipangilio",
  "nav.signOut": "Ondoka",
  "nav.search": "Tafuta...",
  "nav.language": "Lugha",
  "nav.notifications": "Arifa",
  "nav.refresh": "Futa akiba na upakie upya",
  "nav.administrator": "Msimamizi",
  "nav.member": "Mwanachama",
  "title.community": "Jumuiya",
  "title.communitySub":
    "Shiriki hadithi zako, sherehekea urithi wetu, na wasiliana na Banyamulenge duniani kote.",
  "feed.empty": "Hakuna machapisho bado",
  "feed.emptySub": "Kuwa wa kwanza kushiriki jambo na jumuiya.",
};

const rw: Dict = {
  "nav.main": "Ibanze",
  "nav.administration": "Ubuyobozi",
  "nav.home": "Ahabanza",
  "nav.explore": "Shakisha",
  "nav.community": "Umuryango",
  "nav.marketplace": "Isoko",
  "nav.directory": "Urutonde",
  "nav.messages": "Ubutumwa",
  "nav.heritage": "Umurage Wacu",
  "nav.museum": "Inzu Ndangamurage",
  "nav.familyTree": "Igiti cy'Umuryango",
  "nav.profile": "Umwirondoro",
  "nav.admin": "Umuyobozi",
  "nav.users": "Gucunga Abakoresha",
  "nav.logs": "Ibyakozwe",
  "nav.payments": "Ubwishyu",
  "nav.settings": "Igenamiterere",
  "nav.signOut": "Sohoka",
  "nav.search": "Shakisha...",
  "nav.language": "Ururimi",
  "nav.notifications": "Amatangazo",
  "nav.refresh": "Siba ubwiherero hanyuma wongere ufungure",
  "nav.administrator": "Umuyobozi",
  "nav.member": "Umunyamuryango",
  "title.community": "Umuryango",
  "title.communitySub":
    "Sangiza inkuru zawe, wubahirize umurage wacu, kandi uvugane na Banyamulenge bo hirya no hino ku isi.",
  "feed.empty": "Nta byanditswe birahaba",
  "feed.emptySub": "Ba uwa mbere gusangiza umuryango ikintu.",
};

const DICTS: Record<Lang, Dict> = { en, sw, rw };

const STORAGE_KEY = "app.lang";

type I18nValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
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

  const t = useCallback((key: string) => DICTS[lang][key] ?? en[key] ?? key, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) return { lang: "en", setLang: () => {}, t: (k: string) => en[k] ?? k };
  return ctx;
}
