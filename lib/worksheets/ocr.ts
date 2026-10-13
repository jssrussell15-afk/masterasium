import { presentPageText, UNREADABLE_PAGE_MESSAGE, type PageTextResult } from "@/lib/worksheets/page-text";
import type { PageScanKind } from "@/lib/worksheets/page-scan";

type OcrWorker = {
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  recognize: (
    image: Blob | HTMLCanvasElement | Buffer | Uint8Array,
    options?: object,
    output?: { text?: boolean },
  ) => Promise<{ data: { text?: string } }>;
  terminate: () => Promise<unknown>;
};

type OcrEngine = {
  createWorker: (langs?: string, oem?: number) => Promise<OcrWorker>;
  OEM: { LSTM_ONLY: number };
  PSM: { AUTO: string };
};

/** Read printed text from a photo or the first page of a PDF. Handwriting is not supported. */
export async function readPrintedPage(file: Blob, kind: PageScanKind): Promise<PageTextResult> {
  try {
    const image = kind === "pdf" ? await renderPdfFirstPage(file) : file;
    const raw = await recognizePrinted(image);
    return presentPageText(raw);
  } catch (error) {
    console.error(error);
    return { ok: false, message: UNREADABLE_PAGE_MESSAGE };
  }
}

async function loadTesseract(): Promise<OcrEngine> {
  const loaded = (await import("tesseract.js")) as OcrEngine & { default?: OcrEngine };
  if (typeof loaded.createWorker === "function") return loaded;
  if (loaded.default && typeof loaded.default.createWorker === "function") return loaded.default;
  throw new Error("Could not load OCR.");
}

function isCanvas(image: Blob | HTMLCanvasElement): image is HTMLCanvasElement {
  return typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement;
}

async function recognizePrinted(image: Blob | HTMLCanvasElement): Promise<string> {
  const source = isCanvas(image) ? image : new Uint8Array(await image.arrayBuffer());
  const tesseract = await loadTesseract();
  const worker = await tesseract.createWorker("eng", tesseract.OEM.LSTM_ONLY);
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: tesseract.PSM.AUTO,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });
    const result = await worker.recognize(source, {}, { text: true });
    return result.data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

async function renderPdfFirstPage(file: Blob): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, disableAutoFetch: true });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 2000 / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the PDF page.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, viewport, background: "#ffffff" }).promise;
    return canvas;
  } finally {
    await doc.cleanup();
    await task.destroy();
  }
}
