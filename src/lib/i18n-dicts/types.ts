export type Lang = "en" | "sw" | "rw";

export type Dict = Record<string, string>;

/** Every module ships its own translations for the three supported languages. */
export type ModuleDict = Record<Lang, Dict>;
