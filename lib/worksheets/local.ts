import { normalizeAccessCode } from "@/lib/worksheets/code";
import type { LayoutTemplate, PracticeSet } from "@/lib/worksheets/types";

const TEMPLATES_KEY = "masterasium-worksheet-templates";
const SET_PREFIX = "masterasium-practice-set:";

const EMPTY_LOCAL_TEMPLATES: LayoutTemplate[] = [];
let localTemplateRaw: string | null = null;
let localTemplateSnapshot: LayoutTemplate[] = EMPTY_LOCAL_TEMPLATES;

export function readLocalTemplates(): LayoutTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TEMPLATES_KEY) ?? "[]") as LayoutTemplate[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === "string") : [];
  } catch {
    return [];
  }
}

/** Server render stays on the templates passed into the page. */
export function getLocalTemplateServerSnapshot(): LayoutTemplate[] {
  return EMPTY_LOCAL_TEMPLATES;
}

/** Cached so useSyncExternalStore sees the same array until localStorage changes. */
export function getLocalTemplateSnapshot(): LayoutTemplate[] {
  if (typeof window === "undefined") return EMPTY_LOCAL_TEMPLATES;
  const raw = window.localStorage.getItem(TEMPLATES_KEY) ?? "[]";
  if (raw === localTemplateRaw) return localTemplateSnapshot;
  localTemplateRaw = raw;
  const next = readLocalTemplates();
  localTemplateSnapshot = next.length === 0 ? EMPTY_LOCAL_TEMPLATES : next;
  return localTemplateSnapshot;
}

export function subscribeLocalTemplates(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === TEMPLATES_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function writeLocalTemplate(template: LayoutTemplate): void {
  const existing = readLocalTemplates().filter((item) => item.id !== template.id);
  window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify([template, ...existing].slice(0, 20)));
}

export function readLocalSet(code: string): PracticeSet | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SET_PREFIX + normalizeAccessCode(code)) ?? "null",
    ) as PracticeSet | null;
    if (!parsed || !Array.isArray(parsed.items) || typeof parsed.title !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalSet(set: PracticeSet): void {
  window.localStorage.setItem(SET_PREFIX + normalizeAccessCode(set.code), JSON.stringify(set));
}
