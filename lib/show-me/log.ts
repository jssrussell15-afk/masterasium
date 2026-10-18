import { BUGGY_PARENT_LINE, type StyleSnapshot } from "@/lib/show-me/types";

export function buggyParentLine(styles: readonly string[]): string | null {
  return styles.includes("buggy") ? BUGGY_PARENT_LINE : null;
}

export function packShowMeLog(answer: string, steps: string[], snapshot: StyleSnapshot): string {
  return JSON.stringify({
    v: 1,
    answer,
    steps,
    showMe: {
      style: snapshot.style,
      reason: snapshot.reason,
      segment: snapshot.segment,
      accuracy: snapshot.accuracy,
      mastery: snapshot.mastery,
      helps: snapshot.helps,
      evalLevel: snapshot.evalLevel,
      stuck: snapshot.stuck,
      previous: snapshot.previous,
      sets: snapshot.sets,
    },
  });
}

export function readShowMeLog(stored: string): StyleSnapshot | null {
  try {
    const parsed = JSON.parse(stored) as { v?: number; showMe?: Partial<StyleSnapshot> };
    const show = parsed?.v === 1 ? parsed.showMe : undefined;
    if (!show) return null;
    if (show.style !== "guided" && show.style !== "standard" && show.style !== "buggy") return null;
    if (typeof show.reason !== "string") return null;
    return show as StyleSnapshot;
  } catch {
    return null;
  }
}
