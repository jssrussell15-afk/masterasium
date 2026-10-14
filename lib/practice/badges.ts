export const BADGE_PIECES = ["helmet", "shield", "boots", "cape"] as const;

export type BadgePieceName = (typeof BADGE_PIECES)[number];

export type BadgePiece = {
  skillId: string;
  skillTitle: string;
  piece: BadgePieceName;
};

/** One piece per confirmed skill, in path order. Pieces cycle when a grade is long. */
export function badgeTree(skills: { id: string; title: string; confirmed: boolean }[]): BadgePiece[] {
  return skills
    .filter((skill) => skill.confirmed)
    .map((skill, index) => ({
      skillId: skill.id,
      skillTitle: skill.title,
      piece: BADGE_PIECES[index % BADGE_PIECES.length],
    }));
}
