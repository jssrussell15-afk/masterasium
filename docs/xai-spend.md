# xAI spend cap

No product screen calls xAI yet. The only server entry points are `lib/xai/key.ts` (`XAI_API_KEY`) and `lib/xai/spend.ts` (`beforeXaiCall` / `recordXaiUsage`). Both are marked `server-only`. The key is read from the Worker binding or `process.env`, never from a `NEXT_PUBLIC_` variable.

## Cap

Set `XAI_MONTHLY_CAP_USD` on the Worker. When the estimated spend for the UTC month reaches that amount, `beforeXaiCall` refuses another call. If the cap or the key is missing, calls are refused.

Estimates default to $3 per million input tokens and $15 per million output tokens. Override with `XAI_INPUT_USD_PER_MILLION` and `XAI_OUTPUT_USD_PER_MILLION`. Rows go in `xai_usage` (model, token counts, estimated dollars, month). Prompts, child names, PINs, and emails are not stored.

## Alerts

At 50% and 90% of the cap, one alert is sent per month. `createSpendAlerter` writes a log line and, when `ALERT_EMAIL_WEBHOOK_URL` is set, POSTs JSON:

```json
{ "source": "xai", "level": "50", "month": "2026-10", "spentUsd": 1.5, "capUsd": 3 }
```

Email is not configured in the app. Point the webhook at whatever sends mail later. The same alert is not repeated (`spend_alerts`).

## Console limit

Matthew should also set a **hard spend limit in the xAI console**. The app cap is a second gate. It cannot stop a key that is used outside this Worker.
