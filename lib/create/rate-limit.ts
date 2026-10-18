import { createHash } from "node:crypto";

export const MAX_PROJECTS_PER_DAY = 3;
export const DEFAULT_PROJECTS_PER_DAY = 1;
export const MAX_GENERATIONS_PER_PROJECT = 18;
export const MAX_MODERATION_BLOCKS_PER_DAY = 6;
/** Two children on an account, three projects each. */
export const MAX_PARENT_PROJECTS_PER_DAY = 6;
/** Shared-network ceiling. A school NAT may need a higher number. */
export const MAX_IP_GENERATIONS_PER_DAY = 36;

export type RateState = {
  projectsToday: number;
  dailyProjectLimit: number;
  generationsThisProject: number;
  moderationBlocksToday: number;
  parentProjectsToday: number;
  ipGenerationsToday: number;
};

export type RateBlock =
  | "daily-limit"
  | "project-cap"
  | "moderation-pause"
  | "parent-ceiling"
  | "ip-ceiling";

export function projectLimit(value: number): number {
  if (value === 2 || value === 3) return value;
  return DEFAULT_PROJECTS_PER_DAY;
}

/**
 * Pure form of the Supabase `reserve_create_generation` check.
 * A blocked moderation attempt still consumes a generation and a moderation block.
 */
export function assessRateLimit(state: RateState, startingProject = false): { ok: true } | { ok: false; error: RateBlock } {
  if (state.moderationBlocksToday >= MAX_MODERATION_BLOCKS_PER_DAY) {
    return { ok: false, error: "moderation-pause" };
  }
  if (state.parentProjectsToday >= MAX_PARENT_PROJECTS_PER_DAY && startingProject) {
    return { ok: false, error: "parent-ceiling" };
  }
  if (state.projectsToday >= projectLimit(state.dailyProjectLimit) && startingProject) {
    return { ok: false, error: "daily-limit" };
  }
  if (state.ipGenerationsToday >= MAX_IP_GENERATIONS_PER_DAY) {
    return { ok: false, error: "ip-ceiling" };
  }
  if (state.generationsThisProject >= MAX_GENERATIONS_PER_PROJECT) {
    return { ok: false, error: "project-cap" };
  }
  return { ok: true };
}

const prototypeBuckets = new Map<string, RateState>();

/** Process-local stand-in until `reserve_create_generation` is applied. */
export function readPrototypeRate(childId: string, dailyProjectLimit: number): RateState {
  return (
    prototypeBuckets.get(childId) ?? {
      projectsToday: 0,
      dailyProjectLimit,
      generationsThisProject: 0,
      moderationBlocksToday: 0,
      parentProjectsToday: 0,
      ipGenerationsToday: 0,
    }
  );
}

export function rememberPrototypeRate(childId: string, state: RateState): void {
  prototypeBuckets.set(childId, state);
}

/** One-way hash. The raw IP is not returned and is not stored. */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
