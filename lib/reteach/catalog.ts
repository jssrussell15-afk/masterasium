import type { CraStage, Manipulative } from "@/lib/reteach/types";

export type CatchUpItem = {
  skill: string;
  prerequisite: string;
  stage: CraStage;
  manipulative: Manipulative;
  prompt: string;
  answer: string;
  topic: string;
};

export type GuidedExample = {
  skill: string;
  prompt: string;
  answer: string;
  steps: string[];
  topic: string;
};

const CATCH_UP: CatchUpItem[] = [
  item("g3-add-sub", "g2-add-sub", "Adding", "73", "base_ten", [
    "Group the ones in 46 + 27.",
    "The picture shows the tens and ones in 46 + 27. What is the sum?",
    "46 + 27 = ?",
  ]),
  item("g3-place", "g2-place", "Place value", "50", "base_ten", [
    "Make 352 with blocks. What is the 5 worth?",
    "The picture shows 3 hundreds, 5 tens, and 2 ones. What is the 5 worth?",
    "In 352, what is the 5 worth?",
  ]),
  item("g3-mult", "g2-groups", "Equal groups", "24", "number_line", [
    "Jump by 6, four times. Where do you land?",
    "The picture shows 4 jumps of 6. What is 4 times 6?",
    "4 × 6 = ?",
  ]),
  item("g3-div-rem", "g2-groups", "Equal groups", "3", "number_line", [
    "Jump by 5. How many full jumps fit into 17?",
    "The picture shows jumps of 5 up to 17. How many full jumps fit?",
    "How many full groups of 5 fit into 17?",
  ]),
  item("g3-fractions", "g2-fractions", "Fractions", "3", "fraction_bars", [
    "Split the bar into 4 equal parts. Shade 3. How many parts are shaded?",
    "The picture shows a bar in 4 equal parts, with 3 shaded. How many are shaded?",
    "3 of 4 equal parts are shaded. How many parts are shaded?",
  ]),
  item("g3-perimeter", "g2-measure", "Perimeter", "20", "number_line", [
    "A rectangle is 6 cm by 4 cm. Jump each side. How far around?",
    "The picture shows sides of 6 cm and 4 cm. How far around?",
    "A rectangle is 6 cm by 4 cm. What is the distance around?",
  ]),
  item("g3-time", "g2-measure", "Time", "35", "number_line", [
    "Start at 15 minutes. Jump 20. What minute do you land on?",
    "The picture shows a jump of 20 from 15 minutes. Where do you land?",
    "15 + 20 = ?",
  ]),
  item("g3-data", "g2-data", "Data", "11", "number_line", [
    "The cat bar is 4. Jump 7 more for the dogs. How many animals?",
    "The picture shows a bar of 4 and a bar of 7. How many in all?",
    "4 + 7 = ?",
  ]),
];

function item(
  skill: string,
  prerequisite: string,
  topic: string,
  answer: string,
  manipulative: Manipulative,
  prompts: [string, string, string],
): CatchUpItem {
  return { skill, prerequisite, stage: "concrete", manipulative, prompt: prompts[0], answer, topic };
}

const STAGES: CraStage[] = ["concrete", "representational", "abstract"];

export const CATCH_UP_ITEMS: CatchUpItem[] = CATCH_UP.flatMap((seed) => {
  const prompts = promptsFor(seed);
  return STAGES.map((stage, index) => ({
    ...seed,
    stage,
    prompt: prompts[index] ?? seed.prompt,
    manipulative: stage === "abstract" ? "none" : seed.manipulative,
  }));
});

function promptsFor(seed: CatchUpItem): string[] {
  const found = CATCH_UP.find((item) => item.skill === seed.skill);
  if (!found) return [seed.prompt, seed.prompt, seed.prompt];
  return [found.prompt, representational(found), abstractPrompt(found)];
}

function representational(seed: CatchUpItem): string {
  if (seed.skill === "g3-add-sub") return "The picture shows the tens and ones in 46 + 27. What is the sum?";
  if (seed.skill === "g3-place") return "The picture shows 3 hundreds, 5 tens, and 2 ones. What is the 5 worth?";
  if (seed.skill === "g3-mult") return "The picture shows 4 jumps of 6. What is 4 times 6?";
  if (seed.skill === "g3-div-rem") return "The picture shows jumps of 5 up to 17. How many full jumps fit?";
  if (seed.skill === "g3-fractions") return "The picture shows a bar in 4 equal parts, with 3 shaded. How many are shaded?";
  if (seed.skill === "g3-perimeter") return "The picture shows sides of 6 cm and 4 cm. How far around?";
  if (seed.skill === "g3-time") return "The picture shows a jump of 20 from 15 minutes. Where do you land?";
  return "The picture shows a bar of 4 and a bar of 7. How many in all?";
}

function abstractPrompt(seed: CatchUpItem): string {
  if (seed.skill === "g3-add-sub") return "46 + 27 = ?";
  if (seed.skill === "g3-place") return "In 352, what is the 5 worth?";
  if (seed.skill === "g3-mult") return "4 × 6 = ?";
  if (seed.skill === "g3-div-rem") return "How many full groups of 5 fit into 17?";
  if (seed.skill === "g3-fractions") return "3 of 4 equal parts are shaded. How many parts are shaded?";
  if (seed.skill === "g3-perimeter") return "A rectangle is 6 cm by 4 cm. What is the distance around?";
  if (seed.skill === "g3-time") return "15 + 20 = ?";
  return "4 + 7 = ?";
}

export const GUIDED_EXAMPLES: GuidedExample[] = [
  {
    skill: "g2-add-sub",
    topic: "Adding",
    prompt: "46 + 27 = ?",
    answer: "73",
    steps: ["Add the ones first.", "Trade 10 ones for a ten.", "Add the tens next.", "The sum is 73."],
  },
  {
    skill: "g2-add-sub",
    topic: "Subtracting",
    prompt: "52 − 18 = ?",
    answer: "34",
    steps: ["Start with the ones.", "Trade a ten when you need more ones.", "Subtract the tens.", "The difference is 34."],
  },
  {
    skill: "g2-place",
    topic: "Place value",
    prompt: "In 83, what is the 8 worth?",
    answer: "80",
    steps: ["Find the 8.", "The 8 is in the tens.", "8 tens is 80.", "Type 80."],
  },
  {
    skill: "g2-groups",
    topic: "Equal groups",
    prompt: "4 groups of 3. How many?",
    answer: "12",
    steps: ["Make 4 groups.", "Each group has 3.", "Count every group.", "There are 12."],
  },
  {
    skill: "g2-groups",
    topic: "Equal groups",
    prompt: "5 groups of 2. How many?",
    answer: "10",
    steps: ["Make 5 groups.", "Each group has 2.", "Count every group.", "There are 10."],
  },
  {
    skill: "g2-fractions",
    topic: "Fractions",
    prompt: "A bar has 2 equal parts. 1 is shaded. How many are shaded?",
    answer: "1",
    steps: ["Count the equal parts.", "Count the shaded part.", "1 part is shaded.", "Type 1."],
  },
  {
    skill: "g2-measure",
    topic: "Length",
    prompt: "A ribbon is 8 cm. You cut 3 cm. How many cm are left?",
    answer: "5",
    steps: ["Start at 8 cm.", "Take away 3 cm.", "5 cm are left.", "Type 5."],
  },
  {
    skill: "g2-compare",
    topic: "Comparing",
    prompt: "Which is more, 46 or 28?",
    answer: "46",
    steps: ["Look at the tens first.", "4 tens is more than 2 tens.", "46 is more.", "Type 46."],
  },
  {
    skill: "g2-even-odd",
    topic: "Even and odd",
    prompt: "Is 8 even or odd? Type 8 if it is even.",
    answer: "8",
    steps: ["Even numbers make pairs.", "8 makes 4 pairs.", "8 is even.", "Type 8."],
  },
  {
    skill: "g2-data",
    topic: "Data",
    prompt: "A graph shows 3 cats and 4 dogs. How many pets?",
    answer: "7",
    steps: ["Read the cat bar.", "Read the dog bar.", "Add the two bars.", "There are 7."],
  },
];

export function guidedFor(skillId: string): GuidedExample | undefined {
  return GUIDED_EXAMPLES.find((example) => example.skill === skillId);
}
