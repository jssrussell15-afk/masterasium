import "server-only";

import Stripe from "stripe";

export type StripeEventRecord = {
  id: string;
  type: string;
};

export interface StripeEventStore {
  /** True when this event id was stored for the first time. */
  recordOnce(event: StripeEventRecord): Promise<boolean>;
  forget(eventId: string): Promise<void>;
}

export type StripeWebhookInput = {
  payload: string;
  signature: string | null;
  secret: string | undefined;
  toleranceSeconds?: number;
  store: StripeEventStore;
  onEvent?: (event: StripeEventRecord) => Promise<void>;
  nowSeconds?: number;
};

/**
 * Verify a Stripe webhook with SubtleCrypto (Workers-safe) and keep one row per event id.
 * Unsigned, stale, and invalid signatures are rejected. Duplicate ids are acknowledged
 * and not processed again.
 */
export async function handleStripeWebhook(input: StripeWebhookInput): Promise<Response> {
  if (!input.secret) {
    return Response.json({ received: false, error: "Webhook secret is not configured." }, { status: 500 });
  }
  if (!input.signature) {
    return Response.json({ received: false, error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = new Stripe("webhook-verify-only", {
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      input.payload,
      input.signature,
      input.secret,
      input.toleranceSeconds,
      undefined,
      input.nowSeconds,
    );
  } catch {
    return Response.json({ received: false, error: "Invalid Stripe signature." }, { status: 400 });
  }

  const record = { id: event.id, type: event.type };
  let inserted = false;
  try {
    inserted = await input.store.recordOnce(record);
  } catch {
    return Response.json({ received: false, error: "Could not record the event." }, { status: 500 });
  }

  if (!inserted) {
    return Response.json({ received: true, duplicate: true });
  }

  try {
    await input.onEvent?.(record);
  } catch {
    try {
      await input.store.forget(record.id);
    } catch {
      // The row remains, so a retry is treated as a duplicate. Surface the failure.
    }
    return Response.json({ received: false, error: "Could not process the event." }, { status: 500 });
  }

  return Response.json({ received: true, duplicate: false });
}
