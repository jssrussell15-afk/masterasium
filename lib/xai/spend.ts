import "server-only";

import { createSpendAlerter, type SpendAlert, type SpendAlerter } from "@/lib/xai/alert";
import { xaiApiKey } from "@/lib/xai/key";
import { readWorkerEnv } from "@/lib/server/env";

/** Documented estimates. Override with XAI_INPUT_USD_PER_MILLION and XAI_OUTPUT_USD_PER_MILLION. */
export const DEFAULT_INPUT_USD_PER_MILLION = 3;
export const DEFAULT_OUTPUT_USD_PER_MILLION = 15;

export type UsageRow = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  monthKey: string;
};

export interface UsageStore {
  monthSpendUsd(monthKey: string): Promise<number>;
  record(row: UsageRow): Promise<void>;
  /** True when this alert key was stored for the first time. */
  claimAlert(alertKey: string): Promise<boolean>;
}

export type XaiBudget = {
  allowed: boolean;
  reason?: "missing-key" | "missing-cap" | "cap" | "store";
  spentUsd: number;
  capUsd: number | null;
};

export function monthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function usdPerMillion(name: string, fallback: number): number {
  const raw = readWorkerEnv(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

export function estimateCostUsd(input: {
  inputTokens: number;
  outputTokens: number;
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
}): number {
  const inputRate = input.inputUsdPerMillion ?? DEFAULT_INPUT_USD_PER_MILLION;
  const outputRate = input.outputUsdPerMillion ?? DEFAULT_OUTPUT_USD_PER_MILLION;
  const cost =
    (Math.max(0, input.inputTokens) / 1_000_000) * inputRate +
    (Math.max(0, input.outputTokens) / 1_000_000) * outputRate;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function monthlyCapUsd(): number | null {
  const raw = readWorkerEnv("XAI_MONTHLY_CAP_USD");
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export async function beforeXaiCall(store: UsageStore, capUsd: number | null, now = new Date()): Promise<XaiBudget> {
  if (!xaiApiKey()) {
    return { allowed: false, reason: "missing-key", spentUsd: 0, capUsd };
  }
  if (capUsd == null) {
    return { allowed: false, reason: "missing-cap", spentUsd: 0, capUsd: null };
  }
  try {
    const spentUsd = await store.monthSpendUsd(monthKey(now));
    if (spentUsd >= capUsd) {
      return { allowed: false, reason: "cap", spentUsd, capUsd };
    }
    return { allowed: true, spentUsd, capUsd };
  } catch {
    return { allowed: false, reason: "store", spentUsd: 0, capUsd };
  }
}

export async function recordXaiUsage(input: {
  store: UsageStore;
  alerter: SpendAlerter;
  model: string;
  inputTokens: number;
  outputTokens: number;
  capUsd: number;
  now?: Date;
}): Promise<{ spentUsd: number; estimatedCostUsd: number }> {
  const now = input.now ?? new Date();
  const month = monthKey(now);
  const estimatedCostUsd = estimateCostUsd({
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    inputUsdPerMillion: usdPerMillion("XAI_INPUT_USD_PER_MILLION", DEFAULT_INPUT_USD_PER_MILLION),
    outputUsdPerMillion: usdPerMillion("XAI_OUTPUT_USD_PER_MILLION", DEFAULT_OUTPUT_USD_PER_MILLION),
  });
  await input.store.record({
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    estimatedCostUsd,
    monthKey: month,
  });
  const spentUsd = await input.store.monthSpendUsd(month);
  await maybeAlert(input.store, input.alerter, {
    source: "xai",
    level: "50",
    month,
    spentUsd,
    capUsd: input.capUsd,
  });
  await maybeAlert(input.store, input.alerter, {
    source: "xai",
    level: "90",
    month,
    spentUsd,
    capUsd: input.capUsd,
  });
  return { spentUsd, estimatedCostUsd };
}

async function maybeAlert(store: UsageStore, alerter: SpendAlerter, alert: SpendAlert): Promise<void> {
  const ratio = alert.level === "50" ? 0.5 : 0.9;
  if (alert.capUsd <= 0 || alert.spentUsd < alert.capUsd * ratio) return;
  const claimed = await store.claimAlert(`xai:${alert.month}:${alert.level}`);
  if (!claimed) return;
  await alerter.send(alert);
}

export function spendAlerterFromEnv(): SpendAlerter {
  return createSpendAlerter({
    webhookUrl: readWorkerEnv("ALERT_EMAIL_WEBHOOK_URL"),
  });
}
