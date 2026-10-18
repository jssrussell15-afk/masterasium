export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, low: number, high: number): number {
  return low + Math.floor(rng() * (high - low + 1));
}

export function addBand(difficulty: 1 | 2 | 3): { min: number; max: number; floor: number } {
  if (difficulty === 1) return { min: 10, max: 99, floor: 10 };
  if (difficulty === 2) return { min: 100, max: 499, floor: 100 };
  return { min: 100, max: 999, floor: 500 };
}

export function factorBand(difficulty: 1 | 2 | 3): { min: number; max: number; floor: number } {
  if (difficulty === 1) return { min: 2, max: 5, floor: 2 };
  if (difficulty === 2) return { min: 2, max: 8, floor: 6 };
  return { min: 2, max: 10, floor: 9 };
}

export function fractionBand(difficulty: 1 | 2 | 3): { min: number; max: number; floor: number } {
  if (difficulty === 1) return { min: 2, max: 4, floor: 2 };
  if (difficulty === 2) return { min: 2, max: 8, floor: 5 };
  return { min: 2, max: 12, floor: 9 };
}
