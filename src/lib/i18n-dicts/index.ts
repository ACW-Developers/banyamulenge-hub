import type { Dict, Lang, ModuleDict } from "./types";
import { common } from "./common";
import { home } from "./home";
import { community } from "./community";
import { messages } from "./messages";
import { explore } from "./explore";
import { directory } from "./directory";
import { marketplace } from "./marketplace";
import { museum } from "./museum";
import { heritage } from "./heritage";
import { familyTree } from "./family-tree";
import { profile } from "./profile";
import { admin } from "./admin";

const MODULES: ModuleDict[] = [
  common,
  home,
  community,
  messages,
  explore,
  directory,
  marketplace,
  museum,
  heritage,
  familyTree,
  profile,
  admin,
];

function merge(lang: Lang): Dict {
  return MODULES.reduce<Dict>((acc, m) => Object.assign(acc, m[lang] ?? {}), {});
}

export const DICTS: Record<Lang, Dict> = {
  en: merge("en"),
  sw: merge("sw"),
  rw: merge("rw"),
};

export type { Dict, Lang, ModuleDict };
