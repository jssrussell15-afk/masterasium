import { showTestMode } from "@/lib/site/hosts";

function onCloudflareWorker(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

/** Live Worker env wins on Cloudflare. Local Next does not read wrangler.jsonc, so the banner stays on. */
export function resolveAppEnv(input: { processEnv?: string; workerEnv?: string; onWorker: boolean }): string {
  if (input.onWorker) return input.workerEnv?.trim() || "development";
  return input.processEnv?.trim() || "development";
}

export async function readAppEnv(): Promise<string> {
  if (onCloudflareWorker()) {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      const context = await getCloudflareContext({ async: true });
      return resolveAppEnv({
        onWorker: true,
        workerEnv: (context.env as { APP_ENV?: string }).APP_ENV,
      });
    } catch {
      return "development";
    }
  }
  return resolveAppEnv({ onWorker: false, processEnv: process.env.APP_ENV });
}

export async function testModeEnabled(): Promise<boolean> {
  return showTestMode(await readAppEnv());
}
