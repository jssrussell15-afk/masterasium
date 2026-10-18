import { createServiceClient } from "@/lib/supabase/service";
import { handleStripeWebhook, type StripeEventStore } from "@/lib/stripe/webhook";
import { readWorkerEnv } from "@/lib/server/env";

/**
 * Minimal verified webhook. No billing product exists yet.
 * A valid event is stored once by id and acknowledged. Unsigned events are rejected.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const store = supabaseEventStore();
  if (!store) {
    return Response.json({ received: false, error: "Webhook storage is not configured." }, { status: 500 });
  }

  return handleStripeWebhook({
    payload,
    signature: request.headers.get("stripe-signature"),
    secret: readWorkerEnv("STRIPE_WEBHOOK_SECRET"),
    store,
  });
}

function supabaseEventStore(): StripeEventStore | null {
  const supabase = createServiceClient();
  if (!supabase) return null;

  return {
    async recordOnce(event) {
      const { error } = await supabase.from("stripe_events").insert({
        event_id: event.id,
        event_type: event.type,
      });
      if (!error) return true;
      if (error.code === "23505") return false;
      throw new Error("stripe event insert failed");
    },
    async forget(eventId) {
      const { error } = await supabase.from("stripe_events").delete().eq("event_id", eventId);
      if (error) throw new Error("stripe event delete failed");
    },
  };
}
