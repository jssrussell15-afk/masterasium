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
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(TEMPLATES_KEY);
  } catch {
    localTemplateRaw = null;
    localTemplateSnapshot = EMPTY_LOCAL_TEMPLATES;
    return EMPTY_LOCAL_TEMPLATES;
  }
  const stored = raw ?? "[]";
  if (stored === localTemplateRaw) return localTemplateSnapshot;
  localTemplateRaw = stored;
  const next = readLocalTemplates();
  localTemplateSnapshot = next.length === 0 ? EMPTY_LOCAL_TEMPLATES : next;
  return localTemplateSnapshot;
}

export function subscribeLocalTemplates(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === TEMPLATES_KEY || event.key === null) onStoreChange();
  };
  try {
    window.addEventListener("storage", onStorage);
  } catch {
    return () => undefined;
  }
  return () => {
    try {
      window.removeEventListener("storage", onStorage);
    } catch {
      // The window may already be gone, or storage access may be blocked.
    }
  };
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
