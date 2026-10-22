import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function collect(dir: string): string[] {
  let stats;
  try {
    stats = statSync(dir);
  } catch {
    return [];
  }
  if (!stats.isDirectory()) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...collect(full));
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

describe("practice does not call xAI", () => {
  it("keeps practice code off lib/xai and api.x.ai", () => {
    const files = ["lib/practice", "app/practice", "components"].flatMap((dir) => collect(dir));
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/lib\/xai/);
      expect(text, file).not.toMatch(/api\.x\.ai/);
    }
  });
});
