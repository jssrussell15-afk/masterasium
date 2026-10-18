# Domain cutover

Live site: `https://masterasium.com`. Keep the `workers.dev` hostname up for at least a month after cutover so a bad DNS change can be rolled back without a new deploy.

## Worker routes

1. In Cloudflare, attach `masterasium.com` and `www.masterasium.com` to the production Worker named `masterasium`.
2. Leave the existing `*.workers.dev` route in place.
3. The app redirects `www.masterasium.com` to `https://masterasium.com` with a 308, and redirects `http://masterasium.com` to `https://masterasium.com` when `x-forwarded-proto` is `http`. Also turn on **Always Use HTTPS** for the zone.
4. Hosts the app will use for auth email links: `masterasium.com`, `www.masterasium.com` (rewritten to the apex), `*.workers.dev`, `localhost`, and `127.0.0.1`. Any other `Host` header is ignored and the link uses `https://masterasium.com`.

## Search

- Pages served on `*.workers.dev` send `X-Robots-Tag: noindex, nofollow` and a canonical link to `https://masterasium.com`.
- `masterasium.com` stays indexable. `metadataBase` is `https://masterasium.com`.

## Supabase Auth

In the Supabase dashboard for the production project:

- Site URL: `https://masterasium.com`
- Redirect URLs, both of these:
  - `https://masterasium.com/**`
  - `https://www.masterasium.com/**`
- Add `https://<worker>.workers.dev/**` as well while that hostname is the fallback.

## Stripe

- Webhook endpoint: `https://masterasium.com/api/stripe/webhook`
- Signing secret: Cloudflare secret `STRIPE_WEBHOOK_SECRET` on the production Worker (see the security draft).
- Success and cancel return URLs, when a Checkout flow is added, use `https://masterasium.com/...`.

## Email DNS

At the DNS host for `masterasium.com`, for whichever provider sends parent mail:

- SPF: one TXT record on the apex, `v=spf1` plus that provider’s include, then `-all`.
- DKIM: the CNAMEs or TXT records the provider gives you. Do not invent selectors.
- DMARC: `_dmarc.masterasium.com` TXT, `v=DMARC1; p=none; rua=mailto:hello@masterasium.com` until reports look clean, then move to `p=quarantine`.

## Rollback

1. Point the apex and `www` DNS back at the previous target, or remove the custom domains from the Worker. `workers.dev` is still serving the same build.
2. Set the Supabase Site URL back to the `workers.dev` origin if parent email links must work before DNS recovers.
3. Leave the Stripe webhook on the apex. Stripe retries; a short DNS gap does not require a second endpoint unless the apex is down for longer than Stripe’s retry window.

## Checklist

- [ ] Apex and `www` routes on the production Worker
- [ ] Always Use HTTPS, and a request to `www` lands on the apex
- [ ] `workers.dev` response has `X-Robots-Tag: noindex`
- [ ] Supabase Site URL and both redirect URLs saved
- [ ] Stripe webhook pointed at `https://masterasium.com/api/stripe/webhook`
- [ ] SPF, DKIM, and DMARC published
- [ ] `workers.dev` left in place for at least a month
