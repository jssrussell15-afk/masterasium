# From last time (2026-10-22)

This note is for Matthew and for Cursor coding agents. It specifies two quiet recall questions at the start of practice, on what the child learned last time. It does not authorize a mailer, a migration, or a merge.

Tone for anything a parent or child sees: quiet and focused. No points, streaks, badges, confetti, timers, reward sounds, or mascots. Kid-facing lines stay encouraging, never a score, and under 15 words. Practice makes no live AI calls. Questions come from the generators already in the repo.

Spelling and French are not in the repo. Those sections are forward specs. Maths is the only subject this note can build.

## What practice already does

Use these pieces. Do not invent a second scheduler beside them.

A sitting is 10 questions (`PRACTICE_SET_SIZE`). The chip in `components/practice-session.tsx` counts in the browser and resets on refresh. Review slots are questions 3, 6, and 9 (`reviewQuestionsInSet`), indexed by the sum of `skill_states.attempted`, not a stored sitting. Empty slots stay empty. A confirmed skill that is not due is not filler.

The ladder is `skill_states.fsrs.learn`. `recallStep` 0 to 4 means 1, 3, 7, 14, and 30 days. Absent means 1 day. Zero is stored. Two `recallMisses` in a row set the step to 0. `recallFreshOn` feeds "Kept fractions fresh." `applyRetest` climbs one step on a due item that was first-try correct with no worked example. A miss steps back one, sets `needsReview`, and sets `reviewDueAt` to today. Check and support do not move it.

The next skill opens on `isConfirmed`: a passed lesson check, or 10 attempts at 80% when the card has no check (`isMastered`). A comment in `scheduler.ts` calls that gate steady. There is no `steadyOn` yet. This note keeps the gate. Section 3 gives steady its own, later meaning. Show me (`applyShowOnAttempt`) steps down after 3, 5, and 8 correct in a row in Grades 3–8, and after 5, 8, and 12 in Grades 1–2. Level 1 in Grades 1–2 also waits for two Toronto days. One review miss steps support up. A 14-day gap steps up once. Thirty days returns to the full example. The same day does not step up twice.

`attempts` has no kind, subject, or session. Kind lives in `pending_questions.answer`. `persistQuestion` deletes every pending row for the child. The same `client_attempt_id` inserts once, and `learning_applied` is claimed once. Students are `anon` via `current_student_id()`. Parents are `authenticated` via `auth.uid()` and may read scores, not prompts. There is no UPDATE policy on `children`. Dates use `torontoDate`. Nothing is emailed. Grades in code are 1–8. Grades 1–2 get tap tiles from `practiceChoices` for a whole number. The keypad still mounts for a numeric shape. inputType, which hides it on laptops, is not on main. `consecutive_correct` stays internal.

## 1. Purpose

Last time's work is asked again before any help is on the card. That is retrieval practice. Roediger and Karpicke (2006, *Psychological Science*, [doi 10.1111/j.1467-9280.2006.01693.x](https://doi.org/10.1111/j.1467-9280.2006.01693.x)) found a test beats a second study. Adesope, Trevisan, and Sundararajan (2017, [doi 10.3102/0034654316689306](https://doi.org/10.3102/0034654316689306)) put the testing effect at g = 0.61. Agarwal, Nunes, and Blunt (2021, [doi 10.1007/s10648-021-09595-9](https://doi.org/10.1007/s10648-021-09595-9)) found it in classrooms. Spacing holds the gain: Cepeda and colleagues (2006, [doi 10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354); 2008, [doi 10.1111/j.1467-9280.2008.02209.x](https://doi.org/10.1111/j.1467-9280.2008.02209.x)). Dunlosky and colleagues (2013, [doi 10.1177/1529100612453266](https://doi.org/10.1177/1529100612453266)) rated practice testing and distributed practice as high utility. Jones and colleagues (2016, [doi 10.1007/s10648-015-9330-6](https://doi.org/10.1007/s10648-015-9330-6)) found retrieval helps Grades 1–2 spellers. Kulik, Kulik, and Bangert-Drowns (1990, [doi 10.3102/00346543060002265](https://doi.org/10.3102/00346543060002265)) found a mastery standard helps. Here that standard is the later-day recall. Same-day success still opens the next skill. Asking before the example is a desirable difficulty (Bjork and Bjork, 2011). The card stays calm.

## 2. Where it sits

It opens the day, in every subject, before a new skill, a lesson check, or rollback support. Once per child, per subject, per Toronto day. A later set of 10 the same day does not ask it again.

When two skills are eligible, they are questions 1 and 2 of that day's first 10. They count in the 10. They do not change `attempted`, `correct`, or `consecutive_correct`.

That first set uses a sitting index: how many questions this subject already answered today, recalls included. Questions 3, 6, and 9 of that index stay the weave. The other questions stay on `planNextQuestion`. After those 10, the lifetime `sessionCount` weave returns.

A skill used in the pair is left out of slots 3, 6, and 9 for the rest of that set. The next due skill takes the slot. If none remains, the slot stays on the current skill and the kind stays `focus`. Do not fill it with a confirmed skill that is not due. Later focus questions may still be that skill. The chip for this set reads the server count, not the browser counter that resets on refresh.

## 3. What it asks

Last time is the latest Toronto day before today with an eligible attempt in that subject. Same-day work does not count. If that day is missing, skip silently. No label and no empty card. Question 1 is the current skill.

Eligible rows have `kind` null, `focus`, `review`, or `support`. `check` is out. The placement check writes no attempts, so it is already out. One question per skill.

Pick up to two, in order, newest attempt first inside a tier:

1. Newly introduced that day. The skill's earliest attempt in the subject falls on that day.
2. Near the same-day bar, and not yet confirmed. `isConfirmed` is false, and either `attempted` is at least 8 or `lessonCheck` is `active` or `retry`.
3. Misses that day (`correct` false), newest first.

Maths uses `getItemSource("generated")` and retries while the prompt matches that skill's prior day, up to 12 tries (`issueFollowUp`). One eligible skill fills question 1 only. Question 2 is the normal planner.

### Steady, the ladder, and Show me

Same-day success opens the next skill immediately. That gate stays `isConfirmed`: a passed lesson check, or 10 attempts at 80% on a card with no check (`isMastered`). Practice never stops or waits for a later day.

That same-day success is not mastery. It does not set `learn.steadyOn`. The skill stays on the review ladder and is asked again on a later Toronto day, by From last time or a woven slot at 3, 6, or 9. The first step is due no sooner than tomorrow. If `reviewDueAt` is missing, today, or earlier, set `recallStep` to 0 and `reviewDueAt` to `addDays(today, 1)`. If a later date is already stored, keep it. Do not set `needsReview`.

Mastery is `learn.steadyOn`. It is earned only by a clean success on a later Toronto day than the skill was introduced. Clean means first-try correct, and Show me stayed closed. From last time and a woven review both count. A same-day success does not set it. A later miss does not clear it, and does not send the skill back to "not started".

Do not backfill `steadyOn` from `isConfirmed` or from `introSeenAt`. A card that is already confirmed still opens the next skill, and it is re-asked on a later day. Until `steadyOn` is set, parent and dashboard copy does not say mastered. The visible word "Mastered" (`masteryLabel` in `lib/practice/mastery.ts`, and `skillStatusLabel`) waits for `steadyOn`. Same-day confirmation stays "In progress" on the parent desk. The topic list uses that same rule. Internal `isMastered` keeps its name and still opens the path.

Show me keeps its bars and the Grade 1–2 two-day hold. It cannot step down before `steadyOn`, including when this success sets it. A recall miss steps support up one, like a review miss, unless a gap already stepped it up today. The recall does not change `consecutive_correct`.

A miss on that later-day re-ask uses the step below. From last time always uses it. A woven slot uses it until `steadyOn` is set, and does not open a same-day on-ramp. After `steadyOn`, a due miss on a woven slot keeps today's `applyRetest`.

After the `learning_applied` claim wins:

- A miss uses the `applyRetest` step. `recallMisses` gains one. The step goes back one, or to 0 when misses reach 2. `needsReview` and `recallMark` clear. `recallFreshOn` stays. The next date is `addDays(today, intervalDays(newStep))`, so at least tomorrow. If the old `reviewDueAt` is still after today and earlier than that, keep the old date. The stored date is the sooner future date. It is never today, so this sitting does not ask the skill again.
- A clean success on a skill that was already due follows the success half of `applyRetest`, including the repair when `needsReview` was set, and may set `recallFreshOn`. The weave will not ask it again today.
- A clean success that was not due does not change the step, the due date, or `recallFreshOn`. It can still set `steadyOn`.

## 4. What the child sees

The eyebrow is "From last time". No skill title, no "Review", no points. Listen is the same pill (`ListenButton`). Grades 1–2 still auto-read. One control. No chime.

Until the first answer is in, hide "Help me with this", "Show me an example", and "Show me", and hide the assist line. Do not auto-open the level 1 walk. The first answer is the one that counts.

A correct answer stays "That's right."

A miss shows one line, then the help row. Show me uses the stored level and does not auto-open. A later correction does not repair the ladder. Next moves on.

Miss lines, each under 15 words:

- Maths and French: "We'll come back to this one."
- Spare: "That's okay. We'll see it again."
- Spelling, beside the split in section 5: "Here is how the word is built."

Do not say "You forgot" or "Back to grade 2".

### End of the set

After a clean run, the end of a set of 10 may suggest a stop. A clean run means the skill just reached same-day confirmation, or the set ends on 3 or more first-try answers with Show me closed. The line shows at most once per Toronto day. It never shows mid-set.

One quiet line, then two choices of equal weight. Matthew's line: "Nice work today, this one's saved for tomorrow."

Two other lines, each under 15 words:

- "Good work today. We'll see this one again tomorrow."
- "You did well today. This one waits until tomorrow."

The choices are "Done for today" and "Keep going". Neither is the default. There is no timer, and the screen does not block. "Keep going" opens the next skill as usual. "Done for today" leaves practice. Coming back later that day continues, and the line does not show again.

Listen reads the line with the same pill. Each choice is a tap target of at least 48px. The nudge writes no attempt and does not move the ladder, `steadyOn`, or `consecutive_correct`. The once-a-day memory is a Toronto date for that child. It is not a score.

## 5. Maths, spelling, and French

Maths is live. The recall is a new problem of that skill. Grades 1–2 tap `practiceChoices`. Once inputType is on main, a laptop hides the keypad. Until then, do not add a keypad beside tiles. Grades 3–8 type. Grades 9–12 are not in the catalog. When they exist, they type.

Spelling is not built. Do not invent a word list, and do not call a model to split a word. When words exist, Listen reads the word and the screen does not show it. The child types it. No letter tiles, including Grades 1–2. A miss shows the stored graphemes and phonemes, then "Here is how the word is built." Pattern only: ship is sh · i · p, sounded /sh/ /ɪ/ /p/. That is orthographic mapping (Ehri, 2014, [doi 10.1080/10888438.2013.819356](https://doi.org/10.1080/10888438.2013.819356)). The same word may be reused. Do not store a recording.

French is not built. Do not invent phrases, and do not call a model. The pair is one French-to-English item and one English-to-French item. One word asks one direction and does not grow a second word. The prompt shows the source language only. Grades 1–2 tap the translation. Older students type. The word may be reused.

`persistQuestion` deletes every pending row for the child. Maths can keep that. A second subject must scope that delete, so one subject does not drop the other's question.

## 6. What a parent reads

Nothing is sent. Daily still waits for 5 or more answers that Toronto day. Weekly still stays quiet when the week had no practice. No recall means no recall line. One sentence, phone width, no percent and no table.

The weekday comes from `recall_of` in `en-CA`. The topic uses `topicFromTitle`, two topics at most. "Kept fractions fresh." stays. This sentence sits beside it.

- 2 of 2: "Remembered 2 of 2 from Tuesday."
- 1 of 2: "Remembered 1 of 2 from Tuesday. Fractions came back for another look." The topic is the one they missed.
- 0 of 2: "Fractions came back for another look." Two topics: "Fractions and time came back for another look."

One eligible item is "Remembered 1 of 1 from Tuesday." or, on a miss, the come-back line. Maths omits the subject. On a day with two subjects, name the other one: "Remembered 2 of 2 from Tuesday in spelling."

The parent desk says "Mastered" only when `steadyOn` is set. Same-day confirmation stays "In progress". The sentences above stay word for word.

The daily stub may store the sentence. The mailed body still drops the stub's counts and accuracy. `sendSundayDigest` stays a no-op.

## 6a. Weekly dinner-table question (optional)

One optional maths question each week. It belongs in the Sunday digest only, never in the daily note. It is a suggestion, not a task. Sample: "Try this at dinner: ask Oliver to explain how carrying works."

Draw it from a maths skill the child practised that week. Prefer one with `steadyOn` set, so the child can explain it. If several are steady, use the one practised latest that week. If none are steady, use the skill they answered most. Plain parent words, no jargon, one sentence, phone width. The child's first name replaces Oliver.

The same line adds one calm fallback for a stuck moment. Sample: "If they get stuck, ask them to show you with their fingers."

These pairs are fixed templates, keyed by skill id. They are not written by a live model. Use a pair only when that skill was practised. If the week's skills have no template, omit the line.

- Addition and subtraction within 100 (`g2-add-sub`) and within 1,000 (`g3-add-sub`): "Try this at dinner: ask Oliver to explain how carrying works." "If they get stuck, ask them to show you with their fingers."
- Equal sharing (`g1-share`): "Try this at dinner: ask Oliver how to share 8 grapes fairly." "If they get stuck, ask them to give one to each person."
- Place value (`g1-place`, `g2-place`, `g3-place`): "Try this at dinner: ask Oliver what the 4 in 47 means." "If they get stuck, ask them to show the tens with blocks."
- Time to the minute (`g3-time`): "Try this at dinner: ask Oliver what half past six looks like." "If they get stuck, ask them to point to it on a clock."

Parents can ignore it. There is no consequence. Nothing tracks whether it was used. No click tracking, no reply prompt, no follow-up. It does not change the child's practice or the ladder. No new column stores a parent's response.

The evidence is weaker than the recall opener. Berkowitz, Schaeffer, Maloney, Peterson, Gregor, Levine, and Beilock (2015), "Math at home adds up to achievement in school", *Science* 350(6257):196–198, [doi 10.1126/science.aac7427](https://doi.org/10.1126/science.aac7427), linked a math app used at home with parents to gains, especially for children of math-anxious parents. That study used an app, not this dinner line, so the evidence is indirect. The line still reaches parents who never open the site.

The weekly activity gate still holds. No practice that week means no email, and so no dinner line. The line is phone-sized and quiet, with no scores. It does not replace "Kept fractions fresh." or the remembered lines in section 6. `sendSundayDigest` stays a no-op.

## 7. Data

No new table. `steadyOn` is a date on `learn`. Students already update their own `skill_states`.

`attempts` needs three columns so the parent line does not read the prompt. Sketch only. Do not run it, and do not add a migration file.

```sql
-- Not applied. Do not run this from the app or from this spec.
alter table public.attempts
  add column if not exists subject text not null default 'maths';

alter table public.attempts drop constraint if exists attempts_subject_check;
alter table public.attempts
  add constraint attempts_subject_check
  check (subject in ('maths', 'spelling', 'french'));

alter table public.attempts add column if not exists kind text;

alter table public.attempts drop constraint if exists attempts_kind_check;
alter table public.attempts
  add constraint attempts_kind_check
  check (kind is null or kind in ('focus', 'review', 'check', 'support', 'recall'));

alter table public.attempts add column if not exists recall_of date;

create index if not exists attempts_recall_lookup_idx
  on public.attempts (child_id, subject, created_at desc);

grant select (subject, kind, recall_of) on public.attempts to authenticated;
```

Null `kind` stays eligible. New check rows set `check` and stay out. Recall rows set `recall`, `subject`, and `recall_of` to the prior Toronto day. Do not grant `anon` an update on these columns. The only attempt update stays `learning_applied`.

No write on `children`. Do not add an UPDATE policy there. Do not add a security-definer RPC. The student already inserts attempts and updates `skill_states` under `current_student_id()`. If Matthew later asks for an RPC, match the live ones: `security definer`, `search_path = public`, `revoke all` from `public`, `grant execute` to one role, and check `current_student_id()` or `auth.uid()` inside.

Prior day, run as the student. This is the SQL form of `torontoDate`:

```sql
select (created_at at time zone 'America/Toronto')::date as session_day
from public.attempts
where child_id = public.current_student_id()
  and subject = 'maths'
  and (kind is null or kind <> 'check')
  and (created_at at time zone 'America/Toronto')::date
      < (now() at time zone 'America/Toronto')::date
order by created_at desc
limit 1;
```

Then read that day's rows for the same child and subject. The pending plan may store `kind: "recall"` once `readStoredPlan` allows it. Until the columns exist, the digest cannot see a recall.

## 8. Edge cases

A gap of days still uses that older day. Show me gap rules still run, and a gap plus a recall miss steps support up once, not twice. Each subject has its own prior day. Two children stay on their own `child_id`.

A new device loads the pending question from the server. An unsent draft stays in that browser's `localStorage`. The question does not become a new first try. `set_starting_point` and `save_placement` delete pending rows only, so last time can still recall a practised skill, including one now before the anchor. The recall does not move `startSkillId`. Nothing on main clears attempts except deleting the child. After a wipe, skip until a new prior day exists.

Fewer than two eligible skills asks one, or skips. Do not pad from an older day, a check, or placement. A missing `skillById` is skipped. A retry with the same `client_attempt_id` does not step the ladder, `steadyOn`, or Show me again. A dropped save keeps the pending row and the attempt mark.

## 9. Out of scope

Points, streaks, badges, confetti, celebrations, timers, reward sounds, and mascots. Live AI. Any interval besides 1, 3, 7, 14, and 30. Sending email, applying the SQL, spelling or French content, and Grades 9–12. No click tracking, reply prompt, follow-up, or reward for whether a parent used the dinner line. COPPA still holds: never collect a parent email from the child. Listen does not record the child.

## 10. Acceptance

Docs only until Matthew asks for a build.

- [ ] No prior Toronto day: question 1 is the current skill, with no "From last time" label.
- [ ] A prior day: the pair is questions 1 and 2 of the day's first 10, before a new skill, a check, or support. The next set that day has none.
- [ ] The pair does not change `attempted`, `correct`, or `consecutive_correct`.
- [ ] Slots 3, 6, and 9 still come from `reviewQuestionsInSet`. A recall skill is absent from them. An empty slot stays on the current skill.
- [ ] Pick order is new, then near mastery, then newest misses. One skill once. Maths avoids the prior prompt inside 12 tries.
- [ ] Help and Show me stay hidden until the first answer. A miss uses a section 4 line, under 15 words. Level 1 does not auto-open. "That's right." stays.
- [ ] A miss steps the ladder as in section 3 and does not set `reviewDueAt` to today. Two misses in a row on that skill set step 0.
- [ ] Same-day confirmation opens the next skill at once. Practice does not wait.
- [ ] That skill is re-asked on a later Toronto day, by From last time or a woven slot. The first ladder step is due no sooner than tomorrow. Same-day confirmation does not set `steadyOn`.
- [ ] `steadyOn` is set only by a clean success on a later Toronto day. Do not backfill it from `isConfirmed`. Parent and dashboard "Mastered" waits for that date.
- [ ] Show me does not step down before `steadyOn`. A later-day miss steps the ladder back as in section 3. A recall miss steps Show me up once, and not twice on a day a gap already did.
- [ ] The end-of-set line never blocks, shows at most once per Toronto day, and never mid-set. "Keep going" opens the next skill. The nudge does not count an attempt or move the ladder.
- [ ] "Done for today" and "Keep going" each have a tap target of at least 48px. Listen reads the line aloud.
- [ ] The same `client_attempt_id` does not step the ladder twice. Cover this in `review.test.ts`, `fade.test.ts`, `learning-claim.test.ts`, and `lib/digest/build.test.ts`.
- [ ] Parent lines match 2 of 2, 1 of 2, and 0 of 2. The sentence has no accuracy percent. No email is sent.
- [ ] The dinner line is on the Sunday digest only, never the daily draft or daily email, and only when that week had practice. Nothing records a click, a reply, or a follow-up, and practice and the ladder stay as they were.
- [ ] These stay word for word: "Remembered 2 of 2 from Tuesday.", "Remembered 1 of 2 from Tuesday. Fractions came back for another look.", "Fractions came back for another look.", and "Kept fractions fresh."
- [ ] SQL stays the sketch in section 7 until Matthew asks. A later migration adds no UPDATE policy on `children`.
- [ ] Screenshots of the card, a miss, and a correct answer, at tablet width and at 1366×768. Grades 1–2 show tap tiles and no laptop keypad. Listen is the only read-aloud control.
