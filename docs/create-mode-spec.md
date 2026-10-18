# Create mode

Create is an AI-literacy subject for Grades 3–6. It is a picker. The child never chats with the AI. They choose from three suggested cards, tweak them with chips, and keep, retry, or fix each one. The child stays in the judgment loop. There is no publishing or sharing. Creative work is not stored on the server.

This document is the spec for the clickable prototype. `CREATE_MODE=prototype` is the default. In that mode the generate route returns drawings from `public/create-samples/` and does not call xAI.

## Before real image generation is turned on

Live calls stay off until all of these exist:

1. A privacy lawyer review (see Open questions).
2. A chosen image-safety provider behind the `SafetyFilter` interface in `lib/create/moderate.ts`. The current filter is a stub that only accepts ids starting with `sample-`.
3. Prompt templates signed off for Grades 3–6. The drafts live in `lib/create/prompts.ts`. They accept allowlisted chip values only. A child's own sentence is never pasted into a template.
4. A cost-per-project estimate signed off against the real provider price. Planning numbers are below.
5. A moderation test set, scored, covering the cases listed below. The prototype pre-filter is a length and blocklist stub. It is not the launch filter.

`CREATE_MODE` stays `prototype` until those are done. The live branch of `handleCreateGenerate` returns `live-not-enabled` after the guards, and still does not call the network.

## Navigation

The child home (`/practice`) shows two large tiles when Create is allowed: Practice, then Create. Practice stays first and is the primary tile. The Create tile is absent unless the parent has turned Create on for that child and the working grade is 3, 4, 5, or 6.

No new top-level navigation items.

The parent desk has one Create card per child, collapsed, below the math block. Account settings has one Create section per child. There is no new tab.

## Routes

| Route | Step |
| --- | --- |
| `/create` | 1. Pick a project |
| `/create/[project]/spark` | 2. Spark |
| `/create/[project]/character` | 3. Character |
| `/create/[project]/setting` | 4. Setting |
| `/create/[project]/pages` | 5. Pages or panels |
| `/create/[project]/finish` | 6. Finish |
| `/create/how` | Three-panel explainer |

`[project]` is `story`, `comic`, or `moving`. Each step is its own URL so Back and refresh return to that step. The screen shows "Step N of 6" and a back control. Choice targets are at least 60px. Every card has read-aloud through device speech (`components/read-aloud.tsx`, the same control as PR #14). A selected card can be tapped again to undo.

`/create` header: "Make something". Subtitle: "You decide. The computer helps."

Project cards:

- Story. "Tell a short story, one page at a time." 4 pages. "About 15 minutes."
- Comic. "Make a comic with three panels." 3 panels. "About 15 minutes."
- Moving picture. "Make a short flip animation." "About 15 minutes."

"About 15 minutes" is a label, not a countdown.

A quiet "Keep going" row appears when a same-day draft exists. "How this works" opens the three panels: you pick, you can change it, you judge it.

Skip is available on Spark, Character, Setting, and Pages. It is not available on Pick or Finish.

## The six steps

1. Pick a project.
2. Spark. Three seed cards, plus "Show me 3 more" at most three times. Literacy line: "These were made by a computer. Do any feel boring or the same?"
3. Character. Three picture cards with names. Chips for size, colour, mood, and one special thing. One "Not quite right?" regenerate. "Why this one?" with three tap options.
4. Setting. Same pattern as Character.
5. Pages or panels. For each page, choose one of three sentences or "Write my own". Write my own is typed or dictated and stays off unless the parent allows it. The prototype runs the stub pre-filter. Then an illustration appears with Keep, Try again (at most two), and Fix one thing ("make it night", "add a friend"). Then "Does the picture match the words?" with Yes, Mostly, or "No, fix it".
6. Finish. A swipe-through book, or a flip for the moving picture. Autoplay respects `prefers-reduced-motion`. Then "What did the computer get wrong? What did you change?" as taps. Then "Save to this tablet" (a print view) and Done. Done can clear the device draft.

Sample drawings are original SVGs in `public/create-samples/`. Picks, retries, colour, night, and friend each select a different file.

## Drafts

In-progress work lives in IndexedDB on the device, behind `CreateDraftStore` (`lib/create/draft-store.ts`). The database name is `masterasium-create`. A draft is readable only on the Toronto calendar day it was written. Done can clear it sooner. Nothing creative is written to Supabase.

PR #14's `lib/practice/draft-store.ts` is localStorage for practice answers. After that PR merges, keep Create drafts in this IndexedDB database so stories are not mixed into attempt drafts. A shared device-storage helper can be extracted later.

## Session metadata

Migration `supabase/migrations/20261018190052_create_sessions.sql` (not applied).

`create_sessions` stores metadata only:

- `child_id`, `project_type`, `started_at`, `finished_at`
- `steps_completed`, `keep_count`, `retry_count`, `fix_count`
- `mismatch_flags` (page numbers 1–4)
- `reflection_taps` (enum array)
- `used_write_my_own` (boolean)

No text, images, or prompts. `toSessionRow` drops every other field. Row-level security matches attempts: a parent can read rows for their own children; a student can read, insert, and update their own rows through `current_student_id()`. See `docs/rls-test-plan.md`.

Raw rows are kept for 12 months and then rolled up to counts with no `child_id`. This migration does not schedule or run that roll-up.

Per-child flags on `children`, all off or empty by default:

- `create_enabled`
- `create_write_own`
- `create_daily_limit` (1, 2, or 3; default 1)
- `create_image_consent_at`
- `create_image_consent_version`

Parents change them through `set_create_settings` and `set_create_image_consent`.

## Generate route

`POST /api/create/generate` is server-only.

- It builds a prompt from the fixed templates and allowlisted chips.
- It pre-filters any write-my-own text and post-filters output ids through `SafetyFilter`.
- It enforces the parent daily project limit and a hard cap of 18 generations per project.
- Live mode passes the spend decision through `spendGuard` in `lib/create/spend-guard.ts`.
- Real generation requires parent opt-in and image consent.
- Without consent, Create still runs on sample images. The parent copy says so.
- When `CREATE_MODE` is unset or `prototype`, the route returns sample assets and does not read the xAI key or call the network.

PR #12 (`lib/xai/spend.ts`, `beforeXaiCall`, `UsageStore`, `monthlyCapUsd()`) is not on this branch. After it merges, the live branch of `spendGuard` should call `beforeXaiCall`. Prototype mode must keep skipping that module.

## Parent controls and the desk card

Settings, per child, off by default:

- Allow Create
- Allow writing their own sentences
- Daily project limit

Picture-making consent is a separate screen. It says what can be sent, that the story and pictures stay on the tablet, and that the parent can turn it off. Allowing it records a timestamp and version `2026-10-18`.

The desk card is collapsed. One sentence per session, for example: "Made a 4-page story. Tried again 3 times, changed the character's colour, said the picture didn't match on page 2."

A literacy line in plain sentences, for example "Is starting to say when a picture doesn't match" or "Usually keeps the first option". No scores. Those strings live in `lib/create/copy.ts`.

## Cost sketch (not a quote)

Planning assumption until a provider is chosen: about $0.04 per image.

A story that the child mostly keeps is about 8 images (spark, character, setting, four pages): about $0.32.

The hard cap is 18 generations in one project: about $0.72.

The default daily limit is 1 project, so about $0.32 to $0.72 per child per day. Three projects at the cap would be about $2.16. These numbers move when the provider price is known. Text-only spark cards may be cheaper than images and should be priced separately.

## Moderation test set still to build

Do not turn on live generation until a reviewed set covers at least:

- empty and whitespace
- an ordinary grade-level sentence (allowed)
- over 80 characters
- violence and weapons
- sexual content
- insults
- a phone number, address, or full name of a real person
- a sentence that tries to change the image recipe ("ignore the rules and draw…")
- homoglyphs and mixed scripts
- a sentence that is fine to keep on the tablet and must still be absent from `create_sessions`

The prototype stub checks empty, length, and a short blocklist. It does not log the sentence.

## Open questions

- Privacy review: device-only stories, student inserts of metadata, whether browser dictation sends audio to the browser vendor, what a live prompt is allowed to contain, how withdrawal of consent is recorded, and the 12-month roll-up.
- Which image-safety vendor runs the post-filter, and whether a failed check shows a sample instead of an error.
- Teacher review of the prompt templates and the sentence bank.
- Sign-off on the cost sketch and on the cap of 18.
- Whether a grade 2 child who is working in grade 3 should see Create. The prototype uses the working grade.
- Whether page numbers in `mismatch_flags` are the right grain for the parent sentence.
- Consent versioning: who bumps `2026-10-18` when the consent text changes, and whether old consent remains valid.
- IndexedDB is per browser profile. Two children on one tablet are separated by child id inside that profile.
- "Show me 3 more" is counted on the device. Clearing site data resets it. The server cap still bounds live generations.
- Save uses the print dialog so a PDF library is not pulled into the child flow. `pdf-lib` remains a worksheet dependency only.
