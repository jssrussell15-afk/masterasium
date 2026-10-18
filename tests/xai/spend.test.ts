import { afterEach, describe, expect, it } from "vitest";
import { createSpendAlerter } from "@/lib/xai/alert";
import {
  beforeXaiCall,
  estimateCostUsd,
  monthKey,
  recordXaiUsage,
  type UsageStore,
} from "@/lib/xai/spend";

function memoryUsage(): UsageStore & { spent: number; alerts: string[] } {
  const state = { spent: 0, alerts: [] as string[] };
  return {
    alerts: state.alerts,
    get spent() {
      return state.spent;
    },
    set spent(value: number) {
      state.spent = value;
    },
    async monthSpendUsd() {
      return state.spent;
    },
    async record(row) {
      state.spent += row.estimatedCostUsd;
    },
    async claimAlert(alertKey) {
      if (state.alerts.includes(alertKey)) return false;
      state.alerts.push(alertKey);
      return true;
    },
  };
}

describe("xAI spend", () => {
  const previousKey = process.env.XAI_API_KEY;
  const previousCap = process.env.XAI_MONTHLY_CAP_USD;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = previousKey;
    if (previousCap === undefined) delete process.env.XAI_MONTHLY_CAP_USD;
    else process.env.XAI_MONTHLY_CAP_USD = previousCap;
  });

  it("estimates token cost and blocks once the monthly cap is reached", async () => {
    expect(estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 0, inputUsdPerMillion: 3 })).toBe(3);
    expect(monthKey(new Date("2026-10-18T12:00:00.000Z"))).toBe("2026-10");

    process.env.XAI_API_KEY = "test-key-not-real";
    const store = memoryUsage();
    store.spent = 5;
    const blocked = await beforeXaiCall(store, 5, new Date("2026-10-18T12:00:00.000Z"));
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("cap");

    store.spent = 1;
    const open = await beforeXaiCall(store, 5, new Date("2026-10-18T12:00:00.000Z"));
    expect(open.allowed).toBe(true);
  });

  it("alerts once at 50% and 90% and can POST the same payload", async () => {
    const store = memoryUsage();
    const sent: unknown[] = [];
    const lines: string[] = [];
    const alerter = createSpendAlerter({
      log: (line) => lines.push(line),
      webhookUrl: "https://alerts.example.test/hook",
      fetchImpl: async (_url, init) => {
        sent.push(JSON.parse(String(init?.body)));
        return new Response(null, { status: 204 });
      },
    });

    await recordXaiUsage({
      store,
      alerter,
      model: "grok",
      inputTokens: 1_000_000,
      outputTokens: 0,
      capUsd: 4,
      now: new Date("2026-10-02T00:00:00.000Z"),
    });
    await recordXaiUsage({
      store,
      alerter,
      model: "grok",
      inputTokens: 1_000_000,
      outputTokens: 0,
      capUsd: 4,
      now: new Date("2026-10-03T00:00:00.000Z"),
    });

    expect(store.alerts).toEqual(["xai:2026-10:50", "xai:2026-10:90"]);
    expect(sent).toHaveLength(2);
    expect(lines.some((line) => line.includes("50%"))).toBe(true);
    expect(lines.some((line) => line.includes("90%"))).toBe(true);
    expect(JSON.stringify(sent)).not.toContain("PIN");
  });

  it("refuses a call when the key or cap is missing", async () => {
    delete process.env.XAI_API_KEY;
    const missingKey = await beforeXaiCall(memoryUsage(), 10);
    expect(missingKey.reason).toBe("missing-key");

    process.env.XAI_API_KEY = "test-key-not-real";
    const missingCap = await beforeXaiCall(memoryUsage(), null);
    expect(missingCap.reason).toBe("missing-cap");
  });
});
