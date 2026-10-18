import "server-only";

/**
 * Server-only env read. Workers bindings win, then process.env.
 * Never call this from a client component. Values are not logged.
 */
export function readWorkerEnv(name: string): string | undefined {
  try {
    const loaded = require("@opennextjs/cloudflare") as {
      getCloudflareContext?: () => { env?: Record<string, unknown> };
    };
    const env = loaded.getCloudflareContext?.().env;
    const bound = env?.[name];
    if (typeof bound === "string" && bound.trim()) return bound.trim();
  } catch {
    // next dev, unit tests, and builds outside a request have no worker binding.
  }

  const fromProcess = process.env[name];
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim();
  return undefined;
}
