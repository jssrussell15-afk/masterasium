# Show me styles: notes for Benjamin and Oliver

The style is chosen again each time Show me opens. It can be guided, standard, or buggy. A child who misses the same question twice always gets guided.

## Force a style

On a dev server, set `SHOW_ME_STYLE` to `guided`, `standard`, or `buggy` before the practice process starts. Production ignores that variable.

The review page accepts `?style=` even in a production build, because it is the walkthrough page:

- `/preview/show-me-styles?style=guided`
- `/preview/show-me-styles?style=standard`
- `/preview/show-me-styles?style=buggy`
- `/preview/show-me-styles?style=fix`
- `/preview/show-me-styles?style=fallback`

## Walk one child through all three

With the app running:

```bash
node scripts/walk-show-me-styles.mjs http://127.0.0.1:3000
```

Open the three style links in order for that child. On buggy, tap a correct step once and read the nudge. Tap the wrong step and fix it with the keypad. Then open buggy again and tap two correct steps to see the guided fallback.

## What to watch

- Confusion on the buggy example: a long pause, tapping every line, or asking what “wrong” means.
- Frustration: sighing, leaving the keypad, or asking to skip.
- Whether the child says out loud why the step was wrong after “Why was that step wrong?”
- Time on task: a buggy example should take longer than guided, and the fallback should feel calmer than a third wrong tap.

Write the style the selector logged, and whether the child was stuck on that question. Do not coach the answer.
