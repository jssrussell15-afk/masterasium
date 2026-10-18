import { z } from "zod";
import { SPARK_BANK } from "@/lib/create/samples";
import { COLOURS, FIXES, MOODS, PROJECTS, SIZES, SPECIALS } from "@/lib/create/types";

const PLACES = ["meadow", "harbour", "kitchen"] as const;
const NAMES = ["pip", "moss", "lumen"] as const;

const SENTENCE_IDS = (["story", "comic", "moving"] as const).flatMap((project) => {
  const pages = project === "comic" ? 3 : 4;
  return Array.from({ length: pages }, (_, page) =>
    [0, 1, 2].map((line) => `${project}-${page + 1}-${line}`),
  ).flat();
});

export const CHOICE_IDS = [...SPARK_BANK, ...NAMES, ...PLACES, ...SENTENCE_IDS] as [string, ...string[]];

export const MAX_JSON_BYTES = 2048;

const chipSchema = z
  .object({
    size: z.enum(SIZES).optional(),
    colour: z.enum(COLOURS).optional(),
    mood: z.enum(MOODS).optional(),
    special: z.enum(SPECIALS).optional(),
    fix: z.enum(FIXES).optional(),
    place: z.enum(PLACES).optional(),
    subject: z.enum(SPARK_BANK).optional(),
  })
  .strict();

/**
 * The only body the generate route accepts.
 * Prompt text, system text, and file fields are rejected because the object is strict.
 */
export const generateBodySchema = z
  .object({
    childId: z.string().trim().min(1).max(80),
    projectType: z.enum(PROJECTS),
    kind: z.enum(["spark", "character", "setting", "page"]),
    cardId: z.enum(CHOICE_IDS),
    chips: chipSchema,
    pageIndex: z.number().int().min(1).max(4).optional(),
    refresh: z.number().int().min(0).max(3).optional(),
    writeMyOwn: z.string().max(60).optional(),
  })
  .strict();

export type GenerateBody = z.infer<typeof generateBodySchema>;

export function parseGenerateBody(input: unknown): { ok: true; data: GenerateBody } | { ok: false } {
  const parsed = generateBodySchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  return { ok: true, data: parsed.data };
}

export function inspectTransport(input: {
  contentType: string | null;
  byteLength: number;
}): { ok: true } | { ok: false; status: 413 | 415; error: "upload" | "too-large" } {
  const type = (input.contentType ?? "").toLowerCase();
  if (type.includes("multipart/") || type.includes("application/octet-stream")) {
    return { ok: false, status: 415, error: "upload" };
  }
  if (!type.includes("application/json")) return { ok: false, status: 415, error: "upload" };
  if (input.byteLength > MAX_JSON_BYTES) return { ok: false, status: 413, error: "too-large" };
  return { ok: true };
}

export function choiceAllowed(id: string): boolean {
  return (CHOICE_IDS as readonly string[]).includes(id);
}
