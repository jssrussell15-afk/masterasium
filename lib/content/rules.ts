/** Checkers for Phase 1 drafts. Math lives here so a fill cannot grade itself. */

export type Slots = Record<string, string | number>;

export function intsIn(text: string): number[] {
  return (text.match(/\d+/g) ?? []).map((part) => Number(part));
}

function slotNum(slots: Slots, key: string): number {
  const value = slots[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Slot ${key} needs a whole number.`);
  }
  return value;
}

function sameLoose(left: string, right: string): boolean {
  return left.trim().toLowerCase().replace(/\s+/g, " ") === right.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mistakeAnswerMatches(wrongLine: number | undefined, fix: string | undefined, given: string): boolean {
  if (wrongLine == null || !fix) return false;
  const match = given.trim().match(/^(\d+)\s*:\s*(.+)$/);
  if (!match) return false;
  return Number(match[1]) === wrongLine && sameLoose(match[2], fix);
}

export function roundTo(value: number, place: 10 | 100): number {
  const rest = value % place;
  const half = place / 2;
  if (rest === half) throw new Error("A tie has two nearest values.");
  return rest < half ? value - rest : value + (place - rest);
}

export function closestLabel(numerator: number, denominator: number): "0" | "1/2" | "1" | null {
  if (denominator <= 0 || numerator < 0 || numerator > denominator) return null;
  const dist0 = numerator;
  const distHalf = Math.abs(2 * numerator - denominator);
  const dist1 = denominator - numerator;
  const scaled = [
    { label: "0" as const, score: dist0 * 2 },
    { label: "1/2" as const, score: distHalf },
    { label: "1" as const, score: dist1 * 2 },
  ];
  scaled.sort((left, right) => left.score - right.score);
  if (scaled[0]!.score === scaled[1]!.score) return null;
  return scaled[0]!.label;
}

export function countFactorPairs(product: number, min: number, max: number): number {
  let count = 0;
  for (let left = min; left <= max; left += 1) {
    if (left === 0 || product % left !== 0) continue;
    const right = product / left;
    if (right < left || right > max || right < min) continue;
    count += 1;
  }
  return count;
}

export function satisfies(rule: string, slots: Slots, answer: string): boolean {
  const numbers = intsIn(answer);
  if (rule === "sum-diff") {
    if (numbers.length !== 2) return false;
    const [left, right] = numbers;
    return left! + right! === slotNum(slots, "sum") && Math.abs(left! - right!) === slotNum(slots, "diff");
  }
  if (rule === "ones-trade") {
    if (numbers.length !== 1) return false;
    const value = numbers[0]!;
    const low = slotNum(slots, "low");
    const high = slotNum(slots, "high");
    const addTo = slotNum(slots, "addTo");
    return value >= low && value <= high && (value % 10) + (addTo % 10) >= 10;
  }
  if (rule === "digit-place") {
    if (numbers.length !== 1) return false;
    const value = numbers[0]!;
    const place = slotNum(slots, "place");
    return (
      value >= slotNum(slots, "low") &&
      value <= slotNum(slots, "high") &&
      Math.floor(value / place) % 10 === slotNum(slots, "digit")
    );
  }
  if (rule === "plus-step") {
    if (numbers.length !== 2) return false;
    const [left, right] = numbers;
    const low = slotNum(slots, "low");
    const high = slotNum(slots, "high");
    const step = slotNum(slots, "step");
    return (
      left! >= low &&
      left! <= high &&
      right! >= low &&
      right! <= high &&
      Math.abs(left! - right!) === step
    );
  }
  if (rule === "factor-pair") {
    if (numbers.length !== 2) return false;
    const [left, right] = numbers;
    const min = slotNum(slots, "min");
    const max = slotNum(slots, "max");
    return (
      left! >= min &&
      left! <= max &&
      right! >= min &&
      right! <= max &&
      left! * right! === slotNum(slots, "product")
    );
  }
  if (rule === "half") {
    if (numbers.length !== 2) return false;
    const [numerator, denominator] = numbers;
    const denMax = slotNum(slots, "denMax");
    return (
      denominator! >= 2 &&
      denominator! <= denMax &&
      denominator! % 2 === 0 &&
      numerator! * 2 === denominator
    );
  }
  if (rule === "pair-sum") {
    if (numbers.length !== 2) return false;
    const [left, right] = numbers;
    const low = slotNum(slots, "low");
    const high = slotNum(slots, "high");
    return (
      left !== right &&
      left! >= low &&
      left! <= high &&
      right! >= low &&
      right! <= high &&
      left! + right! === slotNum(slots, "sum")
    );
  }
  return false;
}

export function countSolutions(rule: string, slots: Slots): number {
  if (rule === "sum-diff") {
    const sum = slotNum(slots, "sum");
    const diff = slotNum(slots, "diff");
    if (sum <= diff || (sum + diff) % 2 !== 0) return 0;
    const big = (sum + diff) / 2;
    const small = (sum - diff) / 2;
    if (small <= 0 || big <= 0 || big > 1000) return 0;
    return 1;
  }
  if (rule === "ones-trade") {
    const low = slotNum(slots, "low");
    const high = slotNum(slots, "high");
    const addTo = slotNum(slots, "addTo");
    let count = 0;
    for (let value = low; value <= high; value += 1) {
      if ((value % 10) + (addTo % 10) >= 10) count += 1;
    }
    return count;
  }
  if (rule === "digit-place") {
    const low = slotNum(slots, "low");
    const high = slotNum(slots, "high");
    const place = slotNum(slots, "place");
    const digit = slotNum(slots, "digit");
    let count = 0;
    for (let value = low; value <= high; value += 1) {
      if (Math.floor(value / place) % 10 === digit) count += 1;
    }
    return count;
  }
  if (rule === "plus-step") {
    const low = slotNum(slots, "low");
    const high = slotNum(slots, "high");
    const step = slotNum(slots, "step");
    let count = 0;
    for (let value = low; value <= high - step; value += 1) count += 1;
    return count;
  }
  if (rule === "factor-pair") {
    return countFactorPairs(slotNum(slots, "product"), slotNum(slots, "min"), slotNum(slots, "max"));
  }
  if (rule === "half") {
    const denMax = slotNum(slots, "denMax");
    let count = 0;
    for (let denominator = 2; denominator <= denMax; denominator += 2) count += 1;
    return count;
  }
  if (rule === "pair-sum") {
    const low = slotNum(slots, "low");
    const high = slotNum(slots, "high");
    const sum = slotNum(slots, "sum");
    let count = 0;
    for (let left = low; left <= high; left += 1) {
      const right = sum - left;
      if (right > left && right >= low && right <= high) count += 1;
    }
    return count;
  }
  return 0;
}

export function trueLines(kind: string, slots: Slots): string[] {
  if (kind === "add") {
    const left = slotNum(slots, "a");
    const right = slotNum(slots, "b");
    const ones = (left % 10) + (right % 10);
    const sum = left + right;
    return [
      `${left % 10} + ${right % 10} = ${ones}.`,
      ones >= 10 ? "Trade 10 ones for 1 ten." : "Do not trade ones.",
      `${left} + ${right} = ${sum}.`,
      `The sum is ${sum}.`,
    ];
  }
  if (kind === "groups") {
    const groups = slotNum(slots, "g");
    const size = slotNum(slots, "n");
    return [
      `There are ${groups} equal groups.`,
      `Each group has ${size}.`,
      "You count every group.",
      `The total is ${groups * size}.`,
    ];
  }
  if (kind === "place") {
    const value = slotNum(slots, "n");
    const hundreds = Math.floor(value / 100);
    const tens = Math.floor(value / 10) % 10;
    const ones = value % 10;
    if (value >= 100) {
      return [
        `The ${hundreds} is worth ${hundreds * 100}.`,
        `The ${tens} is worth ${tens * 10}.`,
        `The ${ones} is worth ${ones}.`,
        `${value} has ${hundreds} hundreds.`,
      ];
    }
    return [
      `The ${tens} is worth ${tens * 10}.`,
      `The ${ones} is worth ${ones}.`,
      `${value} has ${tens} tens.`,
    ];
  }
  if (kind === "fraction") {
    const denominator = slotNum(slots, "den");
    const hops = slotNum(slots, "hops");
    const overHalf = hops * 2 > denominator;
    return [
      `The whole has ${denominator} equal parts.`,
      `You hop ${hops} parts.`,
      `The fraction is ${hops}/${denominator}.`,
      overHalf ? `${hops}/${denominator} is more than 1/2.` : `${hops}/${denominator} is less than 1/2.`,
    ];
  }
  if (kind === "missing-add") {
    const left = slotNum(slots, "a");
    const total = slotNum(slots, "total");
    const blank = total - left;
    return [
      `${total} - ${left} = ${blank}.`,
      `The blank is ${blank}.`,
      `Check: ${left} + ${blank} = ${total}.`,
    ];
  }
  if (kind === "missing-sub") {
    const start = slotNum(slots, "start");
    const taken = slotNum(slots, "taken");
    const left = start - taken;
    return [
      `${left} + ${taken} = ${start}.`,
      `The blank is ${start}.`,
      `Check: ${start} - ${taken} = ${left}.`,
    ];
  }
  throw new Error(`Unknown worked solution ${kind}.`);
}

function claimIsTrue(kind: string, slots: Slots, line: string): boolean {
  const truth = trueLines(kind, slots);
  if (kind === "add") {
    const left = slotNum(slots, "a");
    const right = slotNum(slots, "b");
    const ones = (left % 10) + (right % 10);
    const equation = line.match(/^(\d+) \+ (\d+) = (\d+)\.$/);
    if (equation) {
      const a = Number(equation[1]);
      const b = Number(equation[2]);
      const c = Number(equation[3]);
      if (a === left % 10 && b === right % 10) return c === ones;
      if (a === left && b === right) return c === left + right;
      return false;
    }
    if (line === "Trade 10 ones for 1 ten.") return ones >= 10;
    if (line === "Do not trade ones.") return ones < 10;
    const sumLine = line.match(/^The sum is (\d+)\.$/);
    if (sumLine) return Number(sumLine[1]) === left + right;
    return false;
  }
  if (kind === "groups") {
    const groups = slotNum(slots, "g");
    const size = slotNum(slots, "n");
    const groupLine = line.match(/^There are (\d+) equal groups\.$/);
    if (groupLine) return Number(groupLine[1]) === groups;
    const eachLine = line.match(/^Each group has (\d+)\.$/);
    if (eachLine) return Number(eachLine[1]) === size;
    if (line === "You count every group.") return true;
    if (line === "You skip a group.") return false;
    const totalLine = line.match(/^The total is (\d+)\.$/);
    if (totalLine) return Number(totalLine[1]) === groups * size;
    return false;
  }
  if (kind === "place") {
    const value = slotNum(slots, "n");
    const worth = line.match(/^The (\d+) is worth (\d+)\.$/);
    if (worth) {
      const digit = Number(worth[1]);
      const amount = Number(worth[2]);
      const places = [
        [Math.floor(value / 100), 100],
        [Math.floor(value / 10) % 10, 10],
        [value % 10, 1],
      ] as const;
      return places.some(([placeDigit, place]) => placeDigit === digit && placeDigit * place === amount);
    }
    const hundreds = line.match(/^(\d+) has (\d+) hundreds\.$/);
    if (hundreds) return Number(hundreds[1]) === value && Number(hundreds[2]) === Math.floor(value / 100);
    const tens = line.match(/^(\d+) has (\d+) tens\.$/);
    if (tens) return Number(tens[1]) === value && Number(tens[2]) === Math.floor(value / 10) % 10;
    return false;
  }
  if (kind === "fraction") {
    const denominator = slotNum(slots, "den");
    const hops = slotNum(slots, "hops");
    const whole = line.match(/^The whole has (\d+) equal parts\.$/);
    if (whole) return Number(whole[1]) === denominator;
    const hopLine = line.match(/^You hop (\d+) parts\.$/);
    if (hopLine) return Number(hopLine[1]) === hops;
    const fraction = line.match(/^The fraction is (\d+)\/(\d+)\.$/);
    if (fraction) return Number(fraction[1]) === hops && Number(fraction[2]) === denominator;
    const more = line.match(/^(\d+)\/(\d+) is more than 1\/2\.$/);
    if (more) return Number(more[1]) * 2 > Number(more[2]) && Number(more[1]) === hops && Number(more[2]) === denominator;
    const less = line.match(/^(\d+)\/(\d+) is less than 1\/2\.$/);
    if (less) return Number(less[1]) * 2 < Number(less[2]) && Number(less[1]) === hops && Number(less[2]) === denominator;
    return false;
  }
  if (kind === "missing-add") {
    const left = slotNum(slots, "a");
    const total = slotNum(slots, "total");
    const blank = total - left;
    const difference = line.match(/^(\d+) - (\d+) = (\d+)\.$/);
    if (difference) return Number(difference[1]) === total && Number(difference[2]) === left && Number(difference[3]) === blank;
    const blankLine = line.match(/^The blank is (\d+)\.$/);
    if (blankLine) return Number(blankLine[1]) === blank;
    const check = line.match(/^Check: (\d+) \+ (\d+) = (\d+)\.$/);
    if (check) {
      return Number(check[1]) === left && Number(check[2]) === blank && Number(check[3]) === total;
    }
    return false;
  }
  if (kind === "missing-sub") {
    const start = slotNum(slots, "start");
    const taken = slotNum(slots, "taken");
    const left = start - taken;
    const rebuild = line.match(/^(\d+) \+ (\d+) = (\d+)\.$/);
    if (rebuild) return Number(rebuild[1]) === left && Number(rebuild[2]) === taken && Number(rebuild[3]) === start;
    const blankLine = line.match(/^The blank is (\d+)\.$/);
    if (blankLine) return Number(blankLine[1]) === start;
    const check = line.match(/^Check: (\d+) - (\d+) = (\d+)\.$/);
    if (check) return Number(check[1]) === start && Number(check[2]) === taken && Number(check[3]) === left;
    return false;
  }
  return truth.includes(line);
}

export function corruptLines(kind: string, slots: Slots, index: number): { lines: string[]; wrongLine: number; fix: string } {
  const lines = trueLines(kind, slots);
  const fix = lines[index];
  if (!fix) throw new Error(`No line ${index} for ${kind}.`);
  lines[index] = corruptOne(kind, slots, index, fix);
  if (lines[index] === fix) throw new Error(`Line ${index} did not change.`);
  return { lines, wrongLine: index + 1, fix };
}

function corruptOne(kind: string, slots: Slots, index: number, fix: string): string {
  if (kind === "add") {
    if (index === 1) return fix.startsWith("Trade") ? "Do not trade ones." : "Trade 10 ones for 1 ten.";
    return fix.replace(/(\d+)(\.)$/, (_all, value: string, end: string) => `${Number(value) + (index === 0 ? 1 : 10)}${end}`);
  }
  if (kind === "groups") {
    if (index === 2) return "You skip a group.";
    return fix.replace(/(\d+)/, (value) => String(Number(value) + 1));
  }
  if (kind === "place") {
    const worth = fix.match(/^The (\d+) is worth (\d+)\.$/);
    if (worth) {
      const amount = Number(worth[2]);
      const wrong = amount >= 10 ? amount / 10 : amount + 10;
      return `The ${worth[1]} is worth ${wrong}.`;
    }
    return fix.replace(/(\d+)( hundreds| tens)\.$/, (_all, value: string, rest: string) => `${Number(value) + 1}${rest}.`);
  }
  if (kind === "fraction") {
    if (index === 0) return fix.replace(/(\d+)/, (value) => String(Number(value) + 1));
    if (index === 1) return fix.replace(/(\d+)/, (value) => String(Number(value) + 1));
    if (index === 2) return fix.replace(/\/(\d+)/, (_all, den: string) => `/${Number(den) + 1}`);
    return fix.includes("more than") ? fix.replace("more than", "less than") : fix.replace("less than", "more than");
  }
  if (kind === "missing-add") {
    if (index === 1) return `The blank is ${slotNum(slots, "total")}.`;
    return fix.replace(/(\d+)(\.)$/, (_all, value: string, end: string) => `${Number(value) + 1}${end}`);
  }
  if (kind === "missing-sub") {
    if (index === 1) return `The blank is ${slotNum(slots, "start") - slotNum(slots, "taken")}.`;
    return fix.replace(/(\d+)(\.)$/, (_all, value: string, end: string) => `${Number(value) + 1}${end}`);
  }
  return `${fix} extra`;
}

/** Null when the worked lines have exactly one independently false line and the fix restores it. */
export function auditMistake(kind: string, slots: Slots, lines: string[], wrongLine: number, fix: string): string | null {
  const truth = trueLines(kind, slots);
  if (lines.length !== truth.length) return "The worked solution has the wrong number of lines.";
  const changed: number[] = [];
  lines.forEach((line, index) => {
    if (line !== truth[index]) changed.push(index);
  });
  if (changed.length !== 1) return `There are ${changed.length} lines that differ from the true work.`;
  if (changed[0]! + 1 !== wrongLine) return "The marked line is not the line that changed.";
  if (truth[changed[0]!] !== fix) return "The fix does not restore the true line.";
  const flags = lines.map((line) => claimIsTrue(kind, slots, line));
  const falseCount = flags.filter((ok) => !ok).length;
  if (falseCount !== 1) return `Independent check found ${falseCount} false lines.`;
  if (flags[changed[0]!]) return "The changed line still reads as true.";
  if (!truth.every((line) => claimIsTrue(kind, slots, line))) return "A true line does not pass the claim check.";
  return null;
}

export function greaterSum(a: number, b: number, c: number, d: number): string | null {
  const left = a + b;
  const right = c + d;
  if (left === right) return null;
  return left > right ? `${a} + ${b}` : `${c} + ${d}`;
}

export function largestFromDigits(digits: number[]): number {
  const sorted = [...digits].sort((left, right) => right - left);
  if (sorted[0] === 0) throw new Error("A number cannot start with 0.");
  return Number(sorted.join(""));
}

export function nextTerm(start: number, step: number, shown: number): number {
  return start + step * shown;
}

export function barResult(parts: number[], take: number): number {
  return parts.reduce((sum, part) => sum + part, 0) - take;
}

export function barSteps(parts: number[], take: number, labels: string[]): string[] {
  const whole = parts.reduce((sum, part) => sum + part, 0);
  const left = whole - take;
  const steps = parts.map((part, index) => `${labels[index] ?? "Part"}: ${part}`);
  steps.push(`Whole: ${whole}`);
  if (take > 0) steps.push(`Take away: ${take}`);
  steps.push(`Left: ${left}`);
  return steps;
}

function partsFrom(slots: Slots): number[] {
  return ["p0", "p1", "p2"]
    .filter((key) => typeof slots[key] === "number")
    .map((key) => slotNum(slots, key));
}

function digitsFrom(slots: Slots): number[] {
  return ["d0", "d1", "d2"]
    .filter((key) => typeof slots[key] === "number")
    .map((key) => slotNum(slots, key));
}

export function explainPack(rule: string, slots: Slots): { prompt: string; choices: string[]; answer: string } {
  if (rule === "explain-add") {
    const left = slotNum(slots, "a");
    const right = slotNum(slots, "b");
    const onesLeft = left % 10;
    const onesRight = right % 10;
    const ones = onesLeft + onesRight;
    const answer = `The ones are ${onesLeft} + ${onesRight} = ${ones}. Trade 10 ones for a ten.`;
    return {
      prompt: `Why does ${left} + ${right} need a trade?`,
      choices: [
        answer,
        `The ones are ${onesLeft} + ${onesRight} = ${ones - 10}. No trade is needed.`,
        "Add the tens first and skip the ones.",
      ],
      answer,
    };
  }
  if (rule === "explain-groups") {
    const groups = slotNum(slots, "g");
    const size = slotNum(slots, "n");
    const answer = `${groups} groups of ${size} is ${groups * size}.`;
    return {
      prompt: `What does ${groups} × ${size} mean?`,
      choices: [answer, `${groups} + ${size} is ${groups + size}.`, `${groups} groups of ${groups} is ${groups * groups}.`],
      answer,
    };
  }
  if (rule === "explain-place") {
    const digit = slotNum(slots, "digit");
    const place = slotNum(slots, "place");
    const value = digit * place;
    const other = place === 100 ? digit * 10 : digit * 100;
    const answer = `The ${digit} is worth ${value}.`;
    return {
      prompt: `In ${slotNum(slots, "n")}, what is the ${digit} worth?`,
      choices: [answer, `The ${digit} is worth ${digit}.`, `The ${digit} is worth ${other}.`],
      answer,
    };
  }
  if (rule === "explain-fraction") {
    const hops = slotNum(slots, "hops");
    const den = slotNum(slots, "den");
    const answer = `Count ${hops} equal parts out of ${den}. The fraction is ${hops}/${den}.`;
    return {
      prompt: `A line has ${den} equal parts. You hop ${hops}. What fraction is that?`,
      choices: [answer, `Count ${hops} tick marks. The fraction is ${hops}/${hops}.`, `The whole line is ${hops} parts.`],
      answer,
    };
  }
  if (rule === "explain-size") {
    const den = slotNum(slots, "den");
    const answer = `The whole is the same. 1/${den} is smaller than 1/2.`;
    return {
      prompt: `Which piece is smaller, 1/2 or 1/${den}?`,
      choices: [answer, `1/${den} is bigger because ${den} is bigger.`, "They are the same size."],
      answer,
    };
  }
  if (rule === "explain-blank") {
    const left = slotNum(slots, "a");
    const total = slotNum(slots, "total");
    const blank = total - left;
    const answer = `The blank is ${blank}, because ${left} + ${blank} = ${total}.`;
    return {
      prompt: `${left} + ☐ = ${total}. What number goes in the blank?`,
      choices: [answer, `The blank is ${total}, the number after the equals sign.`, `The blank is ${left}, the first number.`],
      answer,
    };
  }
  throw new Error(`Unknown explanation ${rule}.`);
}

export function expectedClosed(rule: string, slots: Slots): string {
  if (rule === "rounded-sum") {
    const place = slotNum(slots, "place") as 10 | 100;
    return String(roundTo(slotNum(slots, "a"), place) + roundTo(slotNum(slots, "b"), place));
  }
  if (rule === "rounded-one") {
    const place = slotNum(slots, "place") as 10 | 100;
    return String(roundTo(slotNum(slots, "n"), place));
  }
  if (rule === "rounded-blank") {
    const place = slotNum(slots, "place") as 10 | 100;
    return String(roundTo(slotNum(slots, "total"), place) - roundTo(slotNum(slots, "a"), place));
  }
  if (rule === "rounded-product") {
    return String(slotNum(slots, "g") * roundTo(slotNum(slots, "n"), 10));
  }
  if (rule === "bar") {
    return String(barResult(partsFrom(slots), slotNum(slots, "take")));
  }
  if (rule === "fraction") {
    return `${slotNum(slots, "num")}/${slotNum(slots, "den")}`;
  }
  if (rule === "closest") {
    const label = closestLabel(slotNum(slots, "num"), slotNum(slots, "den"));
    if (!label) throw new Error("That fraction is the same distance from two marks.");
    return label;
  }
  if (rule === "greater-sum") {
    const answer = greaterSum(slotNum(slots, "a"), slotNum(slots, "b"), slotNum(slots, "c"), slotNum(slots, "d"));
    if (!answer) throw new Error("The sums are equal.");
    return answer;
  }
  if (rule === "largest") return String(largestFromDigits(digitsFrom(slots)));
  if (rule === "next") return String(nextTerm(slotNum(slots, "start"), slotNum(slots, "step"), slotNum(slots, "shown")));
  if (rule === "missing-term") return String(slotNum(slots, "start") + slotNum(slots, "step"));
  if (rule === "compare-frac") {
    const left = slotNum(slots, "left");
    const right = slotNum(slots, "right");
    const den = slotNum(slots, "den");
    if (left === right) throw new Error("The fractions are equal.");
    return left > right ? `${left}/${den}` : `${right}/${den}`;
  }
  if (rule === "rope") {
    return String(slotNum(slots, "rope") - slotNum(slots, "piece") - slotNum(slots, "cut"));
  }
  if (rule === "more-groups") {
    const left = slotNum(slots, "g1") * slotNum(slots, "n1");
    const right = slotNum(slots, "g2") * slotNum(slots, "n2");
    if (left === right) throw new Error("The groups have the same total.");
    return left > right
      ? `${slotNum(slots, "g1")} bags of ${slotNum(slots, "n1")}`
      : `${slotNum(slots, "g2")} bags of ${slotNum(slots, "n2")}`;
  }
  if (rule.startsWith("explain-")) return explainPack(rule, slots).answer;
  throw new Error(`Unknown closed rule ${rule}.`);
}
