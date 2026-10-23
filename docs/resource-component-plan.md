# Masterasium resource component plan

**Status:** This is a starting ranked list to react to. It is not final. Section 6 records decisions from Matthew's review.
**Date:** October 23, 2026 (decisions added the same day)
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

---

## 6. Decisions from Matthew's review (October 23, 2026)

These decisions override anything earlier in this doc that conflicts with them.

### 6.1 French is in scope
- French is in scope for the French immersion markets in **Ontario, New Brunswick and Nova Scotia**.
- Masterasium does **not offer the Quebec curriculum**. French content follows the French immersion programs in Ontario, New Brunswick and Nova Scotia.
- The worksheet generator must support French accents (é, è, ç). It currently strips them. The fix is to embed a font that includes accented characters and stop the text cleanup from removing non-ASCII characters.
- French sheets use French labels: **Nom**, **Date**, **Consignes** and **Corrigé**.
- This replaces the line in `docs/dashboard-and-email-spec.md` that says French is out of scope. That spec should be updated to say French is in scope and the Quebec curriculum is not offered.

### 6.2 No score box, and no scores for kids
- Remove the Score box from the worksheet generator.
- Kids never see a numeric score. Mastery is the key measure.
- Kids may see how they are doing on the way to mastery, for example "In progress" or "Mastered."
- The parent dashboard shows progress data that explains how the child is moving toward mastery, not a particular score.
- This also settles section 4: no score appears anywhere on the dashboard or on sheets.

### 6.3 Generator bugs to fix before the sheets library ships
1. A wording bug: "Tuesday has 1 stars" (plural used with 1).
2. French accents (é, è, ç) are stripped, and × is turned into "x" (and ÷ into "/").
3. Worked examples, multiple-choice options and pictures (such as fraction bars) are dropped from printed sheets.
4. The answer key is not laid out to match the worksheet. It should use the same grid and numbering.

### 6.4 Paper size: US Letter first, A4 as an option
- **US Letter is the primary format for both Canada and the US.** Our research found that Canadian schools mostly print on US Letter, since Canada's own paper standards were withdrawn in 2012 ([summary](https://papersizes.guide/regional/canada/p4-canada/)).
- **A4 stays available as a secondary option** for families and schools that print on A4.
- Keep every layout inside the shared 8.27 × 10.75 in safe area so a sheet prints cleanly on either size.
- Paper size still follows the user's region and choice, not their curriculum.

### 6.5 One domain with region detection
- One domain (masterasium.com) and one codebase.
- The backend detects the user's region and serves the right curriculum, language and default paper size (US Letter unless the user picks A4).
- A manual **Canada / US** toggle in the footer overrides detection when it gets it wrong.
- **Region decides the format, and curriculum decides the content.** For example, a Canadian user on the US curriculum still gets Canadian defaults for format.

### 6.6 Order of work
1. Sheets library (including the bug fixes in 6.3, the score box removal, and A4 as a secondary option).
2. Upload flow (a teacher uploads a worksheet and gets similar questions).
3. French.
