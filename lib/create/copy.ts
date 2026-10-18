import type { ProjectType, SessionMeta } from "@/lib/create/session-meta";

/** Parent-facing Create copy. Child strings for the same screens live here too. */
export const childCopy = {
  title: "Make something",
  subtitle: "You decide. The computer helps.",
  minutes: "About 15 minutes",
  keepGoing: "Keep going",
  how: "How this works",
  step: (n: number) => `Step ${n} of 6`,
  back: "Back",
  skip: "Skip this step",
  continue: "Continue",
  showMore: "Show me 3 more",
  showMoreDone: "That's all the new ideas for now",
  literacy: "These were made by a computer. Do any feel boring or the same?",
  boring: "A bit boring",
  same: "Too same",
  different: "They feel different",
  notQuite: "Not quite right?",
  why: "Why this one?",
  writeOwn: "Write my own",
  writeOwnOff: "Writing your own sentence is turned off",
  dictate: "Dictate",
  keep: "Keep",
  tryAgain: "Try again",
  tryAgainDone: "That's the last try",
  fix: "Fix one thing",
  night: "make it night",
  friend: "add a friend",
  match: "Does the picture match the words?",
  yes: "Yes",
  mostly: "Mostly",
  noFix: "No, fix it",
  undo: "Tap again to undo",
  save: "Save to this tablet",
  done: "Done",
  clearAsk: "Clear this project from the tablet?",
  clearYes: "Clear it",
  clearNo: "Keep until tonight",
  nextPage: "Next page",
  prevPage: "Previous page",
  nextFrame: "Next frame",
  play: "Play the flip",
  pageOf: (index: number, total: number, project: ProjectType) => {
    const noun = project === "comic" ? "Panel" : project === "moving" ? "Frame" : "Page";
    return `${noun} ${index} of ${total}`;
  },
} as const;

export const projectCopy: Record<
  ProjectType,
  { title: string; sentence: string; length: string }
> = {
  story: {
    title: "Story",
    sentence: "Tell a short story, one page at a time.",
    length: "4 pages",
  },
  comic: {
    title: "Comic",
    sentence: "Make a comic with three panels.",
    length: "3 panels",
  },
  moving: {
    title: "Moving picture",
    sentence: "Make a short flip animation.",
    length: "Short flip",
  },
};

export const howPanels = [
  {
    title: "You pick",
    body: "The computer offers three ideas. You choose one.",
  },
  {
    title: "You can change it",
    body: "Keep a picture, try again, or fix one thing.",
  },
  {
    title: "You judge it",
    body: "You decide if the picture matches the words. The work stays on this tablet.",
  },
] as const;

export const whyOptions = [
  { id: "liked-look" as const, label: "I like how it looks" },
  { id: "liked-mood" as const, label: "The mood fits" },
  { id: "liked-story" as const, label: "It fits my story" },
];

export const wrongOptions = [
  { id: "computer-wrong-look" as const, label: "The look" },
  { id: "computer-wrong-words" as const, label: "The words" },
  { id: "computer-wrong-both" as const, label: "Both" },
];

export const changedOptions = [
  { id: "changed-colour" as const, label: "The colour" },
  { id: "changed-mood" as const, label: "The mood" },
  { id: "changed-words" as const, label: "The words" },
];

export const parentCopy = {
  cardTitle: "Create",
  empty: "No Create session yet.",
  unavailable: "Create sessions are not on this database yet.",
  settingsTitle: "Create",
  allow: "Allow Create",
  allowHint: "Off until you turn it on. Practice stays the main home tile.",
  writeOwn: "Allow writing their own sentences",
  writeOwnHint: "Off until you turn it on. They can still pick from the three sentences.",
  daily: "Daily project limit",
  dailyHint: "How many Create projects this child can start in a day.",
  samplesOnly:
    "Create can still run with sample pictures on the tablet. Nothing is sent to an image service.",
  consentLink: "Picture-making consent",
  saved: "Create settings saved.",
  waiting: "Create settings will save after the database update.",
  consentTitle: "Picture-making consent",
  consentSent:
    "If you allow picture-making, a fixed recipe and the chips your child picked, such as size, colour, mood, and place, can be sent to an image service. A sentence they write is checked first and is not saved.",
  consentKept:
    "The story and the pictures stay on this tablet. The server keeps a count of the session, without the words or the pictures.",
  consentWithdraw: "You can turn this off whenever you want. New pictures then use the sample set on the tablet.",
  consentAllow: "I allow picture-making",
  consentWithdrawButton: "Turn off picture-making",
  consentOn: "Picture-making is allowed.",
  consentOff: "Picture-making is off. Create uses sample pictures.",
  versionLabel: "Consent version",
} as const;

const PROJECT_LEAD: Record<ProjectType, string> = {
  story: "Made a 4-page story.",
  comic: "Made a 3-panel comic.",
  moving: "Made a short moving picture.",
};

const TAP_PHRASE: Partial<Record<SessionMeta["reflection_taps"][number], string>> = {
  "changed-colour": "changed the character's colour",
  "changed-mood": "changed the mood",
  "changed-size": "changed the size",
  "changed-special": "changed one special thing",
  "changed-night": "made it night",
  "changed-friend": "added a friend",
  "changed-words": "changed the words",
};

export function sessionSentence(row: SessionMeta): string {
  const lead = PROJECT_LEAD[row.project_type];
  const details: string[] = [];
  if (row.retry_count > 0) {
    details.push(row.retry_count === 1 ? "Tried again 1 time" : `Tried again ${row.retry_count} times`);
  }
  const seen = new Set<string>();
  for (const tap of row.reflection_taps) {
    const phrase = TAP_PHRASE[tap];
    if (phrase && !seen.has(phrase)) {
      seen.add(phrase);
      details.push(phrase);
    }
  }
  if (row.used_write_my_own) details.push("wrote a sentence");
  for (const page of row.mismatch_flags) {
    details.push(`said the picture didn't match on page ${page}`);
  }
  if (details.length === 0) return lead;
  const [first, ...rest] = details;
  const head = first.charAt(0).toUpperCase() + first.slice(1);
  return `${lead} ${head}${rest.length ? `, ${rest.join(", ")}` : ""}.`;
}

/**
 * Plain sentences only. No scores.
 * "Usually keeps the first option" when nothing was retried or fixed.
 * "Is starting to say when a picture doesn't match" when a later session
 * flags a mismatch and an earlier one did not.
 */
export function literacyTrend(rows: SessionMeta[]): string {
  if (rows.length === 0) return parentCopy.empty;
  const keepsFirst = rows.every(
    (row) => row.retry_count === 0 && row.fix_count === 0 && row.mismatch_flags.length === 0,
  );
  if (keepsFirst) return "Usually keeps the first option";
  const firstMismatch = rows.findIndex((row) => row.mismatch_flags.length > 0);
  if (firstMismatch > 0) return "Is starting to say when a picture doesn't match";
  if (rows.some((row) => row.mismatch_flags.length > 0) && rows.length >= 2) {
    return "Is starting to say when a picture doesn't match";
  }
  return "Is trying again and changing pictures.";
}
