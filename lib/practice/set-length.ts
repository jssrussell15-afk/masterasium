export const SET_LENGTHS = [10, 15, 20] as const;
export type SetLength = (typeof SET_LENGTHS)[number];

export const SET_LENGTH_LABEL = "Practice length";
export const SET_LENGTH_NOTE = "After this many minutes, practice says it is a good place to stop.";
export const PLACE_TO_STOP = "Good place to stop.";

export function setLengthMinutes(value: unknown): SetLength {
  const minutes = Number(value);
  if (minutes === 10 || minutes === 15 || minutes === 20) return minutes;
  return 15;
}

/** True once the sitting has reached the parent's length. There is no countdown. */
export function placeToStop(elapsedSeconds: number, minutes: number): boolean {
  const length = setLengthMinutes(minutes);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return false;
  return elapsedSeconds >= length * 60;
}
