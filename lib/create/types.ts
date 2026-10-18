export const PROJECTS = ["story", "comic", "moving"] as const;
export type ProjectType = (typeof PROJECTS)[number];

export const STEPS = ["pick", "spark", "character", "setting", "pages", "finish"] as const;
export type CreateStep = (typeof STEPS)[number];

export const REFLECTION_TAPS = [
  "boring",
  "same",
  "different",
  "liked-look",
  "liked-mood",
  "liked-story",
  "computer-wrong-look",
  "computer-wrong-words",
  "computer-wrong-both",
  "changed-colour",
  "changed-mood",
  "changed-size",
  "changed-special",
  "changed-night",
  "changed-friend",
  "changed-words",
] as const;
export type ReflectionTap = (typeof REFLECTION_TAPS)[number];

export const SIZES = ["small", "medium", "big"] as const;
export const COLOURS = ["blue", "green", "amber"] as const;
export const MOODS = ["calm", "brave", "sleepy"] as const;
export const SPECIALS = ["scarf", "hat", "star"] as const;
export const FIXES = ["night", "friend"] as const;

export type SizeChip = (typeof SIZES)[number];
export type ColourChip = (typeof COLOURS)[number];
export type MoodChip = (typeof MOODS)[number];
export type SpecialChip = (typeof SPECIALS)[number];
export type FixChip = (typeof FIXES)[number];

export type ChipBag = {
  size: SizeChip;
  colour: ColourChip;
  mood: MoodChip;
  special: SpecialChip;
};

export const DEFAULT_CHIPS: ChipBag = {
  size: "medium",
  colour: "blue",
  mood: "calm",
  special: "scarf",
};

export type MatchMark = "yes" | "mostly" | "no";

/** Device-only page work. `own` never leaves the tablet. */
export type PageWork = {
  sentenceId: string | null;
  own: string | null;
  variant: number;
  fixes: FixChip[];
  kept: boolean;
  match: MatchMark | null;
  reported?: boolean;
};

export type CreateDraft = {
  childId: string;
  project: ProjectType | null;
  step: CreateStep;
  day: string;
  startedAt: string;
  sparkId: string | null;
  sparkRefresh: number;
  sparkTap: ReflectionTap | null;
  characterId: string | null;
  characterChips: ChipBag;
  characterRegen: number;
  characterWhy: ReflectionTap | null;
  settingId: string | null;
  settingChips: ChipBag;
  settingRegen: number;
  settingWhy: ReflectionTap | null;
  pageIndex: number;
  pages: PageWork[];
  finishTaps: ReflectionTap[];
  keepCount: number;
  retryCount: number;
  fixCount: number;
  generations: number;
  moderationBlocks: number;
  reportCount: number;
  updatedAt: string;
};

export type CreateFlags = {
  enabled: boolean;
  writeOwn: boolean;
  dailyLimit: number;
  consentAt: string | null;
  consentVersion: string | null;
  projectsToday: number;
  moderationBlocksToday: number;
};

export const DEFAULT_CREATE_FLAGS: CreateFlags = {
  enabled: false,
  writeOwn: false,
  dailyLimit: 1,
  consentAt: null,
  consentVersion: null,
  projectsToday: 0,
  moderationBlocksToday: 0,
};

export const IMAGE_CONSENT_VERSION = "2026-10-18";
export const HARD_GENERATIONS_PER_PROJECT = 18;
export const MAX_SPARK_REFRESH = 3;
export const MAX_PAGE_RETRY = 2;

export function isProject(value: string): value is ProjectType {
  return (PROJECTS as readonly string[]).includes(value);
}

export function isStep(value: string): value is CreateStep {
  return (STEPS as readonly string[]).includes(value);
}

export function createGradeOk(grade: number): boolean {
  return grade >= 3 && grade <= 6;
}

export function stepNumber(step: CreateStep): number {
  return STEPS.indexOf(step) + 1;
}

export function canSkip(step: CreateStep): boolean {
  return step !== "pick" && step !== "finish";
}

export function nextStep(step: CreateStep): CreateStep | null {
  const index = STEPS.indexOf(step);
  return index >= 0 && index < STEPS.length - 1 ? STEPS[index + 1] : null;
}

export function prevStep(step: CreateStep): CreateStep | null {
  const index = STEPS.indexOf(step);
  return index > 0 ? STEPS[index - 1] : null;
}

export function pageCount(project: ProjectType): number {
  if (project === "comic") return 3;
  return 4;
}

export function emptyPage(): PageWork {
  return { sentenceId: null, own: null, variant: 0, fixes: [], kept: false, match: null };
}

export function emptyDraft(childId: string, day: string, now = new Date().toISOString()): CreateDraft {
  return {
    childId,
    project: null,
    step: "pick",
    day,
    startedAt: now,
    sparkId: null,
    sparkRefresh: 0,
    sparkTap: null,
    characterId: null,
    characterChips: { ...DEFAULT_CHIPS },
    characterRegen: 0,
    characterWhy: null,
    settingId: null,
    settingChips: { ...DEFAULT_CHIPS, colour: "green" },
    settingRegen: 0,
    settingWhy: null,
    pageIndex: 0,
    pages: [],
    finishTaps: [],
    keepCount: 0,
    retryCount: 0,
    fixCount: 0,
    generations: 0,
    moderationBlocks: 0,
    reportCount: 0,
    updatedAt: now,
  };
}

export function projectPages(project: ProjectType, draft: CreateDraft): PageWork[] {
  const count = pageCount(project);
  const pages = draft.pages.slice(0, count);
  while (pages.length < count) pages.push(emptyPage());
  return pages;
}
