import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { handleStripeWebhook, type StripeEventRecord, type StripeEventStore } from "@/lib/stripe/webhook";

const SECRET = "whsec_unit_test_only";

function eventBody(id: string): string {
  return JSON.stringify({
    id,
    object: "event",
    api_version: "2024-06-20",
    created: 1_700_000_000,
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_1", object: "checkout.session" } },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  });
}

function header(payload: string, timestamp = Math.floor(Date.now() / 1000)): string {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET, timestamp });
}

function memoryStore(): StripeEventStore & { rows: StripeEventRecord[]; processed: string[] } {
  const rows: StripeEventRecord[] = [];
  return {
    rows,
    processed: [],
    async recordOnce(event) {
      if (rows.some((row) => row.id === event.id)) return false;
      rows.push(event);
      return true;
    },
    async forget(eventId) {
      const index = rows.findIndex((row) => row.id === eventId);
      if (index >= 0) rows.splice(index, 1);
    },
  };
}

describe("Stripe webhook", () => {
  it("rejects a missing or invalid signature", async () => {
    const store = memoryStore();
    const missing = await handleStripeWebhook({
      payload: eventBody("evt_missing"),
      signature: null,
      secret: SECRET,
      store,
    });
    expect(missing.status).toBe(400);

    const invalid = await handleStripeWebhook({
      payload: eventBody("evt_bad"),
      signature: "t=1,v1=deadbeef",
      secret: SECRET,
      store,
    });
    expect(invalid.status).toBe(400);
    expect(store.rows).toEqual([]);
  });

  it("rejects a stale signature", async () => {
    const payload = eventBody("evt_stale");
    const response = await handleStripeWebhook({
      payload,
      signature: header(payload, Math.floor(Date.now() / 1000) - 3600),
      secret: SECRET,
      store: memoryStore(),
    });
    expect(response.status).toBe(400);
  });

  it("records an event once and does not run the handler again", async () => {
    const payload = eventBody("evt_once");
    const signature = header(payload);
    const store = memoryStore();
    const seen: string[] = [];
    const first = await handleStripeWebhook({
      payload,
      signature,
      secret: SECRET,
      store,
      onEvent: async (event) => {
        seen.push(event.id);
      },
    });
    const second = await handleStripeWebhook({
      payload,
      signature,
      secret: SECRET,
      store,
      onEvent: async (event) => {
        seen.push(event.id);
      },
    });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, duplicate: false });
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ received: true, duplicate: true });
    expect(seen).toEqual(["evt_once"]);
    expect(store.rows).toHaveLength(1);
  });

  it("forgets a new event when processing throws so a retry can run", async () => {
    const payload = eventBody("evt_retry");
    const signature = header(payload);
    const store = memoryStore();
    const failed = await handleStripeWebhook({
      payload,
      signature,
      secret: SECRET,
      store,
      onEvent: async () => {
        throw new Error("mailer down");
      },
    });
    expect(failed.status).toBe(500);
    expect(store.rows).toEqual([]);
  });
});
