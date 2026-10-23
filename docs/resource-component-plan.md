# Masterasium resource component plan

**Status:** This is a starting ranked list to react to. It is not final. Section 6 records decisions from Matthew's review. Sections 7 and 8 (added October 23, 2026) add a research check of differentiating ideas and a starting video and content list by grade.
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

See section 8 for the planned list of explainers, videos, sheets and parent write-ups by grade.

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
- Who records the videos, and do we start with Grade 1 only? (Section 8.6 suggests a recording order.)

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

---

## 7. Differentiating ideas (research check, October 2026)

**Status:** This is a starting list for Matthew's review. It is not final. Nothing here has been built.

This section does two things. First, it checks six candidate ideas against what other kids' learning products already do. Second, it adds nine new ideas that could set Masterasium apart while keeping the quiet style. "Quiet" here means no points, streaks, badges, confetti, timers, reward sounds or mascots. Fun comes from curiosity, making things, play, stories, the real world and doing things with family.

**How the check was done.** We looked at Khan Academy (including Khan Academy Kids), IXL, Duolingo (including Duolingo ABC and Duolingo Math), Brilliant and Boddle. We also looked at other products that came up, such as Zearn, Prodigy, Seesaw, Bedtime Math and a few smaller sites. Every source listed in 7.5 was read during this check, either opened directly or read through web search results. None is cited from memory. "Nobody does it" means we did not find it in the products we checked, not that it cannot exist somewhere.

### 7.1 Ranked table (impact over effort)

Impact is our best guess at how much the idea helps a Grade 1–3 child learn, or helps a parent or teacher help them. Effort is a rough build size: **S** is days, **M** is a few weeks, **L** is a larger project. Ideas marked "(a)" to "(f)" are the six candidates. The others are new.

| Rank | Idea | Who it serves | Why it helps learning | Do others do it? | Quiet-style fit | Effort | Tier |
|---|---|---|---|---|---|---|---|
| 1 | **(e) Weekly fridge card.** A half-page printable with three questions to ask in the car or at dinner, based on what the child practised that week. | Parents, kids | Talking about math at home is linked to better math learning (Berkowitz et al. 2015, though a reanalysis questioned the size of the effect). Asking a question is also retrieval practice, which builds memory. | **Partly done.** Bedtime Math gives daily family math problems, but they are the same for everyone. Ready4K texts parents weekly tips by age, not by what the child practised. Khan Academy Kids has printable weekly planners. We did not find a card built from the child's own practice that week. | Very good. Paper, no screen, no score. | S. The Sunday note preview already has an "Ask them about" section to build from. | Paid (personalized). A generic grade-level card can be free. |
| 2 | **Family number-path board games.** Printable board games on a straight, numbered track (1 to 100), one per grade band, using a die or spinner. | Kids, families, teachers | Playing a linear number board game for about an hour improved young children's counting, number naming and sense of number size, and the gains lasted nine weeks (Ramani and Siegler 2008). A colour-only version of the same game did not help. | **Partly done.** Math for Love offers free printable card games (Tiny Polka Dot). Teacher sites sell printable games. We did not find games tied to the child's current skills in the apps we checked. | Good. Suggest a cooperative version, where everyone tries to get all the pieces home together, as well as the usual race. | S | Free (a strong reason to visit the free tier). |
| 3 | **(c) Spot-the-mistake worked examples.** The child sees a solved problem with one mistake, finds it, and fixes it. Researchers call these "erroneous examples." | Kids (Grade 3 up, carefully in Grade 2), teachers | In a study of 208 Grade 6 and 7 students, those who found and fixed mistakes in decimal problems did better a week later than those who just solved problems (Adams, McLaren and others 2014). In algebra, explaining incorrect examples helped understanding (Booth and others 2013). **Caution:** for beginners with little prior knowledge, correct examples alone worked better (Große and Renkl 2007). So for Grades 1–2, use them only after a skill is nearly mastered. | **Partly done.** Khan Academy has a few "find the mistake" exercises for Grade 6 and 7 equations. SERP's MathByExample offers free printable correct and incorrect examples for Grades 4 and 5. We did not find them in IXL, Duolingo, Brilliant or Boddle, or adaptive for Grades 1–3. | Very good. A "mix-up" is framed as normal, with a fictional child, never the real child's mistake. | S–M. Our generators can produce the example. The mistake types in `lib/practice/mistakes.ts` give a start. | Paid in practice. A few sample sheets free. |
| 4 | **Teach someone (the teddy card).** A printable card: "Teach your teddy, a sibling or a grown-up how you did it." | Kids, families | Students who taught a computer "student" worked harder and learned more than students learning for themselves, especially lower achievers (Chase and others 2009, the "protégé effect"). Teaching and self-explaining are two of eight proven ways to make learning stick (Fiorella and Mayer 2016). | **Nobody does it** in the products we checked as a home routine. The research version (Betty's Brain) is a science program for older students. | Very good. The teddy is the child's own toy, not a Masterasium mascot. | S | Free |
| 5 | **(a) English and French side by side.** Each explainer and video has an English twin and a French twin, shown next to each other, so English-speaking immersion parents can help. | Immersion parents, kids, teachers | Parents who understand the method can reinforce it at home in the same way as school (see section 1, rank 6). Canadian Parents for French says parents can help with math in English using the same strategies. | **Partly done.** On the Mark Press sells printed French and English math workbooks with matching pages side by side. Rainbow District School Board posts English-narrated math strategy videos for immersion parents. Khan Academy has a separate French site aligned to France and Belgium. IXL lets parents translate skills into 90+ languages. Khan Academy Kids is English only. We did not find a digital product with side-by-side French and English explainers and videos for Ontario, New Brunswick and Nova Scotia immersion. | Good | M for explainers. L if every video is recorded twice. | Explainers free. Full set paid. |
| 6 | **(b) Mix-up videos.** A 60-second clip that plays when a child gives one specific common wrong answer (for example, adding the denominators). It explains that one mistake. | Kids, parents | Feedback that addresses the actual misunderstanding helps more than "try again." It also keeps the help short, which suits young children. | **Partly done.** Zearn's "Boosts" launch scaffolded help, sometimes a video, when a student struggles in a lesson. IXL shows a step-by-step explanation of the exact problem after a wrong answer. Brilliant gives tailored feedback and an AI tutor. We did not find a library of short videos, each tied to one named wrong answer. | Good, if the clip is optional ("Want to see this mix-up?") and never framed as failure. | M. The wrong-answer types in `lib/practice/mistakes.ts` already exist. New, skill-specific types would be needed. | Paid in practice. Clips can also sit on the free explainer page. |
| 7 | **Estimate, then check.** A weekly real-object question, such as "How many grapes are in the bowl?" First guess, then count together. | Kids, families | Estimating builds number sense, and checking gives instant, natural feedback. | **Partly done.** Estimation 180 offers free daily estimation challenges for Grades 3–8, mainly for classrooms. We did not find a home version for Grades 1–3. | Very good. No timer. A close guess is the fun part, not a score. | S | Free |
| 8 | **(f) Teacher method sheet with a QR code.** A one-page sheet explains how a skill is taught, and its QR code opens a matching practice set with no child login. | Teachers, parents | Lowers the barrier to practice. The sheet keeps home and school methods consistent. | **Partly done.** Math Practice Online and ZestMath both share practice by link or QR code with no student account. Neither pairs it with a one-page method sheet. IXL and Khan Academy need a login for practice. | Good. ZestMath adds streaks and timed games. We would not. | M. The no-login set must store nothing about the child and must never ask for an email. | Free |
| 9 | **Make your own word problem.** A template where the child draws or writes a problem for a sibling or parent to solve. | Kids, families | Studies of "problem posing" (making up problems) report improved math achievement. One 2024 meta-analysis of 32 studies found a moderate effect. | **Nobody does it** in the products we checked. | Very good. It is making, not scoring. | S on paper. M if added in the browser. | Free on paper |
| 10 | **Two ways, side by side.** Show two correct ways to solve the same problem, then ask which one the child likes and why. | Kids (Grade 2 up), parents | Grade 7 students who compared two methods side by side became more flexible problem-solvers than students who saw the same methods one after another (Rittle-Johnson and Star 2007). | **Not found** in the products we checked. We did not search exhaustively, so this needs a second look. | Good | M | Paid in practice. Sheets free. |
| 11 | **Canadian seasons problem sets.** Short sets themed by month, such as apples in September, the Terry Fox Run, snow days, maple syrup in March, loonies and toonies. | Kids, teachers | Familiar settings make word problems easier to picture. This is mainly an engagement and fit benefit. | **Partly done.** IXL's Canada edition follows Canadian curricula, including Canadian money. We did not find month-by-month Canadian themes. | Very good | M | One free set per month. Library paid. |
| 12 | **Car-ride audio mode.** A five-minute audio set built ahead of time from the child's current skills, played offline. Each question is followed by a pause to answer out loud. | Families | Spoken questions give retrieval practice without a screen. | **Partly done.** Raising Thinkers and Times Tables in the Car are math podcasts for car rides, but they are the same for everyone. | Very good. No reward sounds, and it suits read-aloud. | M. Audio is generated ahead of time and checked. No live AI. | Paid. One sample episode free. |
| 13 | **(d) Hear your child explain it.** The child records a 20-second spoken explanation, and the parent plays it on the dashboard. | Parents, kids | Explaining your own thinking out loud ("self-explanation") helps learning. A 2018 meta-analysis of 64 studies found a moderate effect (Bisra and others 2018). | **Partly done.** In Seesaw, a classroom app, children can record their voice while drawing, and families see approved posts in the family app. Duolingo ABC uses speech recognition but does not save a recording for parents. We did not find it in the home math apps we checked. | Good | L. A stored recording of a child's voice is personal information under COPPA in the US, and the narrow exception only applies if the audio is deleted right away. Canada's privacy rules also apply. We would need parent consent at sign-up, a short storage limit and a delete button. | Paid |
| 14 | **House math hunt card.** A printable list, such as "Find something with 4 corners" or "Find 10 of something." | Kids, families | Links math words to real objects. | **Common.** Seesaw has ready-made "math in my house" photo hunts, and KidCam is a photo scavenger hunt app. | Very good on paper. | S | Free |
| 15 | **A quiet story where the math lives.** A short read-aloud story per skill, where the characters meet the problem the child is about to practise. | Kids | Stories can make a problem easier to picture. The learning benefit for practice is less certain than the ideas above. | **Common** in other forms. Beast Academy teaches through comics, and Prodigy wraps practice in quests and rewards. | Good only if the story is always open to read. If a chapter "unlocks" after practice, it becomes a reward, which breaks the quiet style. | L | Later |

### 7.2 The six candidate ideas: verdicts in short

- **(a) English and French side by side: Partly done.** Print workbooks do it (On the Mark Press), and one Ontario school board posts English-narrated strategy videos for immersion parents. No digital product we found offers side-by-side explainers and videos for Ontario, New Brunswick and Nova Scotia immersion. Khan Academy Kids is English only. **Note:** French reading and spelling are not a translation of English reading and spelling, so that content needs its own French plan (see section 8.3).
- **(b) Mix-up videos: Partly done.** Zearn's Boosts are the closest: help that launches when a student struggles. IXL and Brilliant explain wrong answers in text or through an AI tutor. A short video tied to one named wrong answer was not found.
- **(c) Spot-the-mistake worked examples: Partly done.** These exist for older grades (Khan Academy's "find the mistake" for Grades 6–7, and SERP's MathByExample for Grades 4–5). The research supports them, with the caution that beginners do better with correct examples first.
- **(d) Hear your child explain it: Partly done.** Seesaw does this in classrooms, with the teacher in the loop. Not found in the home math apps we checked. It is the most effort because of privacy rules for children's voices.
- **(e) Weekly fridge card: Partly done.** Family math prompts exist (Bedtime Math, Ready4K), but not built from the child's own week of practice.
- **(f) Teacher method sheet with a QR code: Partly done.** QR or link practice with no student account exists (Math Practice Online, ZestMath). Pairing it with a one-page method sheet was not found.

### 7.3 Ideas we looked at and set aside

- **Photo-based house hunts in the app.** Uploading photos taken by a child raises privacy issues and adds moderation work. The paper hunt card (rank 14) gets most of the benefit.
- **A story chapter that unlocks after each practice set.** That makes the story a reward, which the quiet style rules out. Rank 15 keeps the story without the unlock.

### 7.4 Points to check before building

- The Berkowitz and others (2015) home-math result was questioned in a later comment in *Science*. Treat the fridge card's benefit as likely, not proven.
- The spot-the-mistake research is mostly with Grade 4–9 students. Its benefit for Grades 1–2 is not established.
- The "two ways" and "make your own problem" competitor checks were lighter than the others.
- Duolingo Math was recently released for Grades 2–12, and its features may change. We could not open its announcement page. We only saw a search summary that mentions an "Explain my answer" feature and an AI math coach.

### 7.5 Sources opened for this check

Competitors and products:
- Khan Academy Kids is English only: https://khankids.zendesk.com/hc/en-us/articles/360038729912-French-Parent-Guide-Guide-parent-Comment-utiliser-Khan-Academy-Kids
- Khan Academy languages (French aligned to France and Belgium): https://support.khanacademy.org/hc/en-us/articles/226457308-What-languages-is-Khan-Academy-available-in
- Khan Academy Kids parent resources (weekly planners, printables): https://khankids.zendesk.com/hc/en-us/articles/360047433311-List-of-resources-for-parents
- Khan Academy "find the mistake" exercise, as listed by a third party (the Khan page itself needs JavaScript and did not open): https://www.classtime.com/curriculum/qs/khan-academy-khan-academy-(english---us-curriculum)-math-by-grade-illustrative-mathematics-7th-grade-(illustrative-mathematics)-unit-6-expressions-equations-and-inequalities-lesson-10-different-options-for-solving-one-equations-find-the-mistake-two-step-equations/888c112c-e17f-4a68-96e7-fe2a8b5b4411
- IXL translation into 90+ languages (App Store release notes): https://apps.apple.com/fr/app/ixl-math-english-more/id693689912
- IXL international editions: https://www.ixl.com/international
- IXL explanations and tutorials: https://blog.ixl.com/2021/10/21/ixls-instructional-resources-tools-to-empower-independent-learning/
- Zearn Boosts: https://help.zearn.org/hc/en-us/articles/1500003390061-Boosts
- Brilliant feedback: https://brilliant.org/resources/math/how-to-help-your-child-catch-up-in-math/
- Boddle parent progress report: https://intercom.help/boddle/en/articles/7848134-progress-report-parents
- Duolingo ABC speech features: https://www.duolingo.com/abc-privacy
- Prodigy parents page: https://www.prodigygame.com/main-en/parents
- On the Mark Press bilingual workbooks: https://www.onthemarkpress.com/products/addition-addition-a-bilingual-workbook-new-117
- Rainbow District School Board FSL Homework Toolbox (math): https://fsl.rainbowschools.ca/math/
- Canadian Parents for French guide: http://erwbb.interlakesd.ca/wp-content/uploads/sites/6/2022/10/CPF-Guide-Helping-Your-Child-Become-Bilingual-SAMPLER.pdf
- SERP MathByExample: https://www.serpinstitute.org/math-by-example/how-it-works
- Seesaw draw and record: https://help.seesaw.me/hc/en-us/articles/205923226-How-to-use-the-synchronized-draw-and-record-feature
- Seesaw family view: https://help.seesaw.me/hc/en-us/articles/205803229-Using-The-Learning-Journal-to-engage-with-your-student-s-work
- Seesaw home math hunt: https://app.seesaw.me/activities/xepkqb/i-can-find-math-in-my-house
- KidCam photo hunts: https://kidcamapp.com/kids-photo-scavenger-hunt-app
- Bedtime Math: https://bedtimemath.org/daily-math/
- Ready4K sample messages: https://solanolibrary.com/wp-content/uploads/2022/03/Ready4K_SampleMessages_English.pdf
- Math Practice Online for teachers: https://mathpracticeonline.com/for-teachers/
- ZestMath: https://zestmath.com/
- Estimation 180: https://estimation180.com/
- Math for Love Tiny Polka Dot: https://mathforlove.com/2020/05/free-printable-tiny-polka-dot-starter-deck/
- Raising Thinkers podcast: https://raisingthinkers.podbean.com/
- Times Tables in the Car: https://open.spotify.com/show/25whdwXnRM25KQr3QmOYEm
- Beast Academy: https://beastacademy.com/books
- Which One Doesn't Belong (a free picture-talk routine that could feed the fridge card): https://talkingmathwithkids.com/wodb/

Research:
- Adams, McLaren and others (2014), erroneous examples with decimals: https://www.cs.cmu.edu/~bmclaren/pubs/AdamsEtAl-UsingErrExToImproveMathLearningWithWebTutoringSys-CHB2014.pdf
- Booth, Lange, Koedinger and Newton (2013), correct and incorrect examples in algebra: https://files.eric.ed.gov/fulltext/ED543090.pdf
- Große and Renkl (2007), finding and fixing errors works best with more prior knowledge: https://eric.ed.gov/?id=EJ780439
- Ramani and Siegler (2008), number board games: https://pubmed.ncbi.nlm.nih.gov/18801120/
- Chase and others (2009), protégé effect: https://eric.ed.gov/?id=EJ855299
- Fiorella and Mayer (2016), eight ways to promote generative learning: https://eric.ed.gov/?id=EJ1120458
- Bisra and others (2018), self-explanation meta-analysis: https://eric.ed.gov/?id=EJ1186664
- Rittle-Johnson and Star (2007), comparing solution methods: https://eric.ed.gov/?id=EJ772031
- Problem-posing meta-analysis (2024): https://www.sciencedirect.com/science/article/abs/pii/S1871187124001251
- Berkowitz and others (2015), math at home: https://www.science.org/doi/10.1126/science.aac7427, and the critical comment: https://www.science.org/doi/full/10.1126/science.aad8008
- COPPA rule on children's voice recordings: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.5

---

## 8. Video and content list by grade

**Status:** This is a starting list for Matthew's review. It is not final.

The math skills below come from the skill bank in `lib/practice/bank.ts` (64 skills, eight per grade). Names and ids match the bank, so each item can be linked to its practice skill. Delivery methods are those in section 3. "Mix-up" refers to idea (b) in section 7.

### 8.1 What each skill gets

For every core skill, we plan four items:

1. **Explainer:** a few sentences and one picture. It is read-aloud friendly, and kid-facing lines stay under 15 words.
2. **Video (2–4 minutes):** one teacher talks through one example. It has captions and a quiet visual, with no lecture beyond that example.
3. **Printable sheet:** one worked example at the top, then similar problems, with a matching answer key (see section 6.3).
4. **Parent write-up:** how the method is taught, one thing to say at home, and the mix-up to watch for.

Each skill can also get one optional **mix-up clip** (about 60 seconds) for its most common wrong answer. These are listed but counted separately.

### 8.2 Grades 1–3 math (detailed)

Every row is one explainer, one video, one sheet and one parent write-up.

**Grade 1**

| # | Skill (bank id) | The one example in the video | Parent write-up: one thing to try at home | Common mix-up (for a mix-up clip) |
|---|---|---|---|---|
| 1 | Counting and number recognition to 20 (`g1-count`) | What comes just after 13? What comes just before? | Count stairs going up, then count back going down. | Writing 31 for thirteen, or giving the number before when asked for after. |
| 2 | Addition within 10 (`g1-add-10`) | 4 + 3: start at 4 and count on 3. | Start counting from the bigger number. | Counting the starting number again, so 4 + 3 becomes 6. |
| 3 | Subtraction within 10 (`g1-sub-10`) | 9 − 4: count back 4, or ask what plus 4 makes 9. | Use the "missing part" question: 4 and what make 9? | Counting the starting number when counting back, so 9 − 4 becomes 6. |
| 4 | Comparing numbers to 20 (`g1-compare`) | Which is greater, 14 or 17? | Ask which number comes later when you count. | Choosing the number with the bigger last digit, or mixing up greater and less. |
| 5 | Equal sharing (`g1-share`) | Share 12 crackers between 3 plates. | Share snacks out one at a time, like dealing cards. | Groups that are not equal, or a leftover that gets ignored. |
| 6 | Place value (tens and ones) (`g1-place`) | 36 is 3 tens and 6 ones. | Bundle straws or popsicle sticks into tens. | Reading 36 as 63, or saying the 3 is worth 3. |
| 7 | Simple patterns (`g1-patterns`) | 2, 4, 6, 8. What comes next? | Clap and stomp a pattern, then continue it. | Adding 1 each time instead of finding the real step. |
| 8 | Measurement (length with non-standard units) (`g1-measure`) | The pencil is 5 paperclips long. | Measure a shoe with paperclips or Lego bricks. | Leaving gaps or overlaps between units, or not starting at the end. |

**Grade 2**

| # | Skill (bank id) | The one example in the video | Parent write-up: one thing to try at home | Common mix-up |
|---|---|---|---|---|
| 9 | Addition and subtraction within 100 (`g2-add-sub`) | 47 + 28, regrouping 15 ones as 1 ten and 5 ones. | Use dimes and pennies to show 10 ones becoming 1 ten. | Taking the smaller digit from the bigger one, so 52 − 37 becomes 25. |
| 10 | Place value to 100 (`g2-place`) | In 58, the 5 is worth 50. | Ask, "How much is this digit worth?" | Saying the 5 is worth 5. |
| 11 | Equal groups (`g2-groups`) | 4 groups of 3 is 12. | Count socks in pairs, or eggs in rows. | Adding the numbers, so 4 groups of 3 becomes 7. |
| 12 | Comparing and ordering numbers to 100 (`g2-compare`) | Put 67, 76 and 59 in order. | Compare tens first, like comparing ages. | Comparing the ones digits first. |
| 13 | Simple measurement (`g2-measure`) | A 30 cm ribbon loses 12 cm. How much is left? | Measure with a ruler, starting at 0, not at the edge. | Starting at 1 on the ruler, or adding instead of subtracting. |
| 14 | Fractions as equal parts (`g2-fractions`) | Is this shape cut into fourths? | Fold paper or cut toast into equal parts. | Counting parts that are not equal, or thinking 1/4 is bigger than 1/2 because 4 is bigger. |
| 15 | Even and odd numbers (`g2-even-odd`) | Is 13 even? Pair up 13 counters. | Pair up shoes or spoons, and look for one left over. | Judging even or odd by the tens digit. |
| 16 | Introduction to data (`g2-data`) | Read a tally chart of favourite fruits. | Make a tally of cars by colour on a walk. | Miscounting a bundle of five tally marks. |

**Grade 3**

| # | Skill (bank id) | The one example in the video | Parent write-up: one thing to try at home | Common mix-up |
|---|---|---|---|---|
| 17 | Addition and subtraction within 1,000 (`g3-add-sub`) | 403 − 158, regrouping across a zero. | Show 403 as 4 hundreds, 0 tens and 3 ones, then trade. | Regrouping across zero incorrectly. |
| 18 | Multiplication facts to 10×10 (`g3-mult`) | 6 × 7: start from 5 × 7, then add one more 7. | Build hard facts from easy ones (5s and 10s). | Adding instead of multiplying, so 6 × 7 becomes 13. |
| 19 | Division with remainders (`g3-div-rem`) | 17 ÷ 5 is 3 R 2. | Share 17 cards among 5 people and keep the leftovers. | Leaving out the remainder, or a remainder bigger than the divisor. |
| 20 | Fractions as equal parts (`g3-fractions`) | Shade 3/8 of a bar. | Cut a pizza or a pan of brownies into equal parts. | Swapping the top and bottom numbers, or counting the unshaded parts. |
| 21 | Place value to 1,000 (`g3-place`) | In 706, there are 0 tens. | Read house numbers or prices out loud as hundreds, tens and ones. | Writing 7006 for "seven hundred six." |
| 22 | Perimeter of rectangles (`g3-perimeter`) | A 6 by 4 rectangle has a perimeter of 20. | Walk around a rug or table and count the steps. | Multiplying, which finds area, or adding only two sides. |
| 23 | Time to the minute (`g3-time`) | 3:45 plus 20 minutes is 4:05. | Ask, "What time will it be in 20 minutes?" | Writing 3:65, as if an hour had 100 minutes. |
| 24 | Simple data and bar graphs (`g3-data`) | Read a bar graph where each line counts 2. | Make a bar graph of the family's favourite snacks. | Reading each line on the scale as 1. |

### 8.3 Grades 1–3 reading and spelling (new; not yet in the skill bank)

The skill bank has no reading or spelling skills yet, so these names are proposals. They follow the Foundations of Language strand (Strand B) of Ontario's 2023 Language curriculum, which covers phonics, spelling and word study in Grades 1–3 ([Strand B expectations](https://assets-us-01.kc-usercontent.com/fbd574c4-da36-0066-a0c5-849ffb2de96e/7bae5e4f-2c0f-43d1-b637-8138ef000eb3/Expectations_StrandB.pdf)). Like the math skills, each topic gets an explainer, a video, a sheet and a parent write-up. Read-aloud matters most here, because the child must hear the sounds.

| Grade | Topic | The one example in the video |
|---|---|---|
| 1 | Letter sounds and short vowels | Sound out c-a-t, then blend it into "cat." |
| 1 | Blending and splitting sounds | Split "ship" into sh-i-p. |
| 1 | Two letters, one sound (sh, ch, th) | "Chip" starts with one sound made by two letters. |
| 1 | Silent e makes the vowel say its name | "Cap" becomes "cape." |
| 1 | Common sight words | Read "the," "said" and "was" in one sentence. |
| 2 | Vowel teams (ai, ee, oa) | "Boat" uses "oa" to make a long o sound. |
| 2 | Bossy r (ar, or, er) | "Car," "corn" and "her." |
| 2 | Adding endings (-s, -es, -ed, -ing) | "Hop" becomes "hopping," so double the p. |
| 2 | Compound words | "Snow" plus "man" makes "snowman." |
| 2 | Retelling a short story | Tell what happened first, next and last. |
| 3 | Prefixes and suffixes (un-, re-, -ful, -less) | "Unhelpful" has three parts. |
| 3 | Homophones (there, their, they're) | Three words that sound the same but mean different things. |
| 3 | Reading longer words by syllables | Split "rabbit" into rab-bit. |
| 3 | Canadian spelling | "Colour," "centre" and "neighbour." |
| 3 | Finding the main idea | What is this paragraph mostly about? |

**French reading and spelling are a separate list.** French phonics is different (for example "ou," "on," "an," and silent final letters), so the French list should not be a translation of this one. It needs a French immersion teacher to draft it.

### 8.4 Grades 4–8 math (summary)

Each skill gets the same four items as in 8.1. Some skills appear in two grades with the same title in the bank. One video can serve both, with a grade-specific sheet, which would save about four recordings.

| Grade | Skills (bank ids) | Notes |
|---|---|---|
| 4 | Multi-digit multiplication (`g4-mult`), Long division introduction (`g4-div`), Equivalent fractions (`g4-equiv`), Place value to 10,000 (`g4-place`), Adding and subtracting fractions with like denominators (`g4-frac`), Area of rectangles (`g4-area`), Rounding numbers (`g4-round`), Introduction to decimals (`g4-decimals`) | Fractions are the biggest source of mix-ups, such as adding the denominators. Record `g4-equiv` and `g4-frac` early. |
| 5 | Multiplication facts to 12×12 (`g5-mult`), Division with remainders (`g5-div-rem`), Adding and subtracting fractions with like denominators (`g5-frac`), Place value to 100,000 (`g5-place`), One-step equations (`g5-equations`), Decimals to hundredths (`g5-decimals`), Area of triangles and parallelograms (`g5-area`), Volume of rectangular prisms (`g5-volume`) | `g5-div-rem` can share a video with `g3-div-rem`, and `g5-frac` with `g4-frac`. |
| 6 | Multiplying and dividing fractions (`g6-frac`), Decimals to thousandths (`g6-decimals`), Ratios and unit rates (`g6-ratios`), Area of triangles and parallelograms (`g6-area`), One-step equations with decimals (`g6-equations`), Percent of a number (`g6-percent`), Surface area of rectangular prisms (`g6-surface`), Mean median and mode (`g6-data`) | `g6-area` can share a video with `g5-area`. |
| 7 | Integers (add subtract multiply) (`g7-integers`), Solving two-step equations (`g7-equations`), Proportional relationships (`g7-proportion`), Percent (`g7-percent`), Area and circumference of circles (`g7-circles`), Volume of prisms and cylinders (`g7-volume`), Probability (`g7-probability`), Order of operations with integers (`g7-order`) | Spot-the-mistake examples (section 7, idea c) fit Grades 7 and 8 best, because the research is strongest there. |
| 8 | Solving multi-step equations (`g8-equations`), Linear relations (`g8-linear`), Pythagorean theorem (`g8-pythagoras`), Volume of prisms and cylinders (`g8-volume`), Financial literacy (simple interest) (`g8-interest`), Multiplying and dividing integers (`g8-integers`), Surface area of cylinders (`g8-surface`), Data analysis (`g8-data`) | `g8-volume` can share a video with `g7-volume`. |

### 8.5 Counts

| Group | Skills or topics | Videos (2–4 min) | All items (explainer, video, sheet, parent write-up) |
|---|---|---|---|
| Grades 1–3 math | 24 | 24 | 96 |
| Grades 1–3 reading and spelling | 15 | 15 | 60 |
| Grades 4–8 math | 40 | 40 (about 36 if shared videos are reused) | 160 |
| **Total (English)** | **79** | **79 (about 75)** | **316** |
| Optional mix-up clips, Grades 1–3 math | — | 24 short clips (about 60 seconds each) | 24 |

French versions (section 7, idea a) would roughly double the math explainers and videos. French reading and spelling would be a new list.

### 8.6 Suggested recording order (Grades 1–3 first)

The order puts first the skills where home methods most often clash with school methods (place value, regrouping and fractions). These are where a parent most needs to see "how it is taught now."

1. **Batch 1, the foundations (10 videos):** `g1-add-10`, `g1-sub-10`, `g1-place`, `g2-place`, `g2-add-sub`, `g2-fractions`, `g3-add-sub`, `g3-mult`, `g3-div-rem`, `g3-fractions`. These would also make a good free starter set (section 2).
2. **Batch 2, the rest of Grade 1 (5 videos):** `g1-count`, `g1-compare`, `g1-share`, `g1-patterns`, `g1-measure`.
3. **Batch 3, the rest of Grade 2 (5 videos):** `g2-groups`, `g2-compare`, `g2-measure`, `g2-even-odd`, `g2-data`.
4. **Batch 4, the rest of Grade 3 (4 videos):** `g3-place`, `g3-perimeter`, `g3-time`, `g3-data`.
5. **Batch 5, Grades 1–3 reading and spelling (15 videos),** after a teacher reviews the topic list in 8.3.
6. **Batch 6, Grade 1–3 mix-up clips (24 short clips).** Start with the mix-ups for Batch 1 skills.
7. **Batch 7, Grades 4–5 (16 videos, about 14 with sharing).** Start with fractions: `g4-equiv`, `g4-frac`, then `g4-decimals`.
8. **Batch 8, Grades 6–8 (24 videos, about 22 with sharing).** Start with `g6-frac`, `g7-integers` and `g7-equations`.
9. **French twins** follow the same order once the French work begins (section 6.6, step 3).

**Open questions for Matthew:**
- Should reading and spelling be in scope now, or wait until the math library is complete?
- Should Batch 1 be the free starter set?
- Who records the French twins, and should they be the same teacher's voice or a different one?
