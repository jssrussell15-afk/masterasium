import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("npx", ["vitest", "run", "lib/practice/why.test.ts"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, WHY_REPORT: "1" },
});
try {
  process.stdout.write(readFileSync("/tmp/why-report.txt", "utf8"));
} catch {
  // The report file is missing when the check did not start.
}
process.exit(result.status ?? 1);
