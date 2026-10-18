import "server-only";

export type SpendAlert = {
  source: "xai";
  level: "50" | "90";
  month: string;
  spentUsd: number;
  capUsd: number;
};

/** Log, and optionally POST the same payload to an email webhook. No child data. */
export interface SpendAlerter {
  send(alert: SpendAlert): Promise<void>;
}

export function createSpendAlerter(options: {
  log?: (line: string) => void;
  webhookUrl?: string | null;
  fetchImpl?: typeof fetch;
}): SpendAlerter {
  const log = options.log ?? ((line) => console.info(line));
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async send(alert) {
      const line = `spend alert ${alert.source} ${alert.level}% month=${alert.month} spent=${alert.spentUsd.toFixed(2)} cap=${alert.capUsd.toFixed(2)}`;
      log(line);
      const webhookUrl = options.webhookUrl?.trim();
      if (!webhookUrl) return;
      const response = await fetchImpl(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(alert),
      });
      if (!response.ok) {
        log(`spend alert webhook failed status=${response.status}`);
      }
    },
  };
}
