import "server-only";

import { readWorkerEnv } from "@/lib/server/env";

/** The only read of XAI_API_KEY. Server bindings and secrets, never a client bundle. */
export function xaiApiKey(): string | undefined {
  return readWorkerEnv("XAI_API_KEY");
}
