# Retention spec (2026-10-19)

This note is for Matthew and for Cursor coding agents. It specifies two features that are not built: spaced review woven into a practice session, and Show me that fades per child per skill. It does not authorize a mailer, a migration, or a merge of the Show me branches.

Tone for anything a parent or child sees: quiet and focused. No points, streaks, badges, confetti, timers, reward sounds, or mascots. Kid-facing lines stay encouraging, never a score, and under 15 words where possible. Practice makes no live AI calls. Questions come from the generators already in the repo.

The aim is long-term retention. A child should still get an earlier skill right weeks later. Spacing and fading support are how we get there.

## What practice already does

Use these pieces. Do not invent a second scheduler beside them.

- The session picker is `AccuracyScheduler.chooseSkill` in `lib/practice/scheduler.ts`. A skill is confirmed after the lesson check, or, for older cards, after 10 attempts at 80% (`isMastered`). On counts 3 and 7 of every 8 it can swap in one mastered skill. If none is date-due it still picks the weakest mastered skill. This spec replaces that backfill. Empty review slots stay empty.
- Due-ness is `isReviewDue` in `lib/practice/review.ts`: `learn.needsReview`, or `learn.reviewDueAt` on or before today. A miss sets `needsReview`. Two later corrects (`REVIEW_CLEAR_HITS`) clear it and set a single 14-day due date (`REVIEW_AFTER_DAYS`). A lesson that finishes writes three dates at once, 1, 7, and 30 days, via `reviewPlanDates` in `lib/lesson/flow.ts`.
- That memory lives in `skill_states.fsrs`, wrapped by `lib/practice/memory.ts`. The `learn` object already holds `reviewDueAt`, `needsReview`, `reviewHits`, `reviewPlan`, `missStreak`, and `supportLeft`. The nested `fsrs` payload stays untouched.
- `skill_states.consecutive_correct` is the internal run of correct answers. Reads alias it as `streak` (`lib/practice/session.ts`, `lib/practice/actions.ts`). `recordAttempt` adds one on a correct answer and sets it to 0 on a miss. Leave it internal. Never say streak to a parent or a child.
- `attempts` stores `child_id`, `skill_id`, `prompt`, `expected`, `given`, `correct`, and `created_at`. It has no kind column, so a row does not say whether the item was the current skill or a review.
- `skill_reviews` (`supabase/migrations/20261018040000_lesson_flow.sql`) is one row per child, skill, and gap (`day`, `week`, `month`), with `due_on` and `done_at`. `scheduleReviews` and `syncReviewRows` in `lib/lesson/store.ts` write it. Let them move ahead reads the week row.
- Placement is `lib/practice/placement.ts`. Grades 1–2 skip the check. Grades 3–8 answer five questions. `practiceAnchor` passes `startSkillId` and, when the check was completely clear, `mixSkillId`. `planNextQuestion` in `lib/practice/learning.ts` folds that mix in on every 4th count as `kind: "focus"`.
- Let them move ahead is [PR #16](https://github.com/jssrussell15-afk/masterasium/pull/16) (`cursor/let-them-move-ahead-3f1c`), not merged. The label is `MOVE_AHEAD_LABEL` in `lib/practice/move-ahead.ts`. The setting is `children.move_ahead`, written only by `set_move_ahead`. A strand opens next-grade skills when every skill in it is mastered and its week review is done (`strandIsSolid`). The child sees "Next up" and no grade number.
- The kid home still says "Review today" and "Assigned for another look" (`lib/practice/home.ts`). Those notes go away. The child must not see the word review.
- Show me on main is still the text pair "Show me an example" and "Show me how" (`components/question-practice.tsx`, `lib/practice/feedback.ts`). "Show me how" is not a first-try success. The first three focus attempts also get `assistFor` (`lib/practice/assist.ts`). Review, check, and support items stay solo.
- The walk is [PR #10](https://github.com/jssrussell15-afk/masterasium/pull/10) (`cursor/show-me-walkthrough-3f1c`), not merged. `components/show-me.tsx` (`ShowMePanel`) and `lib/practice/walk.ts` cover `g3-add-sub`, `g3-mult`, `g3-fractions`, and `g3-time`. Captions are at most about eight words. One `ReadAloud` sits in `.speak-row` beside the caption. The visible word is Speak. The aria-label is "Speak this step". Skills with no step spec keep the text "Here's how".
- Styles are [PR #20](https://github.com/jssrussell15-afk/masterasium/pull/20) (`cursor/show-me-styles-3f1c`), not merged, and not stacked on the walk. `chooseShowMeStyle` in `lib/show-me/select.ts` picks `guided`, `standard`, or `buggy`. Standard blanks the last one or two steps (`fadedIndexes` in `lib/show-me/check.ts`, `fadeCount` on the template). Two misses on the current question force guided. Draft rows live on `content_items` and are not served.

`components/streak-mark.tsx` and `components/badge-tree.tsx` stay unmounted. `lib/practice/portrait.ts` still computes `streakDays`. Do not print it.

## 1. Spaced review woven into practice

Not built. Do not label it review on the child's screen.

### Goal

Each session stays on the current skill and quietly mixes in two or three earlier skills that are due to fade. The child should feel that practice is still the same work. The parent hears, once a week, that something was kept fresh.

### Kid experience

The card does not change. Same prompt, same keypad, same Next. No "Review" heading, no countdown, no score.

Sample lines, only when a line is needed:

- A miss on an earlier skill opens a short on-ramp: "Let's try this one together."
- Then the handoff already on the walk: "Your turn: try one like it."
- A correct answer stays "That's right."

Do not say "You forgot this", "Back to grade 2", or "Review question".

The home lists in `lib/practice/home.ts` drop "Review today" and "Assigned for another look". Use the skill title, or "Next in this grade" for the focus skill.

### Rules

Intervals, in days, after a successful recall: 1, then 3, then 7, then 14, then 30. A success past 30 stays at 30. A successful recall is a first-try correct on a due item, with no Show me and no "Show me how".

A miss shortens one step (30 to 14, 14 to 7, 7 to 3, 3 to 1, 1 stays at 1) and sets `needsReview`. It does not wipe the skill back to "not started". Two misses in a row on that same review skill set the interval back to 1.

`consecutive_correct` on that skill still resets to 0 on the miss, because `recordAttempt` already does that. Do not read the column aloud. Do not let one review miss increment `missStreak` toward rollback. Rollback stays what it is: three misses on the focus skill, then `SUPPORT_QUESTIONS` (3) easier items (`lib/practice/rollback.ts`).

Choosing items, once per session:

- Candidates are confirmed skills with `reviewDueAt <= today` or `needsReview`. Skills the child has not practised are not candidates.
- Order: overdue first, then soonest due date, then lowest `accuracyOf`, then skill order.
- Take at most three distinct skills. One item each. If only one skill is due, weave one item, not three.
- Do not fill a spare slot with a mastered skill that is not due. That is the change from today's count-3 and count-7 backfill.

Interleaving inside a set of `PRACTICE_SET_SIZE` (10):

- Question 1 is always the current skill.
- Review slots are questions 3, 6, and 9, and only while a candidate remains.
- Never two review items in a row. Never more than three review items in ten questions.
- A shorter sitting still starts on the current skill, and caps review at one item per four questions.
- The current skill stays the majority.

A missed review's next woven item is the on-ramp, then a fresh generated item of that skill. The on-ramp is one worked step, using the Show me level for that skill (section 2) or, when no walk exists, the text example from `buildWorkedExample`. Then "Your turn: try one like it." No demotion message. Working grade and `placement.startSkillId` do not move.

Placement and Let them move ahead:

- `startSkillId` still hides earlier skills in the grade from the forward path (`pathFrom`). Review may use a skill from before the anchor only when that skill already has a card the child practised.
- An early stop on the check starts at the prior grade's warm-up. The review pool is empty until something is confirmed. No "behind" copy.
- `mixSkillId` stays a focus mix (`planNextQuestion`, every 4th count). If that turn lands on a review slot, keep the mix and move the review to the next legal slot.
- Move-ahead stays off until a parent turns it on. A strand still opens only when `strandIsSolid` is true, which needs the week row done. The 7-day success in this schedule is what marks `skill_reviews.gap = week`. Next-up skills are new work, not review fillers. After one is confirmed it joins the same intervals. Turning the setting off does not delete due dates.

Dates use `torontoDate` in `lib/digest/build.ts`.

Parents see one line in the weekly digest, and nowhere on the kid screen. Example: "Kept fractions fresh." Two topics at most: "Kept fractions and time fresh." Use a short lowercase topic from the skill title (`g3-fractions` → fractions, `g3-time` → time), not the skill id and not a score. Build the line from review items that were first-try correct that week. If every review was missed, omit the line. Do not write "struggled". The Sunday preview (`lib/digest/sunday.ts`) can keep "Coming up next" as a parent preview. The email sentence, when a mailer exists, is this one line. Nothing is sent from this spec. The daily draft does not get the line.

### Data model

No new table for the schedule. Extend `learn` inside `skill_states.fsrs` through `readLearn` / `writeLearn`:

- `recallStep`: 0 to 4, index into 1, 3, 7, 14, 30. Absent means the next success is due in 1 day.
- `reviewDueAt`: already stored. This schedule writes the single next date, not the whole list.
- `needsReview`: already stored. True after a miss, until the on-ramp item is answered.

Stop treating `reviewPlan` as three dates written up front. On a success at 1 day, mark the `skill_reviews` day row done. At 7 days, mark week done, so Let them move ahead still opens. At 30 days, mark month done. The 3-day and 14-day steps do not get a `skill_reviews` gap. The check constraint on `gap` stays `day | week | month`.

`attempts.kind` is the one column worth adding later, so delayed recall is countable. Sketch only. Do not run it.

```sql
-- Not applied. Do not run this from the app or from this spec.
alter table public.attempts
  add column if not exists kind text
  check (kind in ('focus', 'review', 'check', 'support'));
```

Until that column exists, do not pretend `attempts` can separate review from focus. Both rows share `skill_id`.

Generated items stay `getItemSource("generated")` in `lib/practice/source.ts`, backed by `lib/practice/bank.ts` and `lib/practice/skills.ts`. `public.skill` is the curriculum row whose slug is the practice id. `content_items` ([PR #17](https://github.com/jssrussell15-afk/masterasium/pull/17)) has a `review` lane and is not merged. Do not serve draft rows. Do not call a model to write a review question.

### Edge cases

- No confirmed skill yet: zero review items. The session is the current skill.
- Placement not saved: same. Do not review the five check items.
- The child picked a topic (`explicit` in `planNextQuestion`): question 1 is that skill. Later slots may still weave a due skill.
- A focus mix and a review want the same slot: mix wins, review takes the next legal slot.
- Two children: state is per `child_id`. Never combine them.
- A review miss must not change the working grade or start the focus-skill rollback.

### How to measure

Delayed-recall accuracy: first-try correct, no Show me, on items that were due that day, divided by due items asked. Split by interval (1, 3, 7, 14, 30). Internal only. No number on the child screen, in the digest line, or in the daily draft. The parent line stays "Kept fractions fresh."

### Open questions

- Is 30 days the longest interval, or do we add 60 after a month of clean recalls?
- Should the on-ramp count as the review item, or sit beside it inside the same slot?
- When `attempts.kind` is allowed, who applies the migration? Not this spec.

### Suggested draft PRs

1. Pure picker: 2–3 due skills, slots 3, 6, and 9, no backfill. Tests only. Remove the kid-home review notes in the same PR.
2. Write `recallStep` and the single `reviewDueAt` on success and on a miss. Mark day, week, and month rows when those intervals succeed. No SQL.
3. Quiet on-ramp copy and the one-step re-teach. No grade change.
4. The weekly line on the digest draft only. Do not send mail.
5. The `attempts.kind` migration as its own draft, not applied, when Matthew asks for the metric.

### Mixed practice, later

Interleaving builds on these slots. Once three or more skills are confirmed, a later draft may fill a spare slot with a sibling from the same strand even when that sibling is not date-due. Same cap, same unlabeled card, same rule that question 1 is the current skill. Do not build that in the PRs above. The internal `kind: "review"` and the slot list are the seam.

## 2. Show me that fades

Not built. Depends on the walk in PR #10. Reuse the standard fade from PR #20. Do not merge either PR from this note. Do not use the buggy style here.

### Goal

Support steps down per child per skill as the work gets steady, and steps back up after misses or a long gap. Show me stays available. The child is never told they were demoted.

### Kid experience

The button stays "Show me". One read-aloud control, in the caption bar only: `ReadAloud` inside `.speak-row` in `components/show-me.tsx`. It reads the current caption and nothing else. The walk branch shows Speak. This spec's visible word for that same button is Listen. Change the word. Do not add a second button on the picture, the step list, or the keypad.

Levels:

- Level 1. Full worked example, every step. Captions already in the walk, such as "Add the ones first." Last step, the child types. Then "Your turn: try one like it."
- Level 2. Early steps stay filled. The child fills one or two key steps, the ones `fadeCount` already blanks. Line: "You fill this step."
- Level 3. One hint line, from `hintLadder` in `lib/practice/hints.ts`. Keep it under 15 words when the source line allows. No walk until they tap Show me.
- Level 4. No prompt. Show me is still on the card. A tap shows the hint. A second tap on that same question opens the level 2 walk, or "Here's how" when the skill has no step spec.

A miss inside the walk keeps "Look once more." A correct answer keeps "That's right."

Grades 1–2: when a caption appears, speak it with the same control (`en-CA`). Listen stays for a replay. If `speechSynthesis` is missing, `ReadAloud` already renders nothing, and the step still shows. Do not add a chime.

### Rules

Store one level per child per skill. New skills with a walk start at 1. Skills `walkForSkill` does not cover start at 3 and never grow a fake walk. They use the text example and the hint.

Step down one level on a first-try correct that did not open Show me, and only when `consecutive_correct` has reached the bar for the current level.

- Grades 3–8: leave 1 at 3, leave 2 at 5, leave 3 at 8.
- Grades 1–2: leave 1 at 5, leave 2 at 8, leave 3 at 12. Also stay at level 1 until the skill has been practised on two different Toronto days.

Opening Show me on an item records that item as not a first try, which `reduceFeedback` already does for "Show me how". That item does not step the level down. The later "your turn" item can.

Step up one level (more help, never a message) when:

- The last two finished items on this skill were both first-try misses, or
- The newest `attempts.created_at` for this skill is 14 or more Toronto days ago, on the next time the skill appears. At 30 or more days, set level 1.
- A missed spaced-review item on this skill steps it up one, so the on-ramp has an example.

Two misses on the current question still open the full guided walk for that question, as PR #20's `stuck` rule does. The stored level moves by the rules above, not straight to 1 from a single hard question.

Buggy examples stay on the styles branch. This ladder uses guided (level 1) and standard (level 2) only.

Rendering:

- Level 1 uses `ShowMePanel` and `lib/practice/walk.ts`.
- Level 2 uses the same panel and the blank tail from `fadedIndexes` / `presentedSteps`. Do not pull in `chooseShowMeStyle`. The level is sticky until the rules above change it.
- Level 3 uses the existing hint bubble.
- Level 4 renders no hint and no panel until tap.

`assistFor` still covers the first three focus attempts. At level 4 those three attempts no longer add a setup line. Grades 1–2 keep the setup line until the slower bars say otherwise.

### Data model

One field on `learn`, no new table and no SQL: `showLevel` 1, 2, 3, or 4. Absent means the default above.

Do not store the level on `content_items`. Those rows are the shared template (PR #20). The level is per child.

PR #10 logs a Show me open as `practice_events.kind = hint_rung` with `detail.rung = show-me`. Main's `lib/practice/events.ts` does not allow that rung yet (`hint`, `example`, `give-up`, `show-how`). When the walk merges, extend the allow-list. Do not log the level to the child.

Parent desk lines already drafted on those PRs stay parent-only: "Used Show me on 3 questions", and "Checked a worked example for mistakes". Do not add them to the weekly email. Do not show them to the child.

### Edge cases

- No step spec: levels 1 and 2 both use `buildWorkedExample`. If that returns null, use "Here's how" and the hint. Do not call a model.
- Grade 1–2 auto speech is cancelled when the next caption appears, the same way `speechSynthesis.cancel` already works.
- A long gap and a miss on the same day step up once, not twice.
- Placement and move-ahead do not set `showLevel`. A next-up skill starts at the default for its grade.
- Refresh keeps the walked item from becoming a first try, as PR #10 already requires.

### How to measure

Internal only. After a step down, the share of later items on that skill that are first-try correct over the next seven days. A step back up inside those seven days means the fade was too fast. No kid-facing number. The retention number for the product is still delayed-recall accuracy on review items (section 1).

### Open questions

- At level 4, should the first tap open the hint, or the level 2 walk?
- Grades 1–2 speech rate: 0.85 is the proposal. Confirm with a tablet listen.
- Does level 1 auto-open on the first miss, or only when they tap Show me? This note auto-opens the full walk on a miss only at level 1, and on two misses at any level.

### Suggested draft PRs

Stack these on the walk branch. Leave each one a draft. Do not merge PR #10 or PR #20 here.

1. Read and write `showLevel` on `learn`, with defaults. No UI.
2. Level 1 renders `ShowMePanel`. Rename the caption-bar control to Listen.
3. Level 2 blanks the last `fadeCount` steps inside that same panel.
4. Levels 3 and 4: hint, then tap-only, second tap opens the faded walk.
5. Step-down and step-up rules, including the Grade 1–2 bars, the two-day hold, and auto Listen on the caption.

## Open questions / non-goals

- Do not send email from this note. The weekly line waits for the mailer in `docs/dashboard-and-email-spec.md`.
- Do not apply SQL from this note. The `attempts.kind` sketch waits for Matthew.
- Do not mount streaks, badges, or reward sounds. `consecutive_correct` stays internal.
- French and Quebec are out of scope.
- Buggy Show me, and mixed practice beyond the review slots, are later notes.
- If a new column stores more child history, get a privacy lawyer review first. COPPA still holds: never collect a parent email from the child.
