# Masterasium resource component plan

**Status:** This is a starting ranked list to react to. It is not final.
**Date:** October 23, 2026
**Audience:** Matthew and the build team (internal planning doc)

---

## 1. Ranked resource list (most effective first)

The ranking is by expected learning impact for a Grade 1–3 child first. Brand appeal comes second. It draws on well-replicated learning research, not only on what IXL, Khan Academy or Duolingo do:

- **Worked-example effect** (Sweller; Atkinson, Renkl and others): studying a solved example beats solving cold, especially for beginners.
- **Faded worked examples** (Renkl and Atkinson): help that shrinks step by step as competence grows beats both full help and no help.
- **Retrieval practice** (Roediger and Karpicke): recalling an answer builds memory more than rereading does.
- **Spaced practice** (Cepeda and others): practice spread over days beats the same practice crammed into one sitting.
- **Interleaving** (Rohrer and Taylor): mixing problem types helps kids learn to pick the right method.

| Rank | Resource | Why it ranks here | Research it leans on |
|---|---|---|---|
| 1 | **Adaptive hints that fade as the child gets answers right** (our differentiator) | Gives full support at first, then pulls it back as the child succeeds. Few kids' products do this per skill. | Faded worked examples, retrieval practice |
| 2 | **In-browser interactive practice, spaced and interleaved** | This is where retrieval actually happens. Spacing ("from last time" items) and mixing skills turn practice into lasting memory. | Retrieval, spacing, interleaving |
| 3 | **Printable sheets with worked examples** | One solved example, then similar problems. Works away from screens and suits families who limit screen time. | Worked-example effect |
| 4 | **Short skill explainers** (a few sentences plus one visual) | A fast "what is this skill" before practice, for the child and the parent. | Worked-example effect (short form) |
| 5 | **Short videos (2–4 minutes): a teacher talking through one example** | Good for kids who learn by watching and listening. Keep to one example, with no extra lecture. | Worked examples with spoken explanation |
| 6 | **Parent-facing write-ups** | Explain the method and how to reinforce it at home. They help indirectly by making home help consistent with the app. | Supports spacing and retrieval at home |
| 7 | **On-demand AI-generated practice** | More variety and volume, but only useful if it is checked. Ranked lower because quality control matters more than quantity. | Retrieval (more items) |
| 8 | **Free sample practice session** (try before you buy) | A conversion hook, not a learning tool by itself. It shows parents the product working. | — |

**Constraint for rank 7:** Math practice never calls live AI. AI-generated practice should be generated ahead of time, checked by our curriculum QA, and served from the bank. It should not be generated live while a child is practising.

---

## 2. Free vs paywall split

| Free | Paywalled |
|---|---|
| Printable sheets with worked examples (a starter set) | Full adaptive practice (fading hints, spacing, interleaving) |
| Short skill explainers | Complete printable library |
| Parent guide to the method | Progress reports |
| One sample practice session | On-demand AI-generated content |

**Note:** Public copy still says "free while we test." No prices should appear on the site until that decision changes.

---

## 3. Delivery methods

1. **Printable sheets:** PDFs sized for US Letter and A4, with one worked example at the top and large writing space.
2. **Short videos:** 2–4 minutes, with one teacher and one example. Include captions and keep the visual quiet.
3. **Write-ups:** short web pages for parents and skill explainers, readable on a phone and read-aloud friendly for kids.
4. **In-browser interactive practice:** the existing practice flow on tablets and phones. Grades 1–2 answer with choices, with Check pinned to the bottom and tap targets of at least 48px.

---

## 4. Parent dashboard visual notes

Keep it quiet: no confetti, badges or points.

- **One progress bar per skill.** Use plain states (not started, in progress, mastered).
- **Simple weekly trend line.** Practice sessions or questions answered per week. The data already flows into the dashboard, so the chart earns its place now.
- **"Small streak":** requested here, but it conflicts with the standing "no streaks anywhere" rule. Suggested alternative: a neutral count such as "Practised 3 of 7 days this week," with no chain to break and no loss framing. **This needs a decision.**

---

## 5. Open questions to react to

- Is the ranking right, especially fading hints above interactive practice, and videos above parent write-ups?
- How many printable sheets go in the free starter set (for example, one per skill, or one per grade)?
- Do we want a streak or the neutral weekly count?
- Who records the videos, and do we start with Grade 1 only?
