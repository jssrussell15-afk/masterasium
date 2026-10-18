import type { ParentProgress } from "@/lib/lesson/parent";

export type SundayDigest = {
  subject: string;
  childName: string;
  learned: string[];
  ask: string[];
  comingUp: string[];
  settingsHref: string;
  weeklyTitle?: string;
  weeklyHref?: string;
};

export function buildSundayDigest(childName: string, progress: ParentProgress): SundayDigest {
  const learned =
    progress.learned.length > 0
      ? progress.learned.map((skill) => `${skill.title}. ${skill.sentence}`)
      : ["No new skill was finished this week."];
  const ask: string[] = [];
  if (progress.ask.solved) {
    ask.push(`They solved: ${progress.ask.solved.prompt} The answer was ${progress.ask.solved.answer}.`);
  }
  if (progress.ask.repaired) {
    ask.push(
      `They fixed this after a miss: ${progress.ask.repaired.prompt} The answer was ${progress.ask.repaired.answer}.`,
    );
  }
  if (ask.length === 0) ask.push("Nothing to ask about yet. A solved problem will show up after practice.");
  const comingUp =
    progress.upcoming.length > 0
      ? progress.upcoming.map((review) => `${review.title} — ${review.when}.`)
      : ["No review is on the calendar yet."];
  return {
    subject: `${childName}'s math week`,
    childName,
    learned,
    ask,
    comingUp,
    settingsHref: "/settings",
  };
}

export function renderSundayDigestText(digest: SundayDigest): string {
  const lines = [
    digest.subject,
    "",
    "What they learned",
    ...digest.learned,
    "",
    "Ask them about",
    ...digest.ask,
    "",
    "Coming up next",
    ...digest.comingUp,
  ];
  if (digest.weeklyTitle && digest.weeklyHref) {
    lines.push("", "This week's puzzle", digest.weeklyTitle, digest.weeklyHref);
  }
  lines.push("", `Change what this note includes: ${digest.settingsHref}`);
  return lines.join("\n");
}

/**
 * TODO: hand `digest` to the email provider.
 * The preview route must not call this. Nothing is sent from here.
 */
export function sendSundayDigest(_digest: SundayDigest): void {
  return;
}
