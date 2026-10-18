# Staging, analytics, and the database connection

## Staging

`wrangler.jsonc` has an env named `staging`. It deploys a different Worker, `masterasium-staging`, with `APP_ENV=staging`. The production Worker keeps the name `masterasium` and `APP_ENV=production`.

The banner at the top of every page says **Test mode. This is not the live site.** whenever `APP_ENV` is not `production`. Local `next dev` does not set `APP_ENV`, so the banner is on there too.

Staging is a separate build. `NEXT_PUBLIC_*` values are baked in at build time, so a staging build must not use the production Supabase URL or the production anon key.

Manual steps before the first staging deploy:

1. Create a separate Supabase project, or a Supabase branch, and run the migrations there. Do not point staging at the production database.
2. Build with that project’s `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Set `APP_ENV` only through the Worker var already in `wrangler.jsonc`. Do not put secrets in `vars`.
4. Put secrets on the staging Worker only, with the test values:
   - `npx wrangler secret put STRIPE_SECRET_KEY --env staging` (Stripe test secret key)
   - `npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging` (signing secret for a webhook aimed at the staging host)
   - `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging`
   - `npx wrangler secret put XAI_API_KEY --env staging` and `npx wrangler secret put XAI_MONTHLY_CAP_USD --env staging` if that draft is deployed
5. Deploy with `npx wrangler deploy --env staging`.
6. In Stripe, add a test-mode webhook whose URL is the staging host plus `/api/stripe/webhook`.
7. In Supabase, set the staging project’s Site URL to the staging host.

Confirm the yellow test-mode line is visible on staging and absent on production.

## Analytics

Cloudflare Web Analytics is off unless `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN` is set at build time. The token is the public site token from the Cloudflare Web Analytics dashboard, not an API secret. The beacon is `https://static.cloudflareinsights.com/beacon.min.js`. This app does not set an analytics cookie and does not pass a name, PIN, or email to the beacon.

Create the site in Cloudflare Web Analytics, copy the token into the production build env, and leave it unset on any build that should not be measured.

## Logs

`scrubLog` and `scrubError` in `lib/log/scrub.ts` remove email addresses, values written next to “pin” or “password”, and any child names the caller passes in. The app error screens log the scrubbed message, stack, and digest. Do not log a raw form body, a PIN, or a child name. A math answer that is only a number is left as-is.

## Database connections

Server code does not open a Postgres connection. There is no `pg` client, no `DATABASE_URL`, and no pool. Reads and writes go through `supabase-js` over HTTPS to the Supabase API. A Supavisor pooled connection string is not required for this app. Keep using the project URL and the anon key for browser and student calls, and the service role only on the server for the paths that already require it.
