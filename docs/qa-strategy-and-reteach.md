# Strategy tags and re-teach: notes for Benjamin and Oliver

Two sibling drafts sit on the content store branch. This page is the re-teach and catch-up draft. The strategy tagger is the other draft. Manipulatives here write the same compact trace that tagger reads.

## Force a path

On a dev server, before the practice process starts:

- `RETEACH_FORCE=1` starts a re-teach even when the miss streak is short.
- `CATCH_UP_VARIANT=1` keeps the catch-up manipulative stage.

Production ignores both. The review page still accepts `?scene=`.

## Walk one child

With the app running:

```bash
node scripts/walk-reteach.mjs http://127.0.0.1:3000
```

Open the links in this order for that child:

1. Base-ten blocks. Group 10 ones with a finger, then with the keyboard.
2. Number line. Set the jump size, then jump with a tap and with Arrow Right.
3. Fraction bars. Shade a part.
4. The step-back line, then the guided example.
5. The line that returns to the question they left.
6. The parent notes.

On the strategy draft, also open `/preview/strategy?scene=pattern`, `mixed`, and `few`.

## What to watch

- Does the step back feel like a punishment, or like a relief?
- Do they understand “Let's go back to where we were.”?
- Can they use each tool on a tablet with a finger? Targets should be easy to hit. Nothing should bounce or chime. Speak should read the question in the device voice.
- Does the strategy tag match what you saw them do?

Founder: for 10 questions, write the inferred tag next to your own note of what the child did. Say where they differ.

Do not coach the answer.
