# Dashboard and email spec (2026-10-19)

This note is for Matthew and for Cursor coding agents. It records the parent desk that is already live, and the weekly email, daily email, and kid dashboard that are not. Placement is already in the product through [PR #29](https://github.com/jssrussell15-afk/masterasium/pull/29). This file does not reopen that design and it does not authorize a mailer.

Tone for anything a parent or child sees: quiet and focused. No streaks, points, badges, confetti, or reward pressure.

## Context — placement diagnostic (already shipping via PR #29)

A parent signs up on their own device and confirms the child's grade. The first time practice opens, Grades 3 and up do a short check. The child never sees a score or a placement grade. The next screen is the first real practice question.

- Grades 1–2: skip the diagnostic. Confirm the grade. Line: "We'll start with the basics and adjust as we go."
- Grades 3–6, and Grades 7–8 under the same rule in the shipped PR: five questions. Two from the previous grade's core skills, three from the stated grade.
- Adaptive early stop: miss two in a row on prior-grade items, and place the child at the prior grade.
- Clear all five: start at the stated grade, and flag ready-for-more on one strand.
- Kid results: one encouraging sentence, never a score, then straight into the first real practice question.
- Parent reason line, on the dashboard and in the digest draft: "We started [name] on [topic] at grade [X], the strongest place to build from." Cleared-all variant: "[Name] looks ready for more in [strand], so we'll mix some in."
- Parent override: "Change starting point" on the parent dashboard, only after that child has a placement on file. Two choices: start at the child's grade, or pick a topic. Confirmation: "We'll still adjust as [name] practises." The override only moves the starting skill. Adaptive practice continues.
- COPPA: never collect a parent email from the child. Parents sign up on their own device.

Copy for those lines lives in `lib/practice/placement.ts` (`parentStartLine`, `parentReadyLine`, `parentAdjustLine`). The dashboard renders them from `parentPlacementCopy`. Saving today's digest draft appends the same lines. Nothing is emailed.

## 1. Parent dashboard (live on https://masterasium.jssrussell15.workers.dev)

The live desk is `/dashboard` ("Your children"). One card per child, up to two. Each card is that child's progress view: enrolled grade, working grade when it differs, whether they practised today, a "Can do now" summary, and a start-practice control. Question text stays on the student login.

Skill accuracy and summary views are part of this desk. Frame them as a progress story, not a report card.

- Grades 1–3 use the short desk (`isSimpleDesk`): the can-do summary, plus, for Grade 3, "Learned this week", "Needs a little help", and "Coming up for review".
- Grade 4 and up add a skill list (mastery label and accuracy when there are attempts), "Accuracy, last four weeks", and spaced-review skill names.
- Keep those numbers quiet and about the child's own work. Do not rank children, do not letter-grade a week, and do not show this accuracy to the child.

**Product rule.** Masterasium does not use streaks, points, badges, confetti, or reward pressure.

`skill_states.consecutive_correct` is an internal learning signal. Code reads it under the name `streak`. Leave it internal. Never surface streak language to parents or children. If a sentence about recent work is useful, say "recent consistency", or leave it out.

Older streak and reward pieces are still in the repo and must stay off the screens:

- `components/streak-mark.tsx` still renders "No streak yet" and "N days in a row". It is not mounted. Do not mount it.
- `components/badge-tree.tsx` is not mounted. Do not mount it.
- `lib/practice/portrait.ts` still computes `streakDays` and `streakMilestone`. Do not print them on the desk, in a digest, or on the kid dashboard.

"Change starting point" shipped in PR #29 (`components/starting-point.tsx`). It is one post-signup setting on the parent desk, not a second settings page. Two choices: start at the child's grade, or pick a topic. After a save, the confirmation is "We'll still adjust as [name] practises." Layout is mobile-first: a phone-width column, large tap targets, no side-by-side controls that collapse into a tiny row.

The product rule is that the control appears only once that child has a placement on file. Today the desk renders it whenever the `children.placement` column is present, including before a result is saved, so a parent can set a start and skip the check. Leave that shipped control as it is until Matthew asks for a change. Do not add a second control.

Parent placement lines appear on the dashboard when a placement is on file. The same lines are appended to the digest draft text when a parent saves today's note (`lib/digest/build.ts`). That draft is not an email.

## 2. Parent weekly digest email (not built)

Not built. Do not send one from this spec.

A Sunday note preview already exists at `/dashboard/digest/[childId]` (`components/sunday-note.tsx`, `lib/digest/sunday.ts`). It is a preview. Its sections today are "What they learned", "Ask them about", and "Coming up next". The email below replaces that shape when a mailer exists. Until then, keep the preview from sending.

- When: Sunday.
- Gate: activity-gated. No kid activity that week means no email.
- Subject: the child's name plus the week's headline.
- Body: three short sections — what they worked on; where they're strong; where they're stuck.
- One link back to the parent dashboard.
- No scores. No streaks as pressure. The note is the story of the week. On-ramp language only. A start below the stated grade is a place to build from, never a demotion.
- Phone-sized. Readable in a phone email client: narrow, short paragraphs, no wide tables.
- Parent-only. Respect an opt-out if parent settings gain one later. There is no live opt-out today. The preview link "Change what this note includes" goes to `/settings` and does not send mail.

The past-sessions log on the kid dashboard (section 4) is the source this note should read, once that log exists.

## 3. Parent daily email (not built)

Not built. Do not send one from this spec.

The desk can already save a daily draft into `digest_stubs` ("Save today's summary"). `POST /api/digest` with `x-digest-secret` only checks the secret and returns `{ "status": "stubbed" }`. That stub currently includes attempted count and accuracy. The email must not. A later mailer may read the stub, but it has to drop scores and any streak field before a parent sees it.

- Activity-gated. Send only when the child answered 5 or more questions that calendar day. Minutes are not a trigger.
- Threshold: 5 or more questions answered that calendar day. Use the parent's local timezone when it is known. Otherwise use the site default, which is `America/Toronto` (`torontoDate` in `lib/digest/build.ts`).
- One short line. Example: "Oliver did 12 minutes of fractions today." Duration can appear in the sentence. The trigger is questions answered, not minutes.
- Parent only. Toggle in parent settings.
- Default the toggle off until the weekly digest is trusted. Say that in the setting: daily notes stay off until the Sunday note has been useful.
- No scores, no comparison with anyone else, and no "keep the streak" language.

## 4. Kid dashboard (not built)

Not built. After student login, `/practice` is still a skill list: Assigned, Recommended, Recently practiced, and a topic picker (`components/student-dashboard.tsx`). This section is the landing that should replace that list. Do not turn it into a game lobby.

Home navigation keeps Practice and Create as separate tiles elsewhere. This dashboard is the post-login practice landing only.

- Shown on login. Content is the previous session, not live mid-session noise. Do not update the hero while a session is in progress.
- Hero: last session. The topic, one encouraging line on how it went, and one big Resume button. Resume is the only primary action.
- One small line underneath, subjects and topics only. Example: "this week: fractions, spelling".
- No scores. No numeric streaks. Encouragement only.
- A small "past sessions" link reveals the log. The link stays quiet so it does not compete with Resume. That log is what the parent weekly digest reads.
- Target: a Grade 3 child on a tablet. One clear action. Quiet, focused style. Kid-facing copy uses the same read-aloud control as practice (`Read aloud`, `speechSynthesis`, no chime).

## Open questions / non-goals

- Email provider and send path are TBD. Do not pick a vendor or wire a sender from this note.
- Test the emails with Benjamin and Oliver before anything goes live.
- Do not merge a change that sends email without Matthew's go-ahead.
- If a mailer or the past-sessions log processes any new child data, get a privacy lawyer review first. COPPA still holds: never collect a parent email from the child.
- French and Quebec are out of scope.
