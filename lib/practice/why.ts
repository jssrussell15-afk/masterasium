/**
 * "Why does that work?" prompts for five Grade 3 topics.
 * Templates are static. Nothing here calls an outside model.
 * Practice does not show them while the feature flag is off.
 */

export type CaptionSource = "show-me" | "heres-how" | "none";

export type WhyTemplate = {
  id: string;
  /** At most about 12 words, around a Grade 2 reading level. */
  prompt: string;
  /** Exact Show me caption, Here's how line, or a note when neither exists. */
  caption: string;
  captionSource: CaptionSource;
  captionKeywords: string[];
  right: string;
  mixupTag: string;
  mixup: string;
  irrelevant: string;
  /** One line shown after any pick. */
  feedback: string;
};

export type WhyQuestion = {
  prompt: string;
  answer: string;
  steps: string[];
  walk?: { steps: { caption: string }[] } | null;
};

export type PreparedQuestion = {
  facts: Record<string, string>;
  /** Numbers the right reason and the irrelevant choice are allowed to use. */
  allowed: number[];
  templateIds: string[];
};

export type WhySkill = {
  id: string;
  title: string;
  /** Grade 3 generator, when one exists. */
  generatorId: string | null;
  /** Nearest extra generator used when Grade 3 does not ask this question. */
  alsoGenerates: string[];
  review: string[];
  templates: WhyTemplate[];
  prepare: (question: WhyQuestion) => PreparedQuestion | null;
  /** Hand-written questions used when no generator exists. */
  samples: WhyQuestion[];
};

const SHOW = "show-me" as const;
const HOW = "heres-how" as const;
const NONE = "none" as const;

export const WHY_SKILLS: WhySkill[] = [
  {
    id: "g3-add-sub",
    title: "Adding and subtracting with regrouping",
    generatorId: "g3-add-sub",
    alsoGenerates: [],
    review: [
      "Templates apply only when a trade happens, which is also when Show me steps exist. Questions that do not regroup keep the text Here's how: \"Add the ones, then the tens if there are any.\"",
      "Show me always captions subtraction as \"Trade a ten for ones.\" Some questions only need a hundred traded for tens. That template keeps the Show me caption and explains the hundred trade. The prompt says \"Why does that trade work?\" so it does not teach the ones sentence.",
      "When both ones and tens trade, the template explains the ones trade only.",
    ],
    templates: [
      {
        id: "add-ones",
        prompt: "Why trade ones for a ten?",
        caption: "Trade ones for a ten.",
        captionSource: SHOW,
        captionKeywords: ["trade", "ones", "ten"],
        right: "{onesA} ones plus {onesB} ones make {onesSum}. Keep {onesKeep} and trade 1 ten.",
        mixupTag: "forgot_carried_ten",
        mixup: "Forget the extra ten and the sum is {wrong}.",
        irrelevant: "Both amounts are whole numbers you can count.",
        feedback: "Ten ones make one ten, so the extra ten is traded.",
      },
      {
        id: "add-tens",
        prompt: "Why trade tens for a hundred?",
        caption: "Trade tens for a hundred.",
        captionSource: SHOW,
        captionKeywords: ["trade", "tens", "hundred"],
        right: "{tensA} tens plus {tensB} tens make {tensSum}. Keep {tensKeep} and trade 1 hundred.",
        mixupTag: "forgot_carried_ten",
        mixup: "Forget the extra hundred and the sum is {wrong}.",
        irrelevant: "Both amounts are whole numbers you can count.",
        feedback: "Ten tens make one hundred, so that hundred is traded.",
      },
      {
        id: "sub-ones",
        prompt: "Why trade a ten for ones?",
        caption: "Trade a ten for ones.",
        captionSource: SHOW,
        captionKeywords: ["trade", "ten", "ones"],
        right: "{onesStart} ones are less than {onesTake}. Trade 1 ten to make {onesAfter} ones.",
        mixupTag: "forgot_carried_ten",
        mixup: "Skip that trade and the difference would be {wrong}.",
        irrelevant: "You begin with the first number shown above.",
        feedback: "When the ones are short, trade a ten to get more ones.",
      },
      {
        id: "sub-hundred",
        prompt: "Why does that trade work?",
        caption: "Trade a ten for ones.",
        captionSource: SHOW,
        captionKeywords: ["trade", "ten", "ones"],
        right: "The tens are short. Trade 1 hundred to make 10 more tens.",
        mixupTag: "forgot_carried_ten",
        mixup: "Skip that trade and the difference would be {wrong}.",
        irrelevant: "You begin with the first number shown above.",
        feedback: "When the tens are short, trade a hundred to get more tens.",
      },
    ],
    prepare: prepareAddSub,
    samples: [],
  },
  {
    id: "place-and-compare",
    title: "Comparing numbers and place value",
    generatorId: "g3-place",
    alsoGenerates: ["g2-compare"],
    review: [
      "Grade 3 place value is g3-place. There is no Show me walk. Captions match the Here's how lines, such as \"The hundreds digit is 4.\" and \"Its value is 4 × 100 = 400.\"",
      "No template is offered when the digit's value equals the digit. That is the ones place, and any zero in tens or hundreds. The mix-up would state the true value.",
      "Comparing numbers is not a Grade 3 generator. Those templates are filled from g2-compare, which asks which of three numbers to 100 is greatest. There is no Show me walk. Here's how is \"Compare the tens digits first.\" and \"82 has the greatest value.\"",
      "When 100 is in the list, \"Compare the tens digits first.\" is not a correct reason. Those questions have no template.",
      "\"1 tens\" is avoided. The ones template says \"ones\" after the tens match.",
    ],
    templates: [
      {
        id: "place-digit",
        prompt: "Why is the value more than the digit?",
        caption: "The {place} digit is {digit}.",
        captionSource: HOW,
        captionKeywords: ["digit"],
        right: "The {place} digit {digit} is worth {digit} times {placeValue}, which is {answer}.",
        mixupTag: "compared_digits_not_place_value",
        mixup: "The {place} digit is worth only {wrong}, the digit you see.",
        irrelevant: "Places have names like tens and hundreds.",
        feedback: "A digit's value is the digit times its place.",
      },
      {
        id: "place-times",
        prompt: "Why multiply the digit by its place?",
        caption: "Its value is {digit} × {placeValue} = {answer}.",
        captionSource: HOW,
        captionKeywords: ["value"],
        right: "Multiply {digit} by {placeValue}. That product is {answer}.",
        mixupTag: "compared_digits_not_place_value",
        mixup: "Use the digit by itself and write {wrong} for the value.",
        irrelevant: "Places have names like tens and hundreds.",
        feedback: "Multiply the digit by its place to get the value.",
      },
      {
        id: "compare-tens",
        prompt: "Why look at the tens first?",
        caption: "Compare the tens digits first.",
        captionSource: HOW,
        captionKeywords: ["compare", "tens", "digits"],
        right: "{greatest} has {tens} {tenWord}. Each other number has fewer tens.",
        mixupTag: "compared_digits_not_place_value",
        mixup: "{decoy} has {decoyOnes} {onesWord}, so {wrong} would be greatest.",
        irrelevant: "There are three numbers in the list.",
        feedback: "More tens means a greater number.",
      },
      {
        id: "compare-ones",
        prompt: "Why check the ones next?",
        caption: "{greatest} has the greatest value.",
        captionSource: HOW,
        captionKeywords: ["greatest", "value"],
        right: "The tens match. {greatest} has {ones} {greatOnesWord}, so it is greatest.",
        mixupTag: "compared_digits_not_place_value",
        mixup: "{decoy} has {decoyOnes} {decoyOnesWord}, so {wrong} would be greatest.",
        irrelevant: "There are three numbers in the list.",
        feedback: "When the tens match, more ones means a greater number.",
      },
    ],
    prepare: preparePlaceOrCompare,
    samples: [],
  },
  {
    id: "g3-mult",
    title: "Multiplication as equal groups",
    generatorId: "g3-mult",
    alsoGenerates: [],
    review: [
      "Show me captions used here are \"Make this many groups.\", \"See them as an array.\", and \"Count every equal group.\"",
      "For 2 × 2, adding the factors gives the real product. That question uses \"Count one group and stop at 2.\" so the mix-up is not the true answer.",
      "The word \"array\" matches the Show me caption. It may sit above a Grade 2 reading level.",
    ],
    templates: [
      {
        id: "mult-groups",
        prompt: "Why does making groups work?",
        caption: "Make this many groups.",
        captionSource: SHOW,
        captionKeywords: ["make", "groups"],
        right: "Make {a} {groupWord} of {b}. Counting them gives {product}.",
        mixupTag: "added_instead_of_grouped",
        mixup: "Add {a} and {b} together and you get {wrong}.",
        irrelevant: "The times sign is not a plus sign.",
        feedback: "Equal groups are multiplied, not added.",
      },
      {
        id: "mult-array",
        prompt: "Why can these be an array?",
        caption: "See them as an array.",
        captionSource: SHOW,
        captionKeywords: ["array"],
        right: "See {a} {rowWord} of {b}. The array has {product} dots.",
        mixupTag: "added_instead_of_grouped",
        mixup: "Add {a} and {b} and call that {wrong} dots.",
        irrelevant: "Dots can sit in neat rows on a page.",
        feedback: "An array is equal rows, so you multiply.",
      },
      {
        id: "mult-count",
        prompt: "Why count every equal group?",
        caption: "Count every equal group.",
        captionSource: SHOW,
        captionKeywords: ["count", "equal", "group"],
        right: "Count every group of {b}. {a} {groupWord} {verb} {product}.",
        mixupTag: "added_instead_of_grouped",
        mixup: "Add {a} and {b} together and stop at {wrong}.",
        irrelevant: "The times sign is not a plus sign.",
        feedback: "Count each equal group, then you have the product.",
      },
      {
        id: "mult-pair",
        prompt: "Why count every equal group?",
        caption: "Count every equal group.",
        captionSource: SHOW,
        captionKeywords: ["count", "equal", "group"],
        right: "Count every group of {b}. {a} {groupWord} {verb} {product}.",
        mixupTag: "added_instead_of_grouped",
        mixup: "Count only one group and then stop at {wrong}.",
        irrelevant: "The times sign is not a plus sign.",
        feedback: "Count each equal group, then you have the product.",
      },
    ],
    prepare: prepareMult,
    samples: [],
  },
  {
    id: "g3-fractions",
    title: "Fractions on a number line",
    generatorId: "g3-fractions",
    alsoGenerates: [],
    review: [
      "Show me captions used here are \"Count the equal parts.\", \"Hop this many parts.\", and \"That point is the fraction.\"",
      "The mix-up counts tick marks (parts plus one) instead of the equal spaces. \"Tick marks\" may need a quick adult check for Grade 2 reading level.",
      "\"The line starts at zero and ends at one\" is true. A child could think the ending at one is why the fraction works. It does not name the fraction.",
    ],
    templates: [
      {
        id: "frac-parts",
        prompt: "Why count the equal parts?",
        caption: "Count the equal parts.",
        captionSource: SHOW,
        captionKeywords: ["count", "equal", "parts"],
        right: "There are {parts} equal spaces. {shaded} of them is {answer}.",
        mixupTag: "counted_tick_marks_not_spaces",
        mixup: "Count the tick marks and write {wrong}.",
        irrelevant: "The line starts at zero and ends at one.",
        feedback: "The bottom number counts the equal spaces, not the tick marks.",
      },
      {
        id: "frac-hops",
        prompt: "Why hop that many parts?",
        caption: "Hop this many parts.",
        captionSource: SHOW,
        captionKeywords: ["hop", "parts"],
        right: "Start at zero and hop {shaded} parts. You land on {answer}.",
        mixupTag: "counted_tick_marks_not_spaces",
        mixup: "Hop the tick marks and land on {wrong}.",
        irrelevant: "The line starts at zero and ends at one.",
        feedback: "Hop along the equal spaces. The point names the fraction.",
      },
      {
        id: "frac-point",
        prompt: "Why is that point the fraction?",
        caption: "That point is the fraction.",
        captionSource: SHOW,
        captionKeywords: ["point", "fraction"],
        right: "That point is {shaded} parts out of {parts}, or {answer}.",
        mixupTag: "counted_tick_marks_not_spaces",
        mixup: "That point uses tick marks, so write {wrong}.",
        irrelevant: "The line starts at zero and ends at one.",
        feedback: "The point shows how many equal parts you have hopped.",
      },
    ],
    prepare: prepareFraction,
    samples: [],
  },
  {
    id: "g3-missing",
    title: "Missing-number equations",
    generatorId: null,
    alsoGenerates: [],
    review: [
      "Grade 3 has no missing-number generator, no Show me steps, and no Here's how text. The checks fill hand-written samples only. The live bank does not ask these questions.",
      "The mix-up treats the number after the equals sign, or the sum of the left side, as the blank. That is the \"answer goes here\" mistake.",
    ],
    templates: [
      {
        id: "missing-sum",
        prompt: "Why is the blank not the total?",
        caption: "No Show me caption and no Here's how text.",
        captionSource: NONE,
        captionKeywords: [],
        right: "{a} plus the blank equals {total}. The blank is {answer}.",
        mixupTag: "treated_equals_as_answer_here",
        mixup: "The equals sign means the answer is {wrong}.",
        irrelevant: "{a} and {total} are numbers you can count.",
        feedback: "The equals sign means both sides are the same amount.",
      },
      {
        id: "missing-start",
        prompt: "Why is the blank not the total?",
        caption: "No Show me caption and no Here's how text.",
        captionSource: NONE,
        captionKeywords: [],
        right: "The blank plus {b} equals {total}. The blank is {answer}.",
        mixupTag: "treated_equals_as_answer_here",
        mixup: "The equals sign means the answer is {wrong}.",
        irrelevant: "{b} and {total} are numbers you can count.",
        feedback: "The equals sign means both sides are the same amount.",
      },
      {
        id: "missing-balance",
        prompt: "Why does that work?",
        caption: "No Show me caption and no Here's how text.",
        captionSource: NONE,
        captionKeywords: [],
        right: "Both sides equal {sum}. {answer} plus {c} is also {sum}.",
        mixupTag: "treated_equals_as_answer_here",
        mixup: "The equals sign means write {wrong} in the blank.",
        irrelevant: "{a} sits on the left side of the equals sign.",
        feedback: "The equals sign means both sides are the same amount.",
      },
    ],
    prepare: prepareMissing,
    samples: missingSamples(),
  },
];

export function whySkill(id: string): WhySkill | undefined {
  return WHY_SKILLS.find((skill) => skill.id === id);
}

export function fillSlots(template: string, facts: Record<string, string>): string | null {
  if (!/^[\s\S]*$/.test(template)) return null;
  let missing = false;
  const filled = template.replace(/\{([a-zA-Z]+)\}/g, (_match, key: string) => {
    const value = facts[key];
    if (value == null || value === "") {
      missing = true;
      return "";
    }
    return value;
  });
  if (missing || /\{[a-zA-Z]+\}/.test(filled)) return null;
  return filled;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function statedNumbers(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
}

export function statesToken(text: string, token: string): boolean {
  if (!token) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9])${escaped}([^0-9]|$)`).test(text);
}

export function lengthsClose(texts: string[]): boolean {
  const lens = texts.map((text) => text.length);
  const min = Math.min(...lens);
  const max = Math.max(...lens);
  if (min < 1) return false;
  return max <= min * 1.4;
}

export type FilledWhy = {
  template: WhyTemplate;
  prompt: string;
  question: string;
  answer: string;
  right: string;
  mixup: string;
  irrelevant: string;
  feedback: string;
  caption: string;
  mixupTag: string;
};

export function fillTemplate(template: WhyTemplate, question: WhyQuestion, prepared: PreparedQuestion): FilledWhy | null {
  const facts = prepared.facts;
  const right = fillSlots(template.right, facts);
  const mixup = fillSlots(template.mixup, facts);
  const irrelevant = fillSlots(template.irrelevant, facts);
  const feedback = fillSlots(template.feedback, facts);
  const caption = fillSlots(template.caption, facts);
  if (!right || !mixup || !irrelevant || !feedback || !caption) return null;
  return {
    template,
    prompt: template.prompt,
    question: question.prompt,
    answer: question.answer,
    right,
    mixup,
    irrelevant,
    feedback,
    caption,
    mixupTag: template.mixupTag,
  };
}

function prepareAddSub(question: WhyQuestion): PreparedQuestion | null {
  const walk = question.walk;
  if (!walk) return null;
  const captions = new Set(walk.steps.map((step) => step.caption));
  const add = question.prompt.match(/^(\d+) \+ (\d+) = \?$/);
  if (add) {
    const a = Number(add[1]);
    const b = Number(add[2]);
    const sum = a + b;
    if (String(sum) !== question.answer) return null;
    const onesA = a % 10;
    const onesB = b % 10;
    const onesSum = onesA + onesB;
    const tensA = Math.floor(a / 10) % 10;
    const tensB = Math.floor(b / 10) % 10;
    const tensSum = tensA + tensB + (onesSum >= 10 ? 1 : 0);
    const ids: string[] = [];
    const facts: Record<string, string> = {
      a: String(a),
      b: String(b),
      answer: String(sum),
    };
    if (onesSum >= 10 && captions.has("Trade ones for a ten.")) {
      ids.push("add-ones");
      facts.onesA = String(onesA);
      facts.onesB = String(onesB);
      facts.onesSum = String(onesSum);
      facts.onesKeep = String(onesSum % 10);
      facts.wrong = String(sum - 10);
    } else if (onesSum < 10 && tensSum >= 10 && captions.has("Trade tens for a hundred.")) {
      ids.push("add-tens");
      facts.tensA = String(tensA);
      facts.tensB = String(tensB);
      facts.tensSum = String(tensSum);
      facts.tensKeep = String(tensSum % 10);
      facts.wrong = String(sum - 100);
    }
    if (ids.length === 0 || facts.wrong === question.answer) return null;
    return {
      facts,
      allowed: nums(a, b, sum, onesA, onesB, onesSum, onesSum % 10, tensA, tensB, tensSum, tensSum % 10, 1, 10, 100),
      templateIds: ids,
    };
  }

  const sub = question.prompt.match(/^(\d+) − (\d+) = \?$/);
  if (!sub) return null;
  const start = Number(sub[1]);
  const take = Number(sub[2]);
  const diff = start - take;
  if (String(diff) !== question.answer || !captions.has("Trade a ten for ones.")) return null;
  const onesStart = start % 10;
  const onesTake = take % 10;
  const onesBorrow = onesStart < onesTake;
  const tensLeft = (Math.floor(start / 10) % 10) - (onesBorrow ? 1 : 0);
  const tensBorrow = tensLeft < Math.floor(take / 10) % 10;
  if (onesBorrow) {
    const wrong = String(diff + 10);
    if (wrong === question.answer) return null;
    return {
      facts: {
        onesStart: String(onesStart),
        onesTake: String(onesTake),
        onesAfter: String(onesStart + 10),
        answer: String(diff),
        wrong,
      },
      allowed: nums(start, take, diff, onesStart, onesTake, onesStart + 10, 1, 10),
      templateIds: ["sub-ones"],
    };
  }
  if (tensBorrow) {
    const wrong = String(diff + 100);
    if (wrong === question.answer) return null;
    return {
      facts: { answer: String(diff), wrong },
      allowed: nums(start, take, diff, 1, 10, 100),
      templateIds: ["sub-hundred"],
    };
  }
  return null;
}

function preparePlaceOrCompare(question: WhyQuestion): PreparedQuestion | null {
  return preparePlace(question) ?? prepareCompare(question);
}

function preparePlace(question: WhyQuestion): PreparedQuestion | null {
  const match = question.prompt.match(/^In (.+), what is the value of the (ones|tens|hundreds) digit\?$/);
  if (!match) return null;
  const number = Number(match[1].replace(/,/g, ""));
  const place = match[2];
  const placeValue = place === "hundreds" ? 100 : place === "tens" ? 10 : 1;
  const digit = Math.floor(number / placeValue) % 10;
  const answer = digit * placeValue;
  if (!Number.isInteger(number) || String(answer) !== question.answer) return null;
  if (answer === digit) return null;
  const stepOne = `The ${place} digit is ${digit}.`;
  const stepTwo = `Its value is ${digit} × ${placeValue} = ${answer}.`;
  if (!question.steps.includes(stepOne) || !question.steps.includes(stepTwo)) return null;
  return {
    facts: {
      place,
      digit: String(digit),
      placeValue: String(placeValue),
      answer: String(answer),
      wrong: String(digit),
    },
    allowed: nums(number, digit, placeValue, answer, 1, 10, 100),
    templateIds: ["place-digit", "place-times"],
  };
}

function prepareCompare(question: WhyQuestion): PreparedQuestion | null {
  const match = question.prompt.match(/^Which number is greatest: (\d+), (\d+), (\d+)\?$/);
  if (!match) return null;
  const numbers = [Number(match[1]), Number(match[2]), Number(match[3])];
  const greatest = Math.max(...numbers);
  if (String(greatest) !== question.answer) return null;
  if (numbers.some((value) => value >= 100)) return null;
  const tens = Math.floor(greatest / 10);
  const ones = greatest % 10;
  const others = numbers.filter((value) => value !== greatest);
  const decoy = others.reduce((best, value) => ((value % 10) > (best % 10) ? value : best), others[0] ?? greatest);
  if (decoy === greatest) return null;
  const tensStep = "Compare the tens digits first.";
  const valueStep = `${greatest} has the greatest value.`;
  if (!question.steps.includes(tensStep) || !question.steps.includes(valueStep)) return null;
  const maxOtherTens = Math.max(...others.map((value) => Math.floor(value / 10)));
  if (tens > maxOtherTens) {
    return {
      facts: {
        greatest: String(greatest),
        tens: String(tens),
        tenWord: tens === 1 ? "ten" : "tens",
        decoy: String(decoy),
        decoyOnes: String(decoy % 10),
        onesWord: decoy % 10 === 1 ? "one" : "ones",
        wrong: String(decoy),
        answer: String(greatest),
      },
      allowed: nums(...numbers, tens, ones, decoy % 10, 1, 10),
      templateIds: ["compare-tens"],
    };
  }
  const tied = numbers.filter((value) => Math.floor(value / 10) === tens);
  const greatestIsUniqueOnes = tied.filter((value) => value % 10 === ones).length === 1;
  if (!greatestIsUniqueOnes) return null;
  return {
      facts: {
        greatest: String(greatest),
        ones: String(ones),
        greatOnesWord: ones === 1 ? "one" : "ones",
        decoy: String(decoy),
        decoyOnes: String(decoy % 10),
        decoyOnesWord: decoy % 10 === 1 ? "one" : "ones",
        wrong: String(decoy),
        answer: String(greatest),
      },
    allowed: nums(...numbers, tens, ones, decoy % 10),
    templateIds: ["compare-ones"],
  };
}

function prepareMult(question: WhyQuestion): PreparedQuestion | null {
  const match = question.prompt.match(/^(\d+) × (\d+) = \?$/);
  if (!match || !question.walk) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  const product = a * b;
  if (String(product) !== question.answer) return null;
  const captions = new Set(question.walk.steps.map((step) => step.caption));
  if (!captions.has("Make this many groups.") || !captions.has("See them as an array.") || !captions.has("Count every equal group.")) {
    return null;
  }
  const sum = a + b;
  const pair = a === 2 && b === 2;
  const wrong = pair ? a : sum;
  if (String(wrong) === question.answer) return null;
  const facts = {
    a: String(a),
    b: String(b),
    product: String(product),
    answer: String(product),
    groupWord: a === 1 ? "group" : "groups",
    rowWord: a === 1 ? "row" : "rows",
    verb: a === 1 ? "makes" : "make",
    wrong: String(wrong),
  };
  return {
    facts,
    allowed: nums(a, b, product, sum, 1),
    templateIds: pair ? ["mult-pair"] : ["mult-groups", "mult-array", "mult-count"],
  };
}

function prepareFraction(question: WhyQuestion): PreparedQuestion | null {
  const match = question.prompt.match(/split into (\d+) equal parts\. What fraction is (\d+) parts from zero\?$/);
  if (!match || !question.walk) return null;
  const parts = Number(match[1]);
  const shaded = Number(match[2]);
  const answer = `${shaded}/${parts}`;
  if (answer !== question.answer) return null;
  const captions = new Set(question.walk.steps.map((step) => step.caption));
  if (!captions.has("Count the equal parts.") || !captions.has("Hop this many parts.") || !captions.has("That point is the fraction.")) {
    return null;
  }
  const ticks = parts + 1;
  const wrong = `${shaded}/${ticks}`;
  if (wrong === answer) return null;
  return {
    facts: {
      parts: String(parts),
      shaded: String(shaded),
      answer,
      wrong,
    },
    allowed: nums(parts, shaded, 0, 1),
    templateIds: ["frac-parts", "frac-hops", "frac-point"],
  };
}

function prepareMissing(question: WhyQuestion): PreparedQuestion | null {
  const sum = question.prompt.match(/^(\d+) \+ \? = (\d+)$/);
  if (sum) {
    const a = Number(sum[1]);
    const total = Number(sum[2]);
    const answer = total - a;
    if (String(answer) !== question.answer || total === answer) return null;
    return {
      facts: { a: String(a), total: String(total), answer: String(answer), wrong: String(total) },
      allowed: nums(a, total, answer),
      templateIds: ["missing-sum"],
    };
  }
  const start = question.prompt.match(/^\? \+ (\d+) = (\d+)$/);
  if (start) {
    const b = Number(start[1]);
    const total = Number(start[2]);
    const answer = total - b;
    if (String(answer) !== question.answer || total === answer) return null;
    return {
      facts: { b: String(b), total: String(total), answer: String(answer), wrong: String(total) },
      allowed: nums(b, total, answer),
      templateIds: ["missing-start"],
    };
  }
  const balance = question.prompt.match(/^(\d+) \+ (\d+) = \? \+ (\d+)$/);
  if (!balance) return null;
  const a = Number(balance[1]);
  const b = Number(balance[2]);
  const c = Number(balance[3]);
  const total = a + b;
  const answer = total - c;
  if (String(answer) !== question.answer || answer === total || c === 0) return null;
  return {
    facts: {
      a: String(a),
      b: String(b),
      c: String(c),
      sum: String(total),
      answer: String(answer),
      wrong: String(total),
    },
    allowed: nums(a, b, c, total, answer),
    templateIds: ["missing-balance"],
  };
}

function missingSamples(): WhyQuestion[] {
  const blank = { steps: [] as string[], walk: null };
  const sums = [
    [8, 15],
    [9, 14],
    [6, 13],
    [4, 12],
    [7, 16],
    [5, 11],
  ];
  const starts = [
    [6, 14],
    [4, 11],
    [9, 17],
    [3, 10],
    [8, 13],
    [5, 12],
  ];
  const balances = [
    [3, 4, 2],
    [6, 5, 3],
    [2, 9, 4],
    [7, 1, 3],
    [4, 6, 5],
    [8, 2, 4],
  ];
  return [
    ...sums.map(([a, total]) => ({ prompt: `${a} + ? = ${total}`, answer: String(total - a), ...blank })),
    ...starts.map(([b, total]) => ({ prompt: `? + ${b} = ${total}`, answer: String(total - b), ...blank })),
    ...balances.map(([a, b, c]) => ({
      prompt: `${a} + ${b} = ? + ${c}`,
      answer: String(a + b - c),
      ...blank,
    })),
  ];
}

function nums(...values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value >= 0))];
}
