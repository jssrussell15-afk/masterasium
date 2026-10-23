"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnswerFields, answerUsesKeypad } from "@/components/answer-fields";
import { AssistedPrompt } from "@/components/assisted-prompt";
import { ExampleVisualView } from "@/components/example-visual";
import { HelpSheet } from "@/components/help-sheet";
import { ChoiceOption, ListenPassage } from "@/components/listen";
import { NumberKeypad } from "@/components/number-keypad";
import { HighlightedPrompt, HintCaption, LightbulbIcon, ShowMePanel } from "@/components/show-me";
import { answersMatch } from "@/lib/practice/answers";
import { clipKidLine, exampleLines, stepLines, type ShowLevel, type SupportMode } from "@/lib/practice/fade";
import type { WorkedExample } from "@/lib/practice/example";
import { exampleKey, readExampleSeen, takeNextExample, writeExampleSeen } from "@/lib/practice/example-rotation";
import { isDifferentExample, stepsUseQuestionNumbers } from "@/lib/practice/hint-numbers";
import { progressLabel, type FeedbackPhase } from "@/lib/practice/feedback";
import type { AnswerShape } from "@/lib/practice/parts";
import type { AssistView, InputType } from "@/lib/practice/types";
import type { Walkthrough } from "@/lib/practice/walk";

export function QuestionPractice({
  questionId,
  eyebrow,
  prompt,
  responseHint,
  shape,
  hint,
  example,
  examples = null,
  skillId = "",
  onExampleOpened,
  helpSteps = [],
  progress,
  phase,
  why,
  steps,
  expected,
  draft = "",
  exampleStartsOpen = false,
  helpStartsOpen = false,
  pending = false,
  saveNote = null,
  guideSteps = [],
  assist = null,
  onRamp = null,
  aside,
  action,
  fields = [],
  onElapsed,
  onDraft,
  walk = null,
  handoffIntent = "your-turn",
  walkStart = null,
  showLevel = null,
  walkMode = null,
  grade = null,
  autoRead,
  choices = null,
  inputType,
  speak = null,
}: {
  questionId: string;
  eyebrow: string;
  prompt: string;
  responseHint: string | null;
  shape: AnswerShape;
  hint: string | null;
  example: WorkedExample | null;
  /** Grade 1 and 5 rotate a few similar examples. Other grades leave this empty. */
  examples?: WorkedExample[] | null;
  skillId?: string;
  /** Quiet hint log. A stepped example does not mark the answer as helped. */
  onExampleOpened?: () => void;
  /** This question's own steps. Help uses these, not a different example. */
  helpSteps?: string[];
  progress: { index: number; total: number } | null;
  phase: FeedbackPhase;
  why: string | null;
  steps: string[];
  expected: string | null;
  /** Restored typed answer when the question is reopened. */
  draft?: string;
  exampleStartsOpen?: boolean;
  /** Opens the help sheet on this question's steps. */
  helpStartsOpen?: boolean;
  pending?: boolean;
  saveNote?: "saving" | "saved" | null;
  guideSteps?: string[];
  assist?: AssistView | null;
  onRamp?: { line: string; step: string | null; handoff: string } | null;
  aside?: ReactNode;
  action?: (formData: FormData) => void;
  fields?: { name: string; value: string }[];
  onElapsed?: (form: HTMLFormElement) => void;
  onDraft?: (answer: string, remainder: string) => void;
  walk?: Walkthrough | null;
  /** Practice asks for a same-skill question. A lesson continues its own path. */
  handoffIntent?: string;
  /** Opens a still frame for screenshots and tests. */
  walkStart?: {
    step: number;
    handoff?: boolean;
    hint?: boolean;
    faded?: boolean;
    blanks?: Record<number, string>;
    miss?: boolean;
  } | null;
  /** Stored support. Omitted, Show me stays the full walk. */
  showLevel?: ShowLevel | null;
  /** Full example, or the partly filled one, when support is already open. */
  walkMode?: SupportMode | null;
  /** Working grade. Grades 1–2 hear the question and can listen to each choice. */
  grade?: number | null;
  /** Parent setting. When omitted, Grades 1–2 read the question automatically. */
  autoRead?: boolean;
  choices?: string[] | null;
  /** Choice tiles, or the kind of typed answer. Omitted, valid tiles stay choices. */
  inputType?: InputType;
  /** Spelling word for Listen. The prompt stays on screen. */
  speak?: string | null;
}) {
  const guided = walk && walk.steps.length >= 3 ? walk : null;
  const pool = examples && examples.length >= 2 ? examples : null;
  const stepped = pool != null;
  const [values, setValues] = useState<Record<string, string>>(() => valuesFor(shape, draft));
  const [hintOpen, setHintOpen] = useState(Boolean(walkStart?.hint));
  const [shownExample, setShownExample] = useState<WorkedExample | null>(pool?.[0] ?? null);
  const [exampleOpen, setExampleOpen] = useState(exampleStartsOpen && !stepped);
  const [sheetMode, setSheetMode] = useState<"help" | "example" | null>(
    exampleStartsOpen ? "example" : helpStartsOpen ? "help" : null,
  );
  const [sheetStep, setSheetStep] = useState(0);
  const [activeField, setActiveField] = useState("answer");
  const [dismissed, setDismissed] = useState(false);
  const [localOpen, setLocalOpen] = useState(Boolean(walkStart && !walkStart.hint));
  const [openedFaded, setOpenedFaded] = useState(Boolean(walkStart?.faded));
  const [stepIndex, setStepIndex] = useState(walkStart?.step ?? 0);
  const [handoff, setHandoff] = useState(Boolean(walkStart?.handoff));
  const [walkDraft, setWalkDraft] = useState("");
  const [blankDrafts, setBlankDrafts] = useState<Record<number, string>>(walkStart?.blanks ?? {});
  const [blankTries, setBlankTries] = useState(walkStart?.miss ? 1 : 0);
  const [revealedBlanks, setRevealedBlanks] = useState<Record<number, boolean>>({});
  const [walkMiss, setWalkMiss] = useState(Boolean(walkStart?.miss));
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const supportLevel = showLevel ?? null;
  const fadedOpen = walkMode === "faded" || openedFaded;
  const solution = guided?.answer || expected || "";
  const serverOpen = phase === "revealed" && Boolean(guided);
  const walking = Boolean(guided) && !dismissed && (serverOpen || localOpen || Boolean(walkStart && !walkStart.hint));
  const partial = walking && fadedOpen;
  const choiceOnly =
    inputType != null && grade != null && grade <= 2 && inputType !== "spelling" && inputType !== "text";
  const supportFromQuestion = steps.length > 0 && stepsUseQuestionNumbers(prompt, steps);
  const supportCaptions = (supportFromQuestion ? steps : (example?.steps ?? [])).map((caption) => ({
    target: "",
    caption: clipKidLine(caption),
  }));
  const supportForeign =
    !supportFromQuestion && example != null && isDifferentExample(prompt, example.prompt, example.steps);
  const supportAnswer = supportFromQuestion ? (expected ?? "") : (example?.answer ?? "");
  const exampleSupport =
    !choiceOnly &&
    !walking &&
    supportLevel != null &&
    supportCaptions.length > 0 &&
    phase === "revealed" &&
    (walkMode === "guided" || walkMode === "faded");
  const showTextReveal = phase === "revealed" && !guided && !exampleSupport;
  const textFinished = phase === "correct" || showTextReveal;
  const progressText = progress ? progressLabel(progress.index, progress.total) : null;
  const step = guided?.steps[Math.min(stepIndex, guided.steps.length - 1)];
  const announcement = walking || exampleSupport
    ? ""
    : phase === "correct"
      ? "That's right."
      : phase === "retry"
        ? "Not quite. Try again."
        : phase === "revealed"
          ? "Here's how."
          : "";
  const readOnArrival = autoRead ?? (grade != null && grade <= 2);
  const hintText = hint ? (supportLevel == null ? hint : clipKidLine(hint)) : null;
  const hintCaption = Boolean(
    !choiceOnly &&
      hintText &&
      !walking &&
      !exampleSupport &&
      supportLevel != null &&
      (supportLevel === 3 || hintOpen),
  );
  const showLegacyHint =
    !choiceOnly &&
    Boolean(hintText) &&
    !walking &&
    !hintCaption &&
    supportLevel == null &&
    (hintOpen || phase === "retry" || showTextReveal);
  const choiceList = choices ?? [];
  const answerInput: InputType =
    inputType ?? (choiceList.length >= 2 ? "choice" : typedInput(shape));
  // One tile is not a real choice set. Older grades fall back to the typed box.
  const showChoices =
    !walking &&
    choiceList.length >= 2 &&
    (phase === "answering" || (choiceOnly && phase === "retry")) &&
    (answerInput === "choice" || choiceOnly);
  const showKeypad =
    !choiceOnly &&
    !showChoices &&
    (answerInput === "number" ||
      answerInput === "decimal" ||
      answerInput === "fraction" ||
      answerInput === "remainder" ||
      (answerInput === "choice" && answerUsesKeypad(shape)));
  const choiceListen = grade != null && grade <= 2;
  const liveHelpSteps = (helpSteps.length > 0 ? helpSteps : steps).map((step) => step.trim()).filter(Boolean);
  const helpSheetSteps = liveHelpSteps.length > 0 ? liveHelpSteps : hint ? [hint] : [];
  const exampleIsForeign = example != null && isDifferentExample(prompt, example.prompt, example.steps);
  const activeExample = (stepped ? shownExample : example) ?? null;
  const examplePicture = (() => {
    const pictures = stepped ? activeExample?.visuals : null;
    if (!pictures || pictures.length === 0) return null;
    const picture = pictures[Math.min(sheetStep, pictures.length - 1)] ?? null;
    return picture ? <ExampleVisualView visual={picture} /> : null;
  })();

  useEffect(() => {
    if (phase !== "retry" || walking) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [phase, questionId, walking]);

  useEffect(() => {
    if (!textFinished) return;
    nextRef.current?.focus();
  }, [textFinished, questionId]);

  function typeDigit(digit: string) {
    if (textFinished || pending) return;
    setValues((current) => ({
      ...current,
      [activeField]: `${current[activeField] ?? ""}${digit}`,
    }));
    inputRef.current?.focus();
  }

  function deleteDigit() {
    if (textFinished || pending) return;
    setValues((current) => ({
      ...current,
      [activeField]: (current[activeField] ?? "").slice(0, -1),
    }));
    inputRef.current?.focus();
  }

  function typeWalkDigit(digit: string) {
    if (pending) return;
    setWalkMiss(false);
    setWalkDraft((current) => `${current}${digit}`);
  }

  function deleteWalkDigit() {
    if (pending) return;
    setWalkMiss(false);
    setWalkDraft((current) => current.slice(0, -1));
  }

  function goBack() {
    if (exampleSupport && !guided) {
      if (handoff) {
        setHandoff(false);
        setWalkMiss(false);
        return;
      }
      if (walkMode === "faded" || stepIndex <= 0) return;
      setStepIndex((current) => current - 1);
      return;
    }
    if (!guided) return;
    if (handoff) {
      setHandoff(false);
      setWalkMiss(false);
      return;
    }
    if (stepIndex <= 0) return;
    setWalkMiss(false);
    setStepIndex((current) => current - 1);
  }

  function noteBlankMiss(entries: { index: number; expect: string }[]) {
    const wrong = entries.filter((entry) => !answersMatch(entry.expect, blankDrafts[entry.index] ?? ""));
    if (wrong.length === 0) {
      setWalkMiss(false);
      setBlankTries(0);
      setHandoff(true);
      return;
    }
    if (blankTries >= 1) {
      setBlankDrafts((current) => {
        const next = { ...current };
        for (const entry of wrong) next[entry.index] = entry.expect;
        return next;
      });
      setRevealedBlanks((current) => {
        const next = { ...current };
        for (const entry of wrong) next[entry.index] = true;
        return next;
      });
      setWalkMiss(false);
      setBlankTries(2);
      return;
    }
    setBlankTries(1);
    setWalkMiss(true);
  }

  function goNext() {
    if (partial && guided) {
      const entries = stepLines(prompt, guided.steps, solution)
        .filter((line) => line.blank)
        .map((line) => ({ index: line.index, expect: line.blank as string }));
      noteBlankMiss(entries);
      return;
    }
    if (exampleSupport) {
      if (walkMode === "faded") {
        const entries = exampleLines(
          supportCaptions.map((item) => item.caption),
          supportAnswer,
        )
          .filter((line) => line.blank)
          .map((line) => ({ index: line.index, expect: line.blank as string }));
        noteBlankMiss(entries);
        return;
      }
      if (stepIndex < supportCaptions.length - 1) {
        setStepIndex((current) => current + 1);
        return;
      }
      setHandoff(true);
      return;
    }
    if (!guided || handoff) return;
    if (stepIndex < guided.steps.length - 1) {
      setWalkMiss(false);
      setStepIndex((current) => current + 1);
      return;
    }
    if (!solution || !answersMatch(solution, walkDraft)) {
      setWalkMiss(true);
      return;
    }
    setWalkMiss(false);
    setHandoff(true);
  }

  function openWalk(event: { preventDefault: () => void }) {
    if (supportLevel === 4 && !hintOpen && phase !== "revealed") {
      event.preventDefault();
      setHintOpen(true);
      return;
    }
    if (phase === "revealed" || !action) {
      event.preventDefault();
      setDismissed(false);
      setLocalOpen(true);
      if (supportLevel != null && supportLevel >= 2 && walkMode !== "guided") setOpenedFaded(true);
    }
  }

  function stamp(event: FormEvent<HTMLFormElement>) {
    onElapsed?.(event.currentTarget);
  }

  const extraKey = solution.includes("/") ? "/" : solution.includes(":") ? ":" : null;
  const showWalkPad = Boolean(solution) && (/^\d+$/.test(solution) || extraKey != null);
  const hideMainForm = (walking || exampleSupport) && !choiceOnly;

  function openHelpSheet() {
    setSheetStep(0);
    setSheetMode("help");
    setHintOpen(true);
  }

  function openExampleSheet() {
    if (!pool) {
      setSheetStep(0);
      setSheetMode("example");
      setExampleOpen(true);
      return;
    }
    const storageKey = skillId || "example";
    let seen: string[] = [];
    if (typeof window !== "undefined") seen = readExampleSeen(window.sessionStorage, storageKey);
    const currentKey = shownExample ? exampleKey(shownExample) : "";
    const already = sheetMode === "example";
    const base = already && currentKey && !seen.includes(currentKey) ? [...seen, currentKey] : seen;
    const next = takeNextExample(pool, base);
    if (typeof window !== "undefined") writeExampleSeen(window.sessionStorage, storageKey, next.seen);
    setShownExample(next.example);
    setSheetStep(0);
    setSheetMode("example");
    onExampleOpened?.();
  }
  const showHelp = phase !== "correct" && !showTextReveal && !walking && !exampleSupport;
  const formIntent = handoff ? handoffIntent : textFinished ? "next" : "check";
  const formLabel = handoff || textFinished ? "Next" : "Check";

  return (
    <div className="question-column">
      {walking || exampleSupport ? <div className="walk-dim" /> : null}
      {progressText ? <p className="question-progress">{progressText}</p> : null}
      <div className={aside ? "question-layout with-pad" : "question-layout"}>
        <section className={walking || exampleSupport ? "question-card walk-raised" : "question-card"} aria-label="Question">
          <div className="question-head">
          <p className="topic-label">{eyebrow}</p>
          {onRamp ? (
            <div className="on-ramp">
              <p className="hint">{onRamp.line}</p>
              {onRamp.step ? <p className="hint">{onRamp.step}</p> : null}
              <p className="hint">{onRamp.handoff}</p>
            </div>
          ) : null}
          {walking || hintCaption || exampleSupport ? (
            <h1 className={prompt.length > 80 ? "prompt prompt-long" : "prompt"}>
              {walking && step && !handoff && !partial ? (
                <HighlightedPrompt
                  prompt={prompt}
                  target={step.target}
                  occurrence={step.occurrence ?? 0}
                  place={discussedPlace(step)}
                />
              ) : (
                prompt
              )}
            </h1>
          ) : (
            <ListenPassage
              stacked={choiceOnly}
              auto={readOnArrival && phase === "answering"}
              utterance={answerInput === "spelling" && speak ? speak : undefined}
              parts={[
                {
                  text: prompt,
                  as: "h1",
                  className: prompt.length > 80 ? "prompt prompt-long" : "prompt",
                },
              ]}
            />
          )}
          {responseHint ? <p className="hint">{responseHint}</p> : null}
          </div>
          {phase === "answering" && !choiceOnly && !walking && !exampleSupport && supportLevel !== 4 ? (
            <AssistedPrompt assist={assist} />
          ) : null}
          {guideSteps.length > 0 && phase === "answering" && !walking ? (
            <ol className="guide-steps">
              {guideSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          ) : null}
          {hintCaption && hintText ? <HintCaption text={hintText} autoRead={readOnArrival} /> : null}
          {showLegacyHint && hintText ? (
            <p className="inline-help">
              <LightbulbIcon />
              <span>{hintText}</span>
            </p>
          ) : null}
          <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
            {saveNote === "saving" ? " Saving." : saveNote === "saved" ? " Saved." : ""}
          </p>
          {saveNote ? (
            <p className="save-note" aria-hidden="true">
              {saveNote === "saving" ? "Saving…" : "Saved"}
            </p>
          ) : null}
          {phase === "correct" && why ? <p className="why-line">{why}</p> : null}
          {phase === "retry" && !walking ? <p className="feedback warm">Not quite. Try again.</p> : null}
          {phase === "correct" ? <p className="feedback good">That&apos;s right.</p> : null}
          {showTextReveal ? (
            <div className="feedback warm worked-reveal">
              <p>Here&apos;s how.</p>
              {steps.length > 0 ? (
                <ol className="guide-steps">
                  {steps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : null}
              {expected ? (
                <p>
                  The answer is <strong>{expected}</strong>.
                </p>
              ) : null}
            </div>
          ) : null}

          {walking && guided && step ? (
            <ShowMePanel
              step={handoff ? guided.steps[guided.steps.length - 1] : step}
              index={handoff ? guided.steps.length - 1 : Math.min(stepIndex, guided.steps.length - 1)}
              total={guided.steps.length}
              handoff={handoff}
              draft={walkDraft}
              miss={walkMiss}
              pending={pending}
              showKeypad={showWalkPad}
              extraKey={extraKey}
              onDraft={(value) => {
                setWalkMiss(false);
                setWalkDraft(value);
              }}
              onDigit={typeWalkDigit}
              onDelete={deleteWalkDigit}
              onNext={goNext}
              onBack={goBack}
              onClose={() => setDismissed(true)}
              action={action}
              fields={fields}
              handoffIntent={handoffIntent}
              onElapsed={onElapsed}
              autoRead={readOnArrival}
              lines={partial ? stepLines(prompt, guided.steps, solution) : null}
              blankDrafts={blankDrafts}
              revealed={revealedBlanks}
              onBlank={(index, value) => {
                if (revealedBlanks[index]) return;
                setWalkMiss(false);
                setBlankDrafts((current) => ({ ...current, [index]: value }));
              }}
            />
          ) : null}
          {exampleSupport && supportCaptions.length > 0 ? (
            <ShowMePanel
              step={supportCaptions[Math.min(stepIndex, supportCaptions.length - 1)] ?? { target: "", caption: prompt }}
              index={handoff ? supportCaptions.length - 1 : Math.min(stepIndex, Math.max(supportCaptions.length - 1, 0))}
              total={Math.max(supportCaptions.length, 1)}
              kicker={supportForeign ? "A similar question" : null}
              relatedPrompt={supportForeign ? example?.prompt ?? null : null}
              handoff={handoff}
              draft={walkDraft}
              miss={walkMiss}
              pending={pending}
              showKeypad={false}
              extraKey={null}
              onDraft={() => undefined}
              onDigit={() => undefined}
              onDelete={() => undefined}
              onNext={goNext}
              onBack={goBack}
              onClose={() => setDismissed(true)}
              action={action}
              fields={fields}
              handoffIntent={handoffIntent}
              onElapsed={onElapsed}
              autoRead={readOnArrival}
              askAnswer={false}
              lines={
                walkMode === "faded"
                  ? exampleLines(
                      supportCaptions.map((item) => item.caption),
                      supportAnswer,
                    )
                  : null
              }
              blankDrafts={blankDrafts}
              revealed={revealedBlanks}
              onBlank={(index, value) => {
                if (revealedBlanks[index]) return;
                setWalkMiss(false);
                setBlankDrafts((current) => ({ ...current, [index]: value }));
              }}
            />
          ) : null}

          {guided || supportLevel != null ? (
            <form id="show-me-intent" className="show-me-form" action={action} onSubmit={stamp}>
              <HiddenFields fields={fields} />
              <input type="hidden" name="intent" value="show-me" />
            </form>
          ) : null}

          {hideMainForm ? null : (
            <form action={action} className="question-form" onSubmit={stamp}>
              <HiddenFields fields={fields} />
              <input type="hidden" name="intent" value={formIntent} />
              <input type="hidden" name="openedExample" value={exampleOpen && !stepped ? "1" : "0"} />
              {showChoices ? (
                <>
                  <div className={choiceOnly ? "answer-choices is-young" : "answer-choices"}>
                    {choiceList.map((choice) => (
                      <ChoiceOption
                        key={choice}
                        text={choice}
                        listenInside={choiceOnly}
                        showListen={choiceListen && !hintCaption}
                        pressed={(values.answer ?? "") === choice}
                        disabled={pending}
                        onPick={() => {
                          const next = { ...values, answer: choice };
                          setValues(next);
                          onDraft?.(choice, values.remainder ?? "");
                        }}
                      />
                    ))}
                  </div>
                  <input type="hidden" name="answer" value={values.answer ?? ""} />
                </>
              ) : choiceOnly ? (
                <input type="hidden" name="answer" value={values.answer ?? ""} />
              ) : (
                <>
                  <AnswerFields
                    shape={shape}
                    inputType={answerInput}
                    values={values}
                    onChange={(name, value) => {
                      const next = { ...values, [name]: value };
                      setValues(next);
                      onDraft?.(next.answer ?? "", next.remainder ?? "");
                    }}
                    readOnly={textFinished}
                    disabled={pending}
                    inputRef={inputRef}
                    onFocusField={setActiveField}
                  />
                  {showKeypad ? (
                    <NumberKeypad
                      disabled={textFinished || pending}
                      onDigit={typeDigit}
                      onDelete={deleteDigit}
                      extras={answerInput === "fraction" ? ["/"] : []}
                    />
                  ) : null}
                </>
              )}
              {showHelp ? (
                <div className="help-row">
                  <button
                    type="button"
                    className="help-target"
                    disabled={pending || (choiceOnly ? helpSheetSteps.length === 0 : !hint)}
                    onClick={choiceOnly ? openHelpSheet : () => setHintOpen(true)}
                  >
                    Help me with this
                  </button>
                  {example || activeExample ? (
                    <button type="button" className="help-target" disabled={pending} onClick={openExampleSheet}>
                      {stepped && sheetMode === "example" ? "Show another example" : "Show me an example"}
                    </button>
                  ) : null}
                  {guided || supportLevel != null ? (
                    <button
                      className="help-target"
                      type={choiceOnly && !guided ? "button" : "submit"}
                      form={choiceOnly && !guided ? undefined : "show-me-intent"}
                      disabled={pending}
                      onClick={choiceOnly && !guided ? openHelpSheet : openWalk}
                    >
                      Show me
                    </button>
                  ) : null}
                </div>
              ) : null}
              <button
                ref={textFinished ? nextRef : undefined}
                className="btn btn-primary question-submit"
                type="submit"
                disabled={
                  pending ||
                  !action ||
                  ((showChoices || (choiceOnly && (phase === "answering" || phase === "retry"))) &&
                    !choiceList.some((choice) => choice === (values.answer ?? "")))
                }
              >
                {pending ? "One moment…" : formLabel}
              </button>
            </form>
          )}
        </section>
        {aside}
      </div>
      {sheetMode === "help" && helpSheetSteps.length > 0 ? (
        <HelpSheet
          steps={helpSheetSteps}
          stepIndex={sheetStep}
          linePrompt={prompt}
          autoRead={readOnArrival}
          onBack={() => setSheetStep((current) => Math.max(0, current - 1))}
          onNext={() => setSheetStep((current) => Math.min(helpSheetSteps.length - 1, current + 1))}
          onClose={() => setSheetMode(null)}
        />
      ) : null}
      {sheetMode === "example" && activeExample ? (
        <HelpSheet
          steps={activeExample.steps.length > 0 ? activeExample.steps : [activeExample.prompt]}
          stepIndex={sheetStep}
          linePrompt={stepped ? "" : activeExample.prompt}
          kicker={stepped || exampleIsForeign ? "A similar question" : null}
          relatedPrompt={stepped || exampleIsForeign ? activeExample.prompt : null}
          visual={examplePicture}
          verbatim={stepped}
          autoRead={readOnArrival}
          onBack={() => setSheetStep((current) => Math.max(0, current - 1))}
          onNext={() =>
            setSheetStep((current) => Math.min(Math.max(activeExample.steps.length, 1) - 1, current + 1))
          }
          onClose={() => setSheetMode(null)}
        />
      ) : null}
    </div>
  );
}

function discussedPlace(step: {
  caption: string;
  visual?: { kind: string; focus?: string };
}): "ones" | "tens" | "hundreds" | null {
  const focus = step.visual?.kind === "base-ten" ? step.visual.focus : undefined;
  if (focus === "ones" || focus === "tens" || focus === "hundreds") return focus;
  if (focus === "trade") {
    if (/ones/i.test(step.caption)) return "ones";
    if (/tens/i.test(step.caption)) return "tens";
    if (/hundred/i.test(step.caption)) return "hundreds";
  }
  return null;
}

function typedInput(shape: AnswerShape): InputType {
  if (shape.kind === "parts") return "remainder";
  if (shape.inputMode === "decimal") return "decimal";
  if (shape.inputMode === "text") return "text";
  return "number";
}

function valuesFor(shape: AnswerShape, draft: string): Record<string, string> {
  if (!draft) return {};
  if (shape.kind === "single") return { answer: draft };
  const match = draft.match(/^(\d+)\s*r\s*(\d+)$/i);
  if (!match) return {};
  return { answer: match[1] ?? "", remainder: match[2] ?? "" };
}

function HiddenFields({ fields }: { fields: { name: string; value: string }[] }) {
  return (
    <>
      {fields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
    </>
  );
}

