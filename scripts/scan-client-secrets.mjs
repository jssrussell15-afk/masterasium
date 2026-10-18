import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const TEXT_FILE = /\.(?:js|mjs|cjs|css|html|json|txt|map|svg)$/i;

// Token boundaries avoid minified hits such as mask_ and base64 that contains "xai".
const CLIENT_PATTERNS = [
  { name: "xai", pattern: /(?<![A-Za-z0-9])xai(?![A-Za-z0-9])/i },
  { name: "sk_", pattern: /(?<![A-Za-z0-9])sk_(?:live|test)_/ },
  { name: "service_role", pattern: /(?<![A-Za-z0-9])service_role(?![A-Za-z0-9])/ },
  { name: "whsec_", pattern: /(?<![A-Za-z0-9])whsec_/ },
  { name: "SUPABASE_SERVICE_ROLE", pattern: /SUPABASE_SERVICE_ROLE/ },
];

const KEY_MATERIAL = [
  { name: "sk_live_", pattern: /(?<![A-Za-z0-9])sk_live_/ },
  { name: "sk_test_", pattern: /(?<![A-Za-z0-9])sk_test_/ },
  { name: "whsec_", pattern: /(?<![A-Za-z0-9])whsec_/ },
  { name: "service_role", pattern: /(?<![A-Za-z0-9])service_role(?![A-Za-z0-9])/ },
];

const SERVER_ENV_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "XAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ALERT_EMAIL_WEBHOOK_URL",
];

export function findClientSecretMarkers(text) {
  return CLIENT_PATTERNS.filter((item) => item.pattern.test(text)).map((item) => item.name);
}

export function findServerKeyMaterial(text) {
  let redacted = text;
  for (const name of SERVER_ENV_NAMES) redacted = redacted.split(name).join("");
  return KEY_MATERIAL.filter((item) => item.pattern.test(redacted)).map((item) => item.name);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.isFile() && TEXT_FILE.test(entry.name)) files.push(full);
  }
  return files;
}

async function exists(dir) {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

export async function scanBuiltBundles(root) {
  const hits = [];
  const clientDirs = [path.join(root, ".next", "static"), path.join(root, ".open-next", "assets")];
  const openNext = path.join(root, ".open-next");
  let sawBundle = false;

  for (const dir of clientDirs) {
    if (!(await exists(dir))) continue;
    sawBundle = true;
    for (const file of await walk(dir)) {
      const text = await readFile(file, "utf8").catch(() => "");
      for (const name of findClientSecretMarkers(text)) {
        hits.push(`${path.relative(root, file)}: ${name}`);
      }
    }
  }

  if (await exists(openNext)) {
    sawBundle = true;
    for (const file of await walk(openNext)) {
      if (file.startsWith(path.join(openNext, "assets") + path.sep)) continue;
      const text = await readFile(file, "utf8").catch(() => "");
      for (const name of findServerKeyMaterial(text)) {
        hits.push(`${path.relative(root, file)}: ${name}`);
      }
    }
  }

  if (!sawBundle) {
    throw new Error("No client bundles found. Run npm run build before the secret scan.");
  }
  return hits;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const hits = await scanBuiltBundles(process.cwd());
  if (hits.length > 0) {
    console.error("Client bundle secret scan failed:");
    for (const hit of hits) console.error(`- ${hit}`);
    process.exit(1);
  }
  console.log("Client bundle secret scan passed.");
}
