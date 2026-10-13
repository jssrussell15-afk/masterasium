import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import type { WorksheetHeader } from "@/lib/worksheets/types";

const INK = rgb(0.09, 0.2, 0.3);
const MUTED = rgb(0.31, 0.43, 0.52);
const LINE = rgb(0.77, 0.87, 0.93);
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;

export type PdfQuestion = {
  prompt: string;
  answer?: string;
  steps?: string[];
};

function pdfSafe(text: string): string {
  return text
    .replaceAll("−", "-")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("×", "x")
    .replaceAll("÷", "/")
    .replaceAll("π", "pi")
    .replaceAll("²", "2")
    .replaceAll("³", "3")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function dataUrlParts(dataUrl: string): { bytes: Uint8Array; kind: "png" | "jpg" } | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const binary = atob(match[2] ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes, kind: match[1] === "png" ? "png" : "jpg" };
}

async function embedLogo(doc: PDFDocument, logoData: string | null): Promise<PDFImage | null> {
  if (!logoData) return null;
  const parts = dataUrlParts(logoData);
  if (!parts) return null;
  try {
    return parts.kind === "png" ? await doc.embedPng(parts.bytes) : await doc.embedJpg(parts.bytes);
  } catch {
    return null;
  }
}

type DrawState = {
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
};

function newPage(doc: PDFDocument, font: PDFFont, bold: PDFFont): DrawState {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { page, y: PAGE_HEIGHT - MARGIN, font, bold };
}

function ensureSpace(doc: PDFDocument, state: DrawState, needed: number): DrawState {
  if (state.y - needed >= MARGIN) return state;
  return newPage(doc, state.font, state.bold);
}

export async function buildWorksheetPdf(input: {
  title: string;
  instructions: string;
  subtitle?: string | null;
  gradeLabel?: string | null;
  logoData?: string | null;
  header: WorksheetHeader;
  items: PdfQuestion[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(doc, input.logoData ?? null);
  let state = newPage(doc, font, bold);
  const width = PAGE_WIDTH - MARGIN * 2;

  if (logo) {
    const scale = Math.min(72 / logo.width, 36 / logo.height, 1);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    state.page.drawImage(logo, {
      x: MARGIN,
      y: state.y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    state.y -= logoHeight + 12;
  }

  if (input.header.showScore) {
    state.page.drawRectangle({
      x: PAGE_WIDTH - MARGIN - 88,
      y: PAGE_HEIGHT - MARGIN - 28,
      width: 88,
      height: 32,
      borderColor: LINE,
      borderWidth: 1,
    });
    state.page.drawText("Score", {
      x: PAGE_WIDTH - MARGIN - 78,
      y: PAGE_HEIGHT - MARGIN - 14,
      size: 9,
      font,
      color: MUTED,
    });
  }

  const titleLines = wrap(input.title || "Math practice", bold, 18, width);
  for (const line of titleLines) {
    state.page.drawText(line, { x: MARGIN, y: state.y - 18, size: 18, font: bold, color: INK });
    state.y -= 22;
  }
  if (input.subtitle) {
    state.y -= 2;
    state.page.drawText(pdfSafe(input.subtitle), { x: MARGIN, y: state.y - 12, size: 11, font, color: MUTED });
    state.y -= 16;
  }

  const blanks: string[] = [];
  if (input.header.showName) blanks.push("Name ____________________");
  if (input.header.showDate) blanks.push("Date ______________");
  if (input.header.showGrade) blanks.push(input.gradeLabel ? `Grade ${pdfSafe(input.gradeLabel)}` : "Grade ________");
  if (blanks.length > 0) {
    state.y -= 8;
    state.page.drawText(blanks.join("    "), { x: MARGIN, y: state.y - 12, size: 11, font, color: INK });
    state.y -= 18;
  }

  if (input.instructions.trim()) {
    state.y -= 6;
    for (const line of wrap(input.instructions, font, 11, width)) {
      state = ensureSpace(doc, state, 16);
      state.page.drawText(line, { x: MARGIN, y: state.y - 12, size: 11, font, color: MUTED });
      state.y -= 14;
    }
  }

  state.y -= 10;
  input.items.forEach((item, index) => {
    const lines = wrap(`${index + 1}.  ${item.prompt}`, font, 12, width);
    state = ensureSpace(doc, state, lines.length * 16 + 28);
    for (const line of lines) {
      state.page.drawText(line, { x: MARGIN, y: state.y - 14, size: 12, font, color: INK });
      state.y -= 16;
    }
    state.y -= 6;
    state.page.drawLine({
      start: { x: MARGIN + 18, y: state.y },
      end: { x: PAGE_WIDTH - MARGIN, y: state.y },
      thickness: 0.6,
      color: LINE,
    });
    state.y -= 18;
  });

  return doc.save();
}

export async function buildAnswerSheetPdf(input: {
  title: string;
  items: PdfQuestion[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let state = newPage(doc, font, bold);
  const width = PAGE_WIDTH - MARGIN * 2;

  state.page.drawText(pdfSafe(input.title || "Math practice"), {
    x: MARGIN,
    y: state.y - 18,
    size: 18,
    font: bold,
    color: INK,
  });
  state.y -= 24;
  state.page.drawText("Answer sheet", { x: MARGIN, y: state.y - 12, size: 12, font, color: MUTED });
  state.y -= 28;

  input.items.forEach((item, index) => {
    const answer = item.answer ?? "";
    const lines = wrap(`${index + 1}.  ${answer}`, bold, 12, width);
    const stepLines = (item.steps ?? []).flatMap((step) => wrap(step, font, 10, width - 16));
    state = ensureSpace(doc, state, lines.length * 16 + stepLines.length * 13 + 12);
    for (const line of lines) {
      state.page.drawText(line, { x: MARGIN, y: state.y - 14, size: 12, font: bold, color: INK });
      state.y -= 16;
    }
    for (const line of stepLines) {
      state.page.drawText(line, { x: MARGIN + 16, y: state.y - 12, size: 10, font, color: MUTED });
      state.y -= 13;
    }
    state.y -= 8;
  });

  return doc.save();
}
