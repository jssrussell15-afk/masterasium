import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findClientSecretMarkers, findServerKeyMaterial } from "../../scripts/scan-client-secrets.mjs";

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(full)));
    else if (/\.(ts|tsx|js|mjs|css)$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe("client secret scan", () => {
  it("flags xai, sk_, and service_role in client text", () => {
    expect(findClientSecretMarkers("practice question")).toEqual([]);
    expect(findClientSecretMarkers("mask_${id}")).toEqual([]);
    expect(findClientSecretMarkers("GXaidknP5")).toEqual([]);
    expect(findClientSecretMarkers("XAI_API_KEY")).toContain("xai");
    expect(findClientSecretMarkers("sk_live_example")).toContain("sk_");
    expect(findClientSecretMarkers("service_role")).toContain("service_role");
  });

  it("allows env names in server text and still flags key material", () => {
    expect(findServerKeyMaterial("readWorkerEnv('XAI_API_KEY')")).toEqual([]);
    expect(findServerKeyMaterial("readWorkerEnv('SUPABASE_SERVICE_ROLE_KEY')")).toEqual([]);
    expect(findServerKeyMaterial("sk_live_example")).toContain("sk_live_");
    expect(findServerKeyMaterial("whsec_example")).toContain("whsec_");
  });

  it("keeps secret names out of app and components source", async () => {
    const roots = ["app", "components"].map((dir) => path.join(process.cwd(), dir));
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of await filesUnder(root)) {
        const text = await readFile(file, "utf8");
        const hits = findClientSecretMarkers(text);
        if (hits.length > 0) offenders.push(`${path.relative(process.cwd(), file)}: ${hits.join(",")}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
