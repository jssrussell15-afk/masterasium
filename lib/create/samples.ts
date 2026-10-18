import type { ChipBag, FixChip, ProjectType } from "@/lib/create/types";

export type SampleAsset = {
  id: string;
  src: string;
  label: string;
};

export const SPARK_BANK = [
  "river",
  "market",
  "library",
  "train",
  "garden",
  "lighthouse",
  "bakery",
  "kite",
  "bridge",
  "cave",
  "snow",
  "orchard",
] as const;

export const CHARACTERS = [
  { id: "pip", label: "Pip" },
  { id: "moss", label: "Moss" },
  { id: "lumen", label: "Lumen" },
] as const;

export const SETTINGS = [
  { id: "meadow", label: "Meadow" },
  { id: "harbour", label: "Harbour" },
  { id: "kitchen", label: "Kitchen" },
] as const;

const SPARK_LABEL: Record<(typeof SPARK_BANK)[number], string> = {
  river: "A quiet river",
  market: "A small market",
  library: "A sunny library",
  train: "A slow train",
  garden: "A vegetable garden",
  lighthouse: "A lighthouse",
  bakery: "A warm bakery",
  kite: "A kite day",
  bridge: "A stone bridge",
  cave: "A gentle cave",
  snow: "First snow",
  orchard: "An apple orchard",
};

function asset(id: string, label: string): SampleAsset {
  return { id: `sample-${id}`, src: `/create-samples/${id}.svg`, label };
}

export function sparkSet(refresh: number): SampleAsset[] {
  const start = (Math.max(0, refresh) % 4) * 3;
  return SPARK_BANK.slice(start, start + 3).map((id) => asset(`spark-${id}`, SPARK_LABEL[id]));
}

function characterLook(fixes: string[], chips: ChipBag): string {
  if (fixes.includes("night")) return "night";
  if (fixes.includes("friend")) return "friend";
  if (chips.size === "big") return "big";
  if (chips.size === "small") return "small";
  return chips.colour;
}

export function characterCards(regen: number, chips: ChipBag, fixes: FixChip[] = []): SampleAsset[] {
  const variant = characterLook(fixes, chips);
  const shift = regen > 0 ? 1 : 0;
  return [0, 1, 2].map((index) => {
    const person = CHARACTERS[(index + shift) % CHARACTERS.length];
    return asset(`character-${person.id}-${variant}`, person.label);
  });
}

export function settingCards(regen: number, fixes: FixChip[] = []): SampleAsset[] {
  const variant = fixes.includes("night") ? "night" : fixes.includes("friend") ? "friend" : "day";
  const shift = regen > 0 ? 1 : 0;
  return [0, 1, 2].map((index) => {
    const place = SETTINGS[(index + shift) % SETTINGS.length];
    return asset(`setting-${place.id}-${variant}`, place.label);
  });
}

export function pageArt(input: {
  project: ProjectType;
  page: number;
  retry: number;
  fixes: FixChip[];
}): SampleAsset {
  const pageNumber = Math.min(4, Math.max(1, input.page));
  const variant = input.fixes.includes("night")
    ? "night"
    : input.fixes.includes("friend")
      ? "friend"
      : input.retry % 2 === 1
        ? "friend"
        : "day";
  const id = `${input.project}-${pageNumber}-${variant}`;
  return asset(id, `${input.project} ${pageNumber}`);
}

export function sentenceBank(project: ProjectType, page: number): { id: string; text: string }[] {
  const banks: Record<ProjectType, string[][]> = {
    story: [
      ["Pip walks to the meadow.", "Moss looks for a snack.", "Lumen waits by the water."],
      ["A friend waves from the path.", "The wind lifts a red kite.", "They find a round stone."],
      ["The sky turns gold.", "They share a warm bun.", "A boat rests in the harbour."],
      ["Everyone sits for a quiet end.", "The star scarf glows softly.", "Home is just past the bridge."],
    ],
    comic: [
      ["Pip trips on a sunny path.", "Moss holds a big map.", "Lumen points to the hills."],
      ["They spot a little boat.", "The map flaps in the wind.", "A friend runs to help."],
      ["They laugh at the mix-up.", "The boat is for a picnic.", "Home is the kitchen table."],
    ],
    moving: [
      ["Pip takes one small step.", "Moss sways in the grass.", "Lumen blinks at the sun."],
      ["A kite string pulls up.", "The grass bends over.", "A hat almost flies off."],
      ["The kite dips down.", "Moss reaches up high.", "Lumen jumps once."],
      ["The kite settles down.", "They sit in the meadow.", "The day goes quiet."],
    ],
  };
  const lines = banks[project][page - 1] ?? banks[project][0];
  return lines.map((text, index) => ({ id: `${project}-${page}-${index}`, text }));
}
