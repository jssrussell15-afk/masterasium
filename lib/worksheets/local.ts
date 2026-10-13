import { normalizeAccessCode } from "@/lib/worksheets/code";
import type { LayoutTemplate, PracticeSet } from "@/lib/worksheets/types";

const TEMPLATES_KEY = "masterasium-worksheet-templates";
const SET_PREFIX = "masterasium-practice-set:";

export function readLocalTemplates(): LayoutTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TEMPLATES_KEY) ?? "[]") as LayoutTemplate[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === "string") : [];
  } catch {
    return [];
  }
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
