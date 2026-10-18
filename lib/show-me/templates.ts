import { explainPack } from "@/lib/content/rules";
import type { BuggyVariant, ShowStep, ShowTemplate } from "@/lib/show-me/types";

function buggy(
  id: string,
  wrongIndex: number,
  wrongCaption: string,
  wrongResult: number,
  misconceptionId: string,
): BuggyVariant {
  return { id, wrongIndex, wrongCaption, wrongResult, misconceptionId };
}

const addA = explainPack("explain-add", { a: 46, b: 27 });
const groupsA = explainPack("explain-groups", { g: 4, n: 6 });
const placeA = explainPack("explain-place", { n: 352, digit: 5, place: 10 });
const fracA = explainPack("explain-fraction", { hops: 3, den: 4 });

export const TIME_MIXUP = {
  id: "hour_stays_past_sixty",
  wrong: (hour: number) => `The hour stays ${hour}.`,
  right: (hour: number) => `The hour moves to ${hour}.`,
};

export const SHOW_TEMPLATES: readonly ShowTemplate[] = [
  template({
    id: "g3-add-trade",
    skill: "g3-add-sub",
    topic: "Regrouping",
    prompt: "46 + 27 = ?",
    highlight: "46",
    steps: [
      { caption: "Add the ones first.", result: 13 },
      { caption: "Trade 10 ones for a ten.", result: 10 },
      { caption: "Add the tens next.", result: 70 },
      { caption: "The sum is 73.", result: 73 },
    ],
    answer: "73",
    misconceptionId: "forgot_carried_ten",
    mixups: [
      { id: "g3-add-trade-a", index: 1, caption: addA.choices[1] ?? "", result: 3 },
      { id: "g3-add-trade-b", index: 0, caption: addA.choices[2] ?? "", result: 60 },
    ],
  }),
  template({
    id: "g3-groups",
    skill: "g3-mult",
    topic: "Equal groups",
    prompt: "4 × 6 = ?",
    highlight: "4",
    steps: [
      { caption: "Make 4 groups.", result: 4 },
      { caption: "Each group has 6.", result: 6 },
      { caption: "Count the groups.", result: 24 },
      { caption: "There are 24.", result: 24 },
    ],
    answer: "24",
    misconceptionId: "added_instead_of_grouped",
    mixups: [
      { id: "g3-groups-a", index: 2, caption: groupsA.choices[1] ?? "", result: 10 },
      { id: "g3-groups-b", index: 2, caption: groupsA.choices[2] ?? "", result: 16 },
    ],
  }),
  template({
    id: "g3-fraction-hop",
    skill: "g3-fractions",
    topic: "Fractions",
    prompt: "A line has 4 equal parts. You hop 3.",
    highlight: "4",
    steps: [
      { caption: "Count the equal parts.", result: 4 },
      { caption: "Hop 3 parts.", result: 3 },
      { caption: "The fraction is 3/4.", result: 4 },
      { caption: "Type 3/4.", result: 4 },
    ],
    answer: "3/4",
    misconceptionId: "counted_tick_marks_not_spaces",
    mixups: [
      { id: "g3-fraction-hop-a", index: 0, caption: fracA.choices[1] ?? "", result: 3 },
      { id: "g3-fraction-hop-b", index: 0, caption: fracA.choices[2] ?? "", result: 3 },
    ],
  }),
  template({
    id: "g3-place-tens",
    skill: "g3-place",
    topic: "Place value",
    prompt: "In 352, what is the 5 worth?",
    highlight: "5",
    steps: [
      { caption: "Find the 5.", result: 5 },
      { caption: "The 5 is in the tens.", result: 10 },
      { caption: "The 5 is worth 50.", result: 50 },
      { caption: "Type 50.", result: 50 },
    ],
    answer: "50",
    misconceptionId: "compared_digits_not_place_value",
    mixups: [
      { id: "g3-place-tens-a", index: 2, caption: placeA.choices[1] ?? "", result: 5 },
      { id: "g3-place-tens-b", index: 2, caption: placeA.choices[2] ?? "", result: 500 },
    ],
  }),
  template({
    id: "g3-time-later",
    skill: "g3-time",
    topic: "Time",
    prompt: "It is 2:50. What time is it 20 minutes later?",
    highlight: "2:50",
    steps: [
      { caption: "Start at 2:50.", result: 2 },
      { caption: "Add the 20.", result: 20 },
      { caption: "The new time is 3:10.", result: 10 },
      { caption: TIME_MIXUP.right(3), result: 3 },
    ],
    answer: "3:10",
    misconceptionId: TIME_MIXUP.id,
    mixups: [
      { id: "g3-time-later-a", index: 3, caption: TIME_MIXUP.wrong(2), result: 2 },
      { id: "g3-time-later-b", index: 2, caption: "The minutes stay 70.", result: 70 },
    ],
  }),
];

function template(input: {
  id: string;
  skill: string;
  topic: string;
  prompt: string;
  highlight: string;
  steps: ShowStep[];
  answer: string;
  misconceptionId: string;
  mixups: { id: string; index: number; caption: string; result: number }[];
}): ShowTemplate {
  return {
    id: input.id,
    skill: input.skill,
    topic: input.topic,
    prompt: input.prompt,
    highlight: input.highlight,
    steps: input.steps,
    answer: input.answer,
    fadeCount: 2,
    misconceptionId: input.misconceptionId,
    buggy: input.mixups.map((mix) =>
      buggy(mix.id, mix.index, mix.caption, mix.result, input.misconceptionId),
    ),
  };
}

export function templateById(id: string): ShowTemplate | undefined {
  return SHOW_TEMPLATES.find((item) => item.id === id);
}

export function sampleTemplate(): ShowTemplate {
  const found = templateById("g3-add-trade");
  if (!found) throw new Error("Missing the regrouping Show me template.");
  return found;
}
