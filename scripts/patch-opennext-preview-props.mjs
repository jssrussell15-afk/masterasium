import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

// Next.js 16.4 loads .next/server/preview-props.json when the server starts.
// @opennextjs/cloudflare 1.20.x only inlines files matching *-manifest.json,
// so the Worker throws "Unexpected loadManifest(/.next/server/preview-props.json)".
// Upstream fix: https://github.com/opennextjs/opennextjs-cloudflare/pull/1356
const target =
  "node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js";
const missing = "required-server-files,prefetch-hints}";
const patched = "required-server-files,prefetch-hints,preview-props}";

if (!existsSync(target)) {
  console.log("OpenNext preview-props patch skipped: package is not installed.");
  process.exit(0);
}

const source = await readFile(target, "utf8");
if (source.includes(patched)) {
  console.log("OpenNext preview-props patch already applied.");
  process.exit(0);
}
if (!source.includes(missing)) {
  console.log("OpenNext preview-props patch skipped: load-manifest.js did not match.");
  process.exit(0);
}

await writeFile(target, source.replace(missing, patched));
console.log("Patched OpenNext so preview-props.json is included in the Worker.");
