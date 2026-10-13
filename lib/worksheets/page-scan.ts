const MAX_PAGE_BYTES = 25 * 1024 * 1024;

export type PageScanKind = "image" | "pdf";

export type PageFileInfo = {
  name: string;
  type: string;
  size: number;
};

export type StoredPageScan = {
  file: File;
  kind: PageScanKind;
};

function kindFromType(type: string): PageScanKind | null {
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg" || type === "image/png") {
    return "image";
  }
  if (type === "application/pdf" || type === "application/x-pdf") return "pdf";
  return null;
}

function kindFromName(name: string): PageScanKind | null {
  if (/\.jpe?g$/i.test(name) || name.toLowerCase().endsWith(".png")) return "image";
  if (name.toLowerCase().endsWith(".pdf")) return "pdf";
  return null;
}

/** Accept a JPG, PNG, or PDF. The file itself is kept for a later reading step. */
export function classifyPageFile(file: PageFileInfo): { kind: PageScanKind } | { error: string } {
  if (file.size <= 0) return { error: "That file is empty." };
  if (file.size > MAX_PAGE_BYTES) {
    return { error: "That file is too large. Use a photo or PDF under 25 MB." };
  }
  const type = file.type.toLowerCase();
  const fromType = kindFromType(type);
  const fromName = kindFromName(file.name);
  if (fromType && fromName && fromType !== fromName) {
    return { error: "Use a JPG, PNG, or PDF." };
  }
  const kind = fromType ?? (type === "" || type === "application/octet-stream" ? fromName : null);
  if (!kind) return { error: "Use a JPG, PNG, or PDF." };
  return { kind };
}
