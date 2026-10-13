export const UNREADABLE_PAGE_MESSAGE = "Could not read the page. Try a clearer photo.";

const MIN_PAGE_CHARS = 8;

export type PageTextResult =
  | { ok: true; text: string }
  | { ok: false; message: typeof UNREADABLE_PAGE_MESSAGE };

/** Keep a printed-page reading, or ask for a clearer photo when almost nothing was read. */
export function presentPageText(raw: string): PageTextResult {
  const text = raw
    .replace(/\u000c/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.replace(/\s/g, "").length < MIN_PAGE_CHARS) {
    return { ok: false, message: UNREADABLE_PAGE_MESSAGE };
  }
  return { ok: true, text };
}
