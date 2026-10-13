import { readFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readPrintedPage } from "@/lib/worksheets/ocr";
import { UNREADABLE_PAGE_MESSAGE } from "@/lib/worksheets/page-text";

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function whitePng(width: number, height: number): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    raw.fill(255, row + 1, row + 1 + width * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("printed page OCR", () => {
  it("reads a clear photo of a printed math worksheet", async () => {
    const photo = new Blob(
      [new Uint8Array(readFileSync(path.join(process.cwd(), "lib/worksheets/fixtures/printed-worksheet.png")))],
      { type: "image/png" },
    );
    const result = await readPrintedPage(photo, "image");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toMatch(/8\s*\+\s*5/);
    expect(result.text).toMatch(/12\s*-\s*4/);
    expect(result.text).toMatch(/6\s*x\s*3/i);
    expect(result.text).toMatch(/9\s*\+\s*7/);
    expect(result.text).toMatch(/15\s*-\s*6/);

    const blank = new Blob([new Uint8Array(whitePng(480, 200))], { type: "image/png" });
    const missed = await readPrintedPage(blank, "image");
    expect(missed).toEqual({ ok: false, message: UNREADABLE_PAGE_MESSAGE });
  }, 120_000);
});
