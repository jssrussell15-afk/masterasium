# Masterasium

Ontario math practice for Grades 1–8. Grade 1 and Grade 5 are open. The other grades are listed on the landing page so families can leave an email. Parent registration is free. There is no payment step.

A parent account can add one or two children, first name only. Practice stays on one skill until it is steady, then moves on. The parent desk shows questions attempted, accuracy, and the current focus skill.

## Local setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if that is what the project shows

3. In the Supabase SQL editor, run `supabase/migrations/001_init.sql`.
4. In Authentication → URL configuration, set the site URL to `http://localhost:3000` and add `http://localhost:3000/auth/confirm` to the redirect allow list.
5. For instant local sign-up, turn off “Confirm email” under Authentication → Providers → Email. If you leave it on, the sign-up page asks the parent to confirm from their inbox. Either way, the account is free.
6. `npm install`, then `npm run dev`.

## Scripts

- `npm run dev` — Next.js locally
- `npm test` — skill scheduler, question generators, and the digest draft
- `npm run build` — production build
- `npm run preview` — build and run the Cloudflare Workers runtime locally. That runtime needs macOS 13.5 or later (or Linux). On older macOS, use `npm run dev`.
- `npm run deploy` — build with OpenNext and deploy to Cloudflare

## Cloudflare

Next.js 16 on Cloudflare uses [OpenNext](https://opennext.js.org/cloudflare). `npm run deploy` publishes a Worker named `masterasium`. In the Cloudflare dashboard that project lives under Workers & Pages. The older `@cloudflare/next-on-pages` adapter targeted classic Pages and does not support this Next.js version.

Before a production build, set the same `NEXT_PUBLIC_SUPABASE_*` variables in the environment. Next inlines them into the browser bundle at build time. Add the production site URL and `https://<your-domain>/auth/confirm` to the Supabase redirect allow list.

`NEXTJS_ENV` for Wrangler preview belongs in `.dev.vars` (see `.dev.vars.example`). Do not commit secrets.

## Daily email

Nothing is emailed. On the parent desk, “Save today’s draft” writes a summary for that child and that Toronto calendar day into `digest_stubs`. `POST /api/digest` with the header `x-digest-secret: $DIGEST_CRON_SECRET` only checks the secret and returns `{ "status": "stubbed" }`. A later mailer can read `digest_stubs` and mark a row `sent`.

## Where to extend the practice

- **Upload a worksheet and practice similar questions.** `lib/practice/source.ts` defines `ItemSource`. The app uses `generated`. An uploaded source should return the same `Question` shape (`prompt`, `answer`, `skillId`). `getItemSource("uploaded")` is the seam. It throws until that source exists.
- **FSRS.** `lib/practice/scheduler.ts` defines `PracticeScheduler` and `SkillCard.fsrs`. `AccuracyScheduler` ignores `fsrs` and uses attempt count plus accuracy (5 attempts at 80% opens the next skill, and every 4th question can review). The `skill_states.fsrs` column stores the card. A new scheduler can read that field and be passed where `accuracyScheduler` is used. The practice page does not need to change.
