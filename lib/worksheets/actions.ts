"use server";

import { ensureProfile, requireUser } from "@/lib/auth/session";
import { friendlyDbError } from "@/lib/db-error";
import { skillById } from "@/lib/practice/skills";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { questionsFromSkill, questionsFromUpload } from "@/lib/worksheets/build";
import { makeAccessCode, normalizeAccessCode } from "@/lib/worksheets/code";
import type {
  Difficulty,
  LayoutTemplate,
  PracticeItem,
  PracticeSet,
  WorksheetHeader,
} from "@/lib/worksheets/types";

type TemplateRow = {
  id: string;
  name: string;
  title: string;
  instructions: string;
  show_name: boolean;
  show_date: boolean;
  show_grade: boolean;
  show_score: boolean;
  logo_data: string | null;
};

function asHeader(row: TemplateRow): WorksheetHeader {
  return {
    showName: row.show_name,
    showDate: row.show_date,
    showGrade: row.show_grade,
    showScore: row.show_score,
  };
}

function isDifficulty(value: string): value is Difficulty {
  return value === "easy" || value === "steady" || value === "harder";
}

function cleanItems(value: unknown): PracticeItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) return null;
  const items: PracticeItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Partial<PracticeItem>;
    if (typeof item.prompt !== "string" || typeof item.answer !== "string" || !Array.isArray(item.steps)) {
      return null;
    }
    const example = item.example;
    const worked =
      example &&
      typeof example === "object" &&
      typeof example.prompt === "string" &&
      typeof example.answer === "string" &&
      Array.isArray(example.steps)
        ? {
            prompt: example.prompt,
            answer: example.answer,
            steps: example.steps.filter((step): step is string => typeof step === "string"),
          }
        : null;
    items.push({
      prompt: item.prompt,
      answer: item.answer,
      steps: item.steps.filter((step): step is string => typeof step === "string"),
      skillId: typeof item.skillId === "string" ? item.skillId : null,
      example: worked,
    });
  }
  return items;
}

export async function listTemplates(): Promise<{ templates: LayoutTemplate[]; error: string | null }> {
  const { supabase, user } = await requireUser();
  await ensureProfile(supabase, user.id);
  const { data, error } = await supabase
    .from("worksheet_templates")
    .select("id, name, title, instructions, show_name, show_date, show_grade, show_score, logo_data")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return { templates: [], error: friendlyDbError(error) };
  const rows = (data ?? []) as TemplateRow[];
  return {
    templates: rows.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      instructions: row.instructions,
      header: asHeader(row),
      logoData: row.logo_data,
    })),
    error: null,
  };
}

export async function saveTemplate(input: {
  name: string;
  title: string;
  instructions: string;
  header: WorksheetHeader;
  logoData: string | null;
}): Promise<{ template: LayoutTemplate | null; error: string | null }> {
  const name = input.name.trim();
  if (!name || name.length > 80) return { template: null, error: "Name the layout, up to 80 letters." };
  if ((input.logoData?.length ?? 0) > 150_000) {
    return { template: null, error: "That logo is too large. Use a smaller image." };
  }
  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) return { template: null, error: friendlyDbError(profileError) };

  const { data, error } = await supabase
    .from("worksheet_templates")
    .insert({
      owner_id: user.id,
      name,
      title: input.title.slice(0, 120),
      instructions: input.instructions.slice(0, 600),
      show_name: input.header.showName,
      show_date: input.header.showDate,
      show_grade: input.header.showGrade,
      show_score: input.header.showScore,
      logo_data: input.logoData,
    })
    .select("id, name, title, instructions, show_name, show_date, show_grade, show_score, logo_data")
    .single();
  if (error || !data) return { template: null, error: friendlyDbError(error ?? { message: "Could not save the layout." }) };
  const row = data as TemplateRow;
  return {
    template: {
      id: row.id,
      name: row.name,
      title: row.title,
      instructions: row.instructions,
      header: asHeader(row),
      logoData: row.logo_data,
    },
    error: null,
  };
}

export async function buildWorksheetQuestions(input: {
  path: "upload" | "topic";
  text: string;
  skillId: string | null;
  difficulty: string;
  count: number;
}): Promise<{ items: PracticeItem[]; note: string | null; error: string | null }> {
  await requireUser();
  if (!isDifficulty(input.difficulty)) return { items: [], note: null, error: "Choose a difficulty." };
  const count = Math.min(12, Math.max(4, Math.round(input.count) || 8));
  const skill = input.skillId ? skillById(input.skillId) : undefined;
  if (input.path === "topic") {
    if (!skill) return { items: [], note: null, error: "Choose a topic." };
    return { items: questionsFromSkill(skill.id, input.difficulty, count), note: null, error: null };
  }
  const built = questionsFromUpload(input.text, input.difficulty, count, skill?.id ?? null);
  if (built.items.length === 0) {
    return {
      items: [],
      note: null,
      error: "No questions could be made from that file. Upload a .txt worksheet with equations, or choose a topic as a backup.",
    };
  }
  return { items: built.items, note: built.note, error: null };
}

export async function saveWorksheet(input: {
  code: string;
  title: string;
  instructions: string;
  subtitle: string | null;
  logoData: string | null;
  items: PracticeItem[];
}): Promise<{ set: PracticeSet | null; error: string | null }> {
  const items = cleanItems(input.items);
  const title = input.title.trim().slice(0, 120);
  if (!title) return { set: null, error: "Add a title." };
  if (!items) return { set: null, error: "Add between 4 and 12 questions." };
  if ((input.logoData?.length ?? 0) > 150_000) {
    return { set: null, error: "That logo is too large. Use a smaller image." };
  }
  const code = normalizeAccessCode(input.code);
  if (code.length < 4) return { set: null, error: "The access code was not valid." };

  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) return { set: null, error: friendlyDbError(profileError) };

  let nextCode = code;
  let saved = false;
  let lastError: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < 4 && !saved; attempt += 1) {
    const { error } = await supabase.from("worksheets").insert({
      owner_id: user.id,
      access_code: nextCode,
      title,
      instructions: input.instructions.slice(0, 600),
      subtitle: input.subtitle?.slice(0, 120) ?? null,
      logo_data: input.logoData,
      items,
    });
    if (!error) {
      saved = true;
      break;
    }
    lastError = error;
    if (error.code !== "23505") break;
    nextCode = makeAccessCode();
  }
  if (!saved) return { set: null, error: friendlyDbError(lastError ?? { message: "Could not save the practice set." }) };

  return {
    set: {
      code: nextCode,
      title,
      instructions: input.instructions.slice(0, 600),
      subtitle: input.subtitle,
      logoData: input.logoData,
      items,
    },
    error: null,
  };
}

export async function openPracticeSet(code: string): Promise<PracticeSet | null> {
  const normalized = normalizeAccessCode(code);
  if (normalized.length < 4 || !isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_practice_set", { access_code: normalized });
  if (error || !data || typeof data !== "object") return null;
  const row = data as Partial<PracticeSet>;
  const items = cleanItems(row.items);
  if (!items || typeof row.title !== "string" || typeof row.code !== "string") return null;
  return {
    code: row.code,
    title: row.title,
    instructions: typeof row.instructions === "string" ? row.instructions : "",
    subtitle: typeof row.subtitle === "string" ? row.subtitle : null,
    logoData: typeof row.logoData === "string" ? row.logoData : null,
    items,
  };
}

