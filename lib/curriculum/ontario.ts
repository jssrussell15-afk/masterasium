import type { SupportedGrade } from "@/lib/grades";

export type StrandId = "number" | "operations" | "geometry" | "measurement" | "data";

export const STRANDS: { id: StrandId; label: string }[] = [
  { id: "number", label: "Number sense" },
  { id: "operations", label: "Operations" },
  { id: "geometry", label: "Geometry" },
  { id: "measurement", label: "Measurement" },
  { id: "data", label: "Data" },
];

/** One sentence each. The page shows this line, not the longer practice summary. */
const LINES: Record<string, { strand: StrandId; line: string }> = {
  "g1-count": { strand: "number", line: "Say the number just before or just after a number up to 20." },
  "g1-compare": { strand: "number", line: "Name the greater of two numbers up to 20." },
  "g1-place": { strand: "number", line: "Read a two-digit number as tens and ones." },
  "g1-patterns": { strand: "number", line: "Find the equal step in a simple pattern and extend it once." },
  "g1-add-10": { strand: "operations", line: "Add two numbers whose sum is 10 or less." },
  "g1-sub-10": { strand: "operations", line: "Subtract from a number up to 10 by counting back." },
  "g1-share": { strand: "operations", line: "Share a set into equal groups with none left over." },
  "g1-measure": {
    strand: "measurement",
    line: "Compare lengths by counting same-sized units such as paperclips.",
  },

  "g2-place": { strand: "number", line: "Read numbers up to 100 as tens and ones." },
  "g2-compare": { strand: "number", line: "Order numbers to 100 by comparing tens, then ones." },
  "g2-fractions": { strand: "number", line: "Name equal parts of one whole with a fraction." },
  "g2-even-odd": {
    strand: "number",
    line: "Tell whether a number splits into two equal groups or has one left over.",
  },
  "g2-add-sub": {
    strand: "operations",
    line: "Add and subtract numbers up to 100, regrouping when a column needs it.",
  },
  "g2-groups": { strand: "operations", line: "Find how many in all when every group has the same number." },
  "g2-measure": {
    strand: "measurement",
    line: "Measure length in centimetres and find what is left when part is removed.",
  },
  "g2-data": { strand: "data", line: "Read a tally or pictograph and compare the counts." },

  "g3-fractions": {
    strand: "number",
    line: "Use the denominator for the equal parts and the numerator for how many are chosen.",
  },
  "g3-place": {
    strand: "number",
    line: "Give each digit in a number up to 1,000 its hundreds, tens, or ones value.",
  },
  "g3-mult": { strand: "operations", line: "Recall multiplication facts through 10 × 10." },
  "g3-div-rem": { strand: "operations", line: "Divide into full groups and record what is left over." },
  "g3-add-sub": { strand: "operations", line: "Add and subtract numbers up to 1,000 one place at a time." },
  "g3-perimeter": { strand: "measurement", line: "Find the distance around a rectangle." },
  "g3-time": { strand: "measurement", line: "Read the time to the minute and count forward by minutes." },
  "g3-data": { strand: "data", line: "Read a bar graph and add or compare the counts." },

  "g4-equiv": {
    strand: "number",
    line: "Build an equivalent fraction by multiplying the top and bottom by the same number.",
  },
  "g4-place": { strand: "number", line: "Find a digit's value in numbers up to 10,000." },
  "g4-round": { strand: "number", line: "Round a number by looking at the digit just to the right." },
  "g4-decimals": { strand: "number", line: "Read tenths written with a decimal point." },
  "g4-mult": { strand: "operations", line: "Multiply a two-digit number by breaking it into tens and ones." },
  "g4-div": { strand: "operations", line: "Divide by a one-digit number and subtract to see what is left." },
  "g4-frac": { strand: "operations", line: "Add or subtract fractions that share a denominator." },
  "g4-area": { strand: "measurement", line: "Find the area of a rectangle in square units." },

  "g5-place": { strand: "number", line: "Read a digit's value in numbers up to 100,000." },
  "g5-decimals": { strand: "number", line: "Add and subtract decimals to hundredths with the points lined up." },
  "g5-mult": { strand: "operations", line: "Recall multiplication facts through 12 × 12." },
  "g5-div-rem": {
    strand: "operations",
    line: "Divide into equal groups and keep the remainder smaller than the divisor.",
  },
  "g5-frac": { strand: "operations", line: "Add or subtract fractions that share a denominator." },
  "g5-equations": {
    strand: "operations",
    line: "Solve a one-step equation by doing the same thing to both sides.",
  },
  "g5-area": { strand: "measurement", line: "Find the area of a triangle or a parallelogram." },
  "g5-volume": { strand: "measurement", line: "Find the volume of a rectangular prism." },

  "g6-decimals": { strand: "number", line: "Add decimals to thousandths with the points lined up." },
  "g6-ratios": { strand: "number", line: "Compare two amounts and scale a ratio to a unit rate." },
  "g6-percent": { strand: "number", line: "Find a percent of a number." },
  "g6-frac": { strand: "operations", line: "Multiply fractions, or divide by multiplying by the reciprocal." },
  "g6-equations": { strand: "operations", line: "Solve a one-step equation that includes a decimal." },
  "g6-area": { strand: "measurement", line: "Find triangle and parallelogram area from a base and its height." },
  "g6-surface": { strand: "measurement", line: "Find the surface area of a rectangular prism." },
  "g6-data": { strand: "data", line: "Find the mean, median, and mode of a small set of numbers." },

  "g7-integers": {
    strand: "operations",
    line: "Add, subtract, and multiply integers, including numbers below zero.",
  },
  "g7-equations": {
    strand: "operations",
    line: "Solve a two-step equation by undoing the added term, then the multiplication.",
  },
  "g7-proportion": { strand: "operations", line: "Scale both amounts in a proportion by the same factor." },
  "g7-percent": { strand: "operations", line: "Find a percent of a price, including a discount." },
  "g7-order": { strand: "operations", line: "Follow order of operations when a question mixes integers." },
  "g7-circles": { strand: "geometry", line: "Find the circumference and area of a circle." },
  "g7-volume": { strand: "measurement", line: "Find the volume of a rectangular prism or a cylinder." },
  "g7-probability": {
    strand: "data",
    line: "Write probability as favourable outcomes over all equally likely outcomes.",
  },

  "g8-interest": { strand: "number", line: "Calculate simple interest from principal, rate, and time." },
  "g8-equations": { strand: "operations", line: "Solve a multi-step equation while keeping both sides equal." },
  "g8-linear": { strand: "operations", line: "Find a y-value in a linear relation of the form y = mx + b." },
  "g8-integers": { strand: "operations", line: "Multiply and divide integers using the signs of the factors." },
  "g8-pythagoras": {
    strand: "geometry",
    line: "Use the Pythagorean theorem to find a missing side of a right triangle.",
  },
  "g8-volume": { strand: "measurement", line: "Find the volume of a prism or a cylinder." },
  "g8-surface": { strand: "measurement", line: "Find the surface area of a cylinder." },
  "g8-data": { strand: "data", line: "Find the range and the mean of a data set." },
};

export const GRADE_INTROS: Record<SupportedGrade, string> = {
  1: "Grade 1 covers counting to 20, addition and subtraction within 10, and length measured with everyday units.",
  2: "Grade 2 covers numbers to 100, equal groups, simple fractions, and reading a small set of data.",
  3: "Grade 3 covers multiplication facts, numbers to 1,000, perimeter, time, and bar graphs.",
  4: "Grade 4 covers multi-digit multiplication, like fractions, rounding, and the area of rectangles.",
  5: "Grade 5 covers larger whole numbers, one-step equations, decimals to hundredths, and area and volume.",
  6: "Grade 6 covers fraction operations, ratios, percent, and the surface area of prisms.",
  7: "Grade 7 covers integers, two-step equations, circles, volume, and probability.",
  8: "Grade 8 covers multi-step equations, linear relations, the Pythagorean theorem, and simple interest.",
};

export function ontarioLine(skillId: string): { strand: StrandId; line: string } | undefined {
  return LINES[skillId];
}

export function ontarioSkillIds(): string[] {
  return Object.keys(LINES);
}
