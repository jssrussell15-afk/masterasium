import type { EvalGrade, EvalStrand, EvalTemplate, EvalValues } from "@/lib/eval/types";

const SHAPE = "No geometry skill in this grade. Linked to the nearest skill.";
const DATA = "No data skill in this grade. Linked to the nearest skill.";
const VOLUME = "No g5-volume skill row. Linked to g5-area.";

const PERCENT = [10, 20, 25, 50];

function item(
  id: string,
  grade: EvalGrade,
  strand: EvalStrand,
  skill: string,
  topic: string,
  prompt: string,
  slots: EvalTemplate["slots"],
  answer: (values: EvalValues) => number,
  accept?: (values: EvalValues) => boolean,
  review?: string,
  show?: (values: EvalValues) => EvalValues,
): EvalTemplate {
  return { id, grade, strand, skill, topic, prompt, slots, answer, accept, review, show };
}

const slot = (name: string, min: number, max: number) => ({ name, min, max });

export const EVAL_BANK: EvalTemplate[] = [
  item("g1-after", 1, "number", "g1-count", "Counting on", "What number comes just after {a}?", [slot("a", 1, 18)], (v) => v.a + 1),
  item("g1-before", 1, "number", "g1-count", "Counting back", "What number comes just before {a}?", [slot("a", 2, 20)], (v) => v.a - 1),
  item("g1-more", 1, "number", "g1-compare", "Comparing", "Which number is more, {a} or {b}?", [slot("a", 0, 20), slot("b", 0, 20)], (v) => Math.max(v.a, v.b), (v) => v.a !== v.b),
  item("g1-ones", 1, "number", "g1-place", "Ones", "The number {a} has how many ones?", [slot("a", 10, 19)], (v) => v.a % 10),

  item("g1-add", 1, "operations", "g1-add-10", "Adding", "What is {a} + {b}?", [slot("a", 0, 8), slot("b", 0, 8)], (v) => v.a + v.b, (v) => v.a + v.b <= 10),
  item("g1-sub", 1, "operations", "g1-sub-10", "Subtracting", "What is {a} - {b}?", [slot("a", 2, 10), slot("b", 0, 8)], (v) => v.a - v.b, (v) => v.b <= v.a),
  item("g1-share", 1, "operations", "g1-share", "Equal shares", "{a} shared by {b}. How many each?", [slot("a", 4, 10), slot("b", 2, 5)], (v) => v.a / v.b, (v) => v.b > 0 && v.a % v.b === 0),
  item("g1-miss", 1, "operations", "g1-add-10", "Missing part", "{a} + what = {b}?", [slot("a", 0, 8), slot("b", 2, 10)], (v) => v.b - v.a, (v) => v.b > v.a),

  item("g1-tri", 1, "geometry", "g1-patterns", "Triangle sides", "{a} triangles have how many sides?", [slot("a", 1, 4)], (v) => v.a * 3, undefined, SHAPE),
  item("g1-sq", 1, "geometry", "g1-patterns", "Square corners", "{a} squares have how many corners?", [slot("a", 1, 4)], (v) => v.a * 4, undefined, SHAPE),
  item("g1-rect", 1, "geometry", "g1-patterns", "Rectangle sides", "Count the sides of {a} rectangles.", [slot("a", 1, 4)], (v) => v.a * 4, undefined, SHAPE),

  item("g1-long", 1, "measurement", "g1-measure", "Length", "How much longer is {a} cm than {b} cm?", [slot("a", 3, 18), slot("b", 1, 12)], (v) => v.a - v.b, (v) => v.a > v.b),
  item("g1-join", 1, "measurement", "g1-measure", "Length in all", "A {a} cm ribbon and a {b} cm ribbon. How many cm in all?", [slot("a", 1, 10), slot("b", 1, 10)], (v) => v.a + v.b, (v) => v.a + v.b <= 20),
  item("g1-clips", 1, "measurement", "g1-measure", "Units of length", "{a} clips of {b} cm. How many cm?", [slot("a", 2, 5), slot("b", 2, 4)], (v) => v.a * v.b, (v) => v.a * v.b <= 20),
  item("g1-cut", 1, "measurement", "g1-measure", "Length left", "A string is {a} cm. You cut {b} cm. How many cm are left?", [slot("a", 6, 20), slot("b", 1, 10)], (v) => v.a - v.b, (v) => v.a > v.b),

  item("g1-pets", 1, "data", "g1-count", "Counts in all", "{a} cats and {b} dogs. How many pets?", [slot("a", 1, 10), slot("b", 1, 10)], (v) => v.a + v.b, (v) => v.a + v.b <= 20, DATA),
  item("g1-more-data", 1, "data", "g1-count", "Compare counts", "How many more is {a} than {b}?", [slot("a", 3, 18), slot("b", 1, 12)], (v) => v.a - v.b, (v) => v.a > v.b, DATA),
  item("g1-win", 1, "data", "g1-count", "Larger count", "Which count is bigger, {a} or {b}?", [slot("a", 0, 20), slot("b", 0, 20)], (v) => Math.max(v.a, v.b), (v) => v.a !== v.b, DATA),

  item("g2-tens", 2, "number", "g2-place", "Tens", "How many tens are in {a}?", [slot("a", 10, 99)], (v) => Math.floor(v.a / 10)),
  item("g2-ones", 2, "number", "g2-place", "Ones", "How many ones are in {a}?", [slot("a", 10, 99)], (v) => v.a % 10),
  item("g2-greater", 2, "number", "g2-compare", "Comparing", "Which is greater, {a} or {b}?", [slot("a", 10, 99), slot("b", 10, 99)], (v) => Math.max(v.a, v.b), (v) => v.a !== v.b),
  item("g2-half", 2, "number", "g2-fractions", "Half", "What is half of {a}?", [slot("a", 2, 20)], (v) => v.a / 2, (v) => v.a % 2 === 0),

  item("g2-add", 2, "operations", "g2-add-sub", "Adding", "What is {a} + {b}?", [slot("a", 12, 60), slot("b", 10, 40)], (v) => v.a + v.b, (v) => v.a + v.b <= 100),
  item("g2-sub", 2, "operations", "g2-add-sub", "Subtracting", "What is {a} - {b}?", [slot("a", 30, 99), slot("b", 10, 70)], (v) => v.a - v.b, (v) => v.a > v.b),
  item("g2-groups", 2, "operations", "g2-groups", "Equal groups", "{a} groups of {b}. How many in all?", [slot("a", 2, 8), slot("b", 2, 8)], (v) => v.a * v.b, (v) => v.a * v.b <= 48),
  item("g2-even", 2, "operations", "g2-even-odd", "Even numbers", "The next even number after {a} is what?", [slot("a", 2, 40)], (v) => v.a + 2, (v) => v.a % 2 === 0),

  item("g2-tri", 2, "geometry", "g2-measure", "Triangle sides", "{a} triangles have how many sides?", [slot("a", 2, 8)], (v) => v.a * 3, undefined, SHAPE),
  item("g2-sq", 2, "geometry", "g2-measure", "Square corners", "{a} squares have how many corners?", [slot("a", 2, 8)], (v) => v.a * 4, undefined, SHAPE),
  item("g2-pent", 2, "geometry", "g2-measure", "Five-sided shapes", "Count the sides of {a} pentagons.", [slot("a", 1, 6)], (v) => v.a * 5, undefined, SHAPE),

  item("g2-addcm", 2, "measurement", "g2-measure", "Length", "The rope is {a} cm. You add {b} cm. How many cm now?", [slot("a", 10, 60), slot("b", 5, 30)], (v) => v.a + v.b),
  item("g2-metres", 2, "measurement", "g2-measure", "Metres", "{a} m is how many cm?", [slot("a", 1, 3)], (v) => v.a * 100),
  item("g2-left", 2, "measurement", "g2-measure", "Length left", "The path is {a} m. You walked {b} m. How many m are left?", [slot("a", 8, 30), slot("b", 2, 20)], (v) => v.a - v.b, (v) => v.a > v.b),
  item("g2-longer", 2, "measurement", "g2-measure", "Compare length", "How many cm longer is {a} cm than {b} cm?", [slot("a", 20, 90), slot("b", 5, 70)], (v) => v.a - v.b, (v) => v.a > v.b),

  item("g2-sum", 2, "data", "g2-data", "Total count", "{a}, {b}, and {c}. How many in all?", [slot("a", 2, 20), slot("b", 2, 20), slot("c", 2, 20)], (v) => v.a + v.b + v.c),
  item("g2-more", 2, "data", "g2-data", "Compare counts", "How many more is {a} than {b}?", [slot("a", 8, 40), slot("b", 1, 30)], (v) => v.a - v.b, (v) => v.a > v.b),
  item("g2-pic", 2, "data", "g2-data", "Pictures", "Each picture is {a}. There are {b} pictures. How many?", [slot("a", 2, 5), slot("b", 2, 8)], (v) => v.a * v.b),

  item("g3-hun", 3, "number", "g3-place", "Hundreds", "How many hundreds are in {a}?", [slot("a", 100, 999)], (v) => Math.floor(v.a / 100)),
  item("g3-ten", 3, "number", "g3-place", "Tens digit", "What is the tens digit of {a}?", [slot("a", 100, 999)], (v) => Math.floor(v.a / 10) % 10),
  item("g3-top", 3, "number", "g3-fractions", "Numerator", "In {a}/{b}, what is the top number?", [slot("a", 1, 8), slot("b", 2, 12)], (v) => v.a, (v) => v.a < v.b),
  item("g3-half", 3, "number", "g3-fractions", "Half", "What is half of {a}?", [slot("a", 2, 40)], (v) => v.a / 2, (v) => v.a % 2 === 0),

  item("g3-add", 3, "operations", "g3-add-sub", "Adding", "What is {a} + {b}?", [slot("a", 120, 600), slot("b", 40, 400)], (v) => v.a + v.b, (v) => v.a + v.b <= 999),
  item("g3-sub", 3, "operations", "g3-add-sub", "Subtracting", "What is {a} - {b}?", [slot("a", 250, 900), slot("b", 40, 500)], (v) => v.a - v.b, (v) => v.a > v.b),
  item("g3-mul", 3, "operations", "g3-mult", "Multiplication", "What is {a} times {b}?", [slot("a", 2, 10), slot("b", 2, 10)], (v) => v.a * v.b),
  item("g3-div", 3, "operations", "g3-div-rem", "Equal groups", "How many groups of {b} are in {a}?", [slot("a", 12, 80), slot("b", 2, 9)], (v) => v.a / v.b, (v) => v.a % v.b === 0),
  item("g3-rem", 3, "operations", "g3-div-rem", "Left over", "{a} put into groups of {b}. How many are left over?", [slot("a", 13, 80), slot("b", 2, 9)], (v) => v.a % v.b, (v) => v.a % v.b !== 0),
  item("g3-miss", 3, "operations", "g3-add-sub", "Missing part", "{a} + what = {b}?", [slot("a", 40, 400), slot("b", 120, 800)], (v) => v.b - v.a, (v) => v.b > v.a),

  item("g3-long", 3, "geometry", "g3-perimeter", "Longer side", "A rectangle is {a} cm by {b} cm. How many cm is the long side?", [slot("a", 3, 20), slot("b", 3, 20)], (v) => Math.max(v.a, v.b), (v) => v.a !== v.b, SHAPE),
  item("g3-tri", 3, "geometry", "g3-perimeter", "Triangle corners", "{a} triangles have how many corners?", [slot("a", 2, 8)], (v) => v.a * 3, undefined, SHAPE),
  item("g3-sq", 3, "geometry", "g3-perimeter", "Square sides", "How many sides do {a} squares have in all?", [slot("a", 2, 8)], (v) => v.a * 4, undefined, SHAPE),

  item("g3-per", 3, "measurement", "g3-perimeter", "Perimeter", "A rectangle is {a} cm by {b} cm. What is the perimeter in cm?", [slot("a", 3, 24), slot("b", 2, 18)], (v) => 2 * (v.a + v.b)),
  item("g3-hours", 3, "measurement", "g3-time", "Hours", "{a} hours and {b} more hours. How many hours?", [slot("a", 1, 8), slot("b", 1, 6)], (v) => v.a + v.b, (v) => v.a + v.b <= 12),
  item("g3-min", 3, "measurement", "g3-time", "Minutes", "{a} hours is how many minutes?", [slot("a", 1, 4)], (v) => v.a * 60),

  item("g3-bars", 3, "data", "g3-data", "Bar total", "The bars are {a}, {b}, and {c}. What is the total?", [slot("a", 2, 16), slot("b", 2, 16), slot("c", 2, 16)], (v) => v.a + v.b + v.c),
  item("g3-taller", 3, "data", "g3-data", "Taller bar", "How many more is {a} than {b}?", [slot("a", 6, 24), slot("b", 1, 16)], (v) => v.a - v.b, (v) => v.a > v.b),
  item("g3-scale", 3, "data", "g3-data", "Picture scale", "Each picture stands for {a}. You see {b} pictures. How many?", [slot("a", 2, 5), slot("b", 2, 8)], (v) => v.a * v.b),
  item("g3-mean", 3, "data", "g3-data", "Mean", "What is the mean of {a}, {b}, and {c}?", [slot("a", 2, 12), slot("b", 2, 12), slot("c", 2, 12)], (v) => (v.a + v.b + v.c) / 3, (v) => (v.a + v.b + v.c) % 3 === 0),

  item("g4-thou", 4, "number", "g4-place", "Thousands", "How many thousands are in {a}?", [slot("a", 1000, 9999)], (v) => Math.floor(v.a / 1000)),
  item("g4-round", 4, "number", "g4-round", "Nearest ten", "Round {a} to the nearest ten.", [slot("a", 21, 180)], (v) => Math.round(v.a / 10) * 10, (v) => v.a % 10 !== 5),
  item("g4-tenths", 4, "number", "g4-decimals", "Tenths", "{a} tenths plus {b} tenths. How many tenths?", [slot("a", 1, 15), slot("b", 1, 15)], (v) => v.a + v.b, (v) => v.a + v.b <= 30),
  item("g4-half", 4, "number", "g4-equiv", "Half of the parts", "{a} equal parts. Half of them is how many?", [slot("a", 4, 12)], (v) => v.a / 2, (v) => v.a % 2 === 0),

  item("g4-mul", 4, "operations", "g4-mult", "Multiplying", "What is {a} times {b}?", [slot("a", 12, 30), slot("b", 2, 9)], (v) => v.a * v.b),
  item("g4-div", 4, "operations", "g4-div", "Dividing", "How many groups of {b} are in {a}?", [slot("a", 20, 96), slot("b", 2, 9)], (v) => v.a / v.b, (v) => v.a % v.b === 0),
  item("g4-fact", 4, "operations", "g4-facts-10x10", "Facts", "What is {a} times {b}?", [slot("a", 2, 10), slot("b", 2, 10)], (v) => v.a * v.b),
  item("g4-unit", 4, "operations", "repeated-addition-of-unit-fractions", "Unit parts", "In {a}/{b}, how many unit parts are counted?", [slot("a", 1, 8), slot("b", 2, 12)], (v) => v.a, (v) => v.a < v.b),

  item("g4-tri", 4, "geometry", "g4-area", "Triangle sides", "{a} triangles have how many sides?", [slot("a", 2, 9)], (v) => v.a * 3, undefined, SHAPE),
  item("g4-sq", 4, "geometry", "g4-area", "Square corners", "{a} squares have how many corners?", [slot("a", 2, 9)], (v) => v.a * 4, undefined, SHAPE),
  item("g4-rect", 4, "geometry", "g4-area", "Rectangle sides", "Count the sides of {a} rectangles.", [slot("a", 2, 8)], (v) => v.a * 4, undefined, SHAPE),

  item("g4-area", 4, "measurement", "g4-area", "Area", "A rectangle is {a} cm by {b} cm. What is the area?", [slot("a", 3, 20), slot("b", 2, 12)], (v) => v.a * v.b),
  item("g4-side", 4, "measurement", "g4-area", "Missing side", "The area is {a} and the width is {b}. What is the length?", [slot("a", 12, 80), slot("b", 2, 10)], (v) => v.a / v.b, (v) => v.a % v.b === 0 && v.a / v.b <= 40),
  item("g4-peri", 4, "measurement", "g4-area", "Square perimeter", "A square side is {a} cm. What is the perimeter?", [slot("a", 3, 20)], (v) => v.a * 4),
  item("g4-double", 4, "measurement", "g4-area", "Double a side", "A side is {a} cm. Double it. How many cm?", [slot("a", 4, 40)], (v) => v.a * 2),

  item("g4-sum", 4, "data", "g4-place", "Total count", "{a}, {b}, and {c}. How many in all?", [slot("a", 4, 30), slot("b", 4, 30), slot("c", 4, 30)], (v) => v.a + v.b + v.c, undefined, DATA),
  item("g4-more", 4, "data", "g4-place", "Compare counts", "How many more is {a} than {b}?", [slot("a", 12, 60), slot("b", 2, 40)], (v) => v.a - v.b, (v) => v.a > v.b, DATA),
  item("g4-pic", 4, "data", "g4-place", "Picture scale", "Each picture is {a}. There are {b} pictures. How many?", [slot("a", 2, 10), slot("b", 2, 8)], (v) => v.a * v.b, undefined, DATA),

  item("g5-groups", 5, "number", "g5-place", "Ten thousands", "How many groups of 10000 are in {a}?", [slot("a", 10000, 99999)], (v) => Math.floor(v.a / 10000)),
  item("g5-digit", 5, "number", "g5-place", "Hundreds digit", "What is the hundreds digit of {a}?", [slot("a", 1000, 99999)], (v) => Math.floor(v.a / 100) % 10),
  item("g5-tenths", 5, "number", "g5-decimals", "Tenths", "{a} tenths plus {b} tenths. How many tenths?", [slot("a", 2, 40), slot("b", 2, 40)], (v) => v.a + v.b, (v) => v.a + v.b <= 80),
  item("g5-top", 5, "number", "g5-frac", "Numerator", "In {a}/{b}, what is the top number?", [slot("a", 1, 10), slot("b", 2, 12)], (v) => v.a, (v) => v.a < v.b),

  item("g5-mul", 5, "operations", "g5-mult", "Facts", "What is {a} times {b}?", [slot("a", 2, 12), slot("b", 2, 12)], (v) => v.a * v.b),
  item("g5-rem", 5, "operations", "g5-div-rem", "Left over", "{a} put into groups of {b}. How many are left over?", [slot("a", 40, 200), slot("b", 6, 18)], (v) => v.a % v.b, (v) => v.a % v.b !== 0),
  item("g5-eq", 5, "operations", "g5-equations", "Equation", "{a} + n = {b}. What is n?", [slot("a", 3, 40), slot("b", 10, 90)], (v) => v.b - v.a, (v) => v.b > v.a),
  item("g5-div", 5, "operations", "g5-div-rem", "Equal groups", "How many groups of {b} are in {a}?", [slot("a", 24, 144), slot("b", 2, 12)], (v) => v.a / v.b, (v) => v.a % v.b === 0),

  item("g5-tri", 5, "geometry", "g5-area", "Triangle sides", "{a} triangles have how many sides?", [slot("a", 2, 10)], (v) => v.a * 3, undefined, SHAPE),
  item("g5-sq", 5, "geometry", "g5-area", "Square corners", "{a} squares have how many corners?", [slot("a", 2, 10)], (v) => v.a * 4, undefined, SHAPE),
  item("g5-rect", 5, "geometry", "g5-area", "Rectangle sides", "Count the sides of {a} rectangles.", [slot("a", 2, 9)], (v) => v.a * 4, undefined, SHAPE),

  item("g5-triarea", 5, "measurement", "g5-area", "Triangle area", "A triangle has base {a} and height {b}. What is the area?", [slot("a", 4, 20), slot("b", 2, 16)], (v) => (v.a * v.b) / 2, (v) => (v.a * v.b) % 2 === 0),
  item("g5-rectarea", 5, "measurement", "g5-area", "Rectangle area", "A rectangle is {a} cm by {b} cm. What is the area?", [slot("a", 6, 30), slot("b", 4, 18)], (v) => v.a * v.b),
  item("g5-volume", 5, "measurement", "g5-area", "Cubes in a box", "A box is {a} by {b} by {c} cubes. How many cubes?", [slot("a", 2, 6), slot("b", 2, 6), slot("c", 2, 6)], (v) => v.a * v.b * v.c, undefined, VOLUME),
  item("g5-peri", 5, "measurement", "g5-area", "Perimeter", "A rectangle is {a} cm by {b} cm. What is the perimeter in cm?", [slot("a", 5, 30), slot("b", 3, 20)], (v) => 2 * (v.a + v.b)),

  item("g5-sum", 5, "data", "g5-place", "Total count", "{a}, {b}, and {c}. How many in all?", [slot("a", 8, 40), slot("b", 8, 40), slot("c", 8, 40)], (v) => v.a + v.b + v.c, undefined, DATA),
  item("g5-more", 5, "data", "g5-place", "Compare counts", "How many more is {a} than {b}?", [slot("a", 20, 80), slot("b", 4, 50)], (v) => v.a - v.b, (v) => v.a > v.b, DATA),
  item("g5-pic", 5, "data", "g5-place", "Picture scale", "Each picture is {a}. There are {b} pictures. How many?", [slot("a", 2, 12), slot("b", 2, 8)], (v) => v.a * v.b, undefined, DATA),

  item("g6-tenths", 6, "number", "g6-decimals", "Tenths", "{a} tenths plus {b} tenths. How many tenths?", [slot("a", 3, 50), slot("b", 3, 50)], (v) => v.a + v.b, (v) => v.a + v.b <= 90),
  item("g6-ratio", 6, "number", "g6-ratios", "Ratio", "For every {a} red there are {b} blue. There are {c} groups. How many blue?", [slot("a", 2, 6), slot("b", 2, 8), slot("c", 2, 6)], (v) => v.b * v.c),
  item(
    "g6-pct",
    6,
    "number",
    "g6-percent",
    "Percent",
    "What is {p} percent of {n}?",
    [slot("p", 0, 3), slot("n", 8, 80)],
    (v) => (v.n * PERCENT[v.p]) / 100,
    (v) => (v.n * PERCENT[v.p]) % 100 === 0,
    undefined,
    (v) => ({ ...v, p: PERCENT[v.p] }),
  ),
  item("g6-part", 6, "number", "g6-frac", "Fraction of a number", "What is 1/{b} of {a}?", [slot("a", 12, 72), slot("b", 2, 8)], (v) => v.a / v.b, (v) => v.a % v.b === 0),

  item("g6-add-eq", 6, "operations", "g6-equations", "Equation", "n + {a} = {b}. What is n?", [slot("a", 4, 40), slot("b", 12, 90)], (v) => v.b - v.a, (v) => v.b > v.a),
  item("g6-sub-eq", 6, "operations", "g6-equations", "Equation", "n - {a} = {b}. What is n?", [slot("a", 2, 30), slot("b", 4, 50)], (v) => v.a + v.b),
  item("g6-frac", 6, "operations", "g6-frac", "Fraction of a set", "What is {a}/{b} of {c}?", [slot("a", 1, 5), slot("b", 2, 8), slot("c", 12, 64)], (v) => (v.a * v.c) / v.b, (v) => v.a < v.b && v.c % v.b === 0),
  item("g6-groups", 6, "operations", "g6-equations", "Equal groups", "How many groups of {b} are in {a}?", [slot("a", 24, 120), slot("b", 3, 12)], (v) => v.a / v.b, (v) => v.a % v.b === 0),

  item("g6-tri", 6, "geometry", "g6-area", "Triangle sides", "{a} triangles have how many sides?", [slot("a", 2, 10)], (v) => v.a * 3, undefined, SHAPE),
  item("g6-sq", 6, "geometry", "g6-area", "Square corners", "{a} squares have how many corners?", [slot("a", 2, 10)], (v) => v.a * 4, undefined, SHAPE),
  item("g6-rect", 6, "geometry", "g6-area", "Rectangle sides", "Count the sides of {a} rectangles.", [slot("a", 2, 9)], (v) => v.a * 4, undefined, SHAPE),

  item("g6-triarea", 6, "measurement", "g6-area", "Triangle area", "A triangle has base {a} and height {b}. What is the area?", [slot("a", 4, 24), slot("b", 2, 18)], (v) => (v.a * v.b) / 2, (v) => (v.a * v.b) % 2 === 0),
  item("g6-rectarea", 6, "measurement", "g6-area", "Rectangle area", "A rectangle is {a} cm by {b} cm. What is the area?", [slot("a", 6, 30), slot("b", 4, 16)], (v) => v.a * v.b),
  item("g6-face", 6, "measurement", "g6-surface", "One face", "A cube side is {a}. What is the area of one face?", [slot("a", 2, 12)], (v) => v.a * v.a),
  item("g6-surface", 6, "measurement", "g6-surface", "Surface", "A prism has 3 pairs of faces. Each pair has area {a}. What is the surface area?", [slot("a", 6, 40)], (v) => v.a * 3),

  item("g6-mean", 6, "data", "g6-data", "Mean", "What is the mean of {a}, {b}, and {c}?", [slot("a", 2, 18), slot("b", 2, 18), slot("c", 2, 18)], (v) => (v.a + v.b + v.c) / 3, (v) => (v.a + v.b + v.c) % 3 === 0),
  item("g6-median", 6, "data", "g6-data", "Median", "What is the median of {a}, {b}, and {c}?", [slot("a", 1, 20), slot("b", 1, 20), slot("c", 1, 20)], (v) => [v.a, v.b, v.c].sort((x, y) => x - y)[1]),
  item("g6-range", 6, "data", "g6-data", "Range", "From {a} up to {b}, what is the gap?", [slot("a", 2, 30), slot("b", 10, 60)], (v) => v.b - v.a, (v) => v.b > v.a),
];

const EXPECTED: Record<EvalGrade, number> = { 1: 18, 2: 18, 3: 20, 4: 18, 5: 18, 6: 18 };

export function templatesForGrade(grade: EvalGrade): EvalTemplate[] {
  return EVAL_BANK.filter((item) => item.grade === grade);
}

export function countByGrade(): Record<EvalGrade, number> {
  return {
    1: templatesForGrade(1).length,
    2: templatesForGrade(2).length,
    3: templatesForGrade(3).length,
    4: templatesForGrade(4).length,
    5: templatesForGrade(5).length,
    6: templatesForGrade(6).length,
  };
}

if (EVAL_BANK.length !== 110) {
  throw new Error(`Expected 110 eval templates, found ${EVAL_BANK.length}.`);
}
for (const grade of [1, 2, 3, 4, 5, 6] as const) {
  if (templatesForGrade(grade).length !== EXPECTED[grade]) {
    throw new Error(`Grade ${grade} has ${templatesForGrade(grade).length} templates.`);
  }
}
