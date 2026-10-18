import type { Difficulty } from "@/lib/content/model";

export type SkillSlug = "g3-add-sub" | "g3-place" | "g3-mult" | "g3-fractions";
export type PhaseKind = "open" | "bar" | "estimate" | "explain" | "mistake" | "logic";

export type Band = { min: number; max: number; floor: number };

export type Built = {
  prompt: string;
  answer: string;
  slots: Record<string, string | number>;
  choices?: string[];
  steps?: string[];
  lines?: string[];
  wrongLine?: number;
  fix?: string;
  rule: string;
  bandValues: number[];
  openEnded: boolean;
};

export type TemplateDef = {
  id: string;
  skillSlug: SkillSlug;
  skillLabel: string;
  topic: string;
  kind: PhaseKind;
  spread: string;
  attention: string | null;
  band: (difficulty: Difficulty) => Band;
  fill: (difficulty: Difficulty, rng: () => number) => Built;
};

export type ReviewNote = {
  id: string;
  skill: string;
  topic: string;
  kind: string;
  difficulty: Difficulty | null;
  reason: string;
};
