import { createGradeOk } from "@/lib/create/types";

/** Child routes and the tile both use this. Off or outside Grades 3–6 is a 404. */
export function createAccessDecision(input: { enabled: boolean; grade: number }): "allow" | "not-found" {
  if (!input.enabled || !createGradeOk(input.grade)) return "not-found";
  return "allow";
}

/** Create settings and consent belong to the parent login, not the child PIN session. */
export function parentHolderDecision(input: {
  hasStudentCookie: boolean;
  hasParentUser: boolean;
}): "allow" | "refuse" {
  if (input.hasStudentCookie || !input.hasParentUser) return "refuse";
  return "allow";
}
