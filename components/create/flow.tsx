"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ReadAloud } from "@/components/read-aloud";
import {
  changedOptions,
  childCopy,
  howPanels,
  parentCopy,
  projectCopy,
  whyOptions,
  wrongOptions,
} from "@/lib/create/copy";
import { createCreateDraftStore } from "@/lib/create/draft-store";
import { screenWriteMyOwn } from "@/lib/create/blocklist";
import { KID_SAFETY_MESSAGE } from "@/lib/create/moderate";
import { metaFromDraft } from "@/lib/create/session-meta";
import {
  characterCards,
  pageArt,
  sentenceBank,
  settingCards,
  sparkSet,
  type SampleAsset,
} from "@/lib/create/samples";
import { torontoDate } from "@/lib/digest/build";
import {
  COLOURS,
  MAX_PAGE_RETRY,
  MAX_SPARK_REFRESH,
  MOODS,
  SIZES,
  SPECIALS,
  canSkip,
  emptyDraft,
  nextStep,
  pageCount,
  prevStep,
  projectPages,
  stepNumber,
  type ChipBag,
  type CreateDraft,
  type CreateFlags,
  type CreateStep,
  type FixChip,
  type MatchMark,
  type PageWork,
  type ProjectType,
  type ReflectionTap,
} from "@/lib/create/types";

const store = createCreateDraftStore();

export function CreateExperience({
  basePath,
  childId,
  step,
  project,
  access,
  homeHref,
}: {
  basePath: string;
  childId: string;
  step: CreateStep;
  project: ProjectType | null;
  access: CreateFlags;
  homeHref: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CreateDraft | null>(null);
  const [ownText, setOwnText] = useState("");
  const [ownNote, setOwnNote] = useState("");
  const [fixOpen, setFixOpen] = useState(false);
  const [clearAsk, setClearAsk] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [safetyNote, setSafetyNote] = useState("");

  useEffect(() => {
    let cancel = false;
    const day = torontoDate();
    void store.read(childId, day).then((existing) => {
      if (cancel) return;
      let next = existing ?? emptyDraft(childId, day);
      if (project && next.project && next.project !== project) {
        next = { ...emptyDraft(childId, day), project, step };
      } else if (project) {
        next = { ...next, project, step };
      } else {
        next = { ...next, step: "pick" };
      }
      setDraft(next);
      const page = projectPages(next.project ?? "story", next)[next.pageIndex];
      setOwnText(page?.own ?? "");
    });
    return () => {
      cancel = true;
    };
  }, [childId, project, step]);

  async function persist(next: CreateDraft, href?: string) {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setDraft(stamped);
    await store.write(stamped);
    if (stamped.project && stamped.generations > (draft?.generations ?? 0)) {
      const page = projectPages(stamped.project, stamped)[stamped.pageIndex];
      const kind = step === "pages" ? "page" : step === "spark" || step === "character" || step === "setting" ? step : "spark";
      void fetch("/api/create/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          childId,
          projectType: stamped.project,
          kind,
          cardId: page?.sentenceId ?? (kind === "character" ? "pip" : kind === "setting" ? "meadow" : "river"),
          chips: {
            size: stamped.characterChips.size,
            colour: stamped.characterChips.colour,
            mood: stamped.characterChips.mood,
            special: stamped.characterChips.special,
            ...(page?.fixes[0] ? { fix: page.fixes[0] } : {}),
          },
          pageIndex: Math.min(4, stamped.pageIndex + 1),
          refresh: Math.min(3, kind === "spark" ? stamped.sparkRefresh : page?.variant ?? 0),
          ...(page?.own ? { writeMyOwn: page.own } : {}),
        }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          if (payload?.message === KID_SAFETY_MESSAGE || payload?.message === childCopy.pause) {
            setSafetyNote(payload.message);
          }
        })
        .catch(() => undefined);
    }
    if (href) router.push(href);
  }

  if (access.moderationBlocksToday >= 6) {
    return <p className="create-prompt">{childCopy.pause}</p>;
  }

  if (!draft) return <p className="status">Loading your project…</p>;

  const backHref = backTarget(basePath, step, draft.project, homeHref);

  return (
    <div className="create-screen">
      <div className="create-chrome">
        <Link href={backHref} className="create-back">
          {childCopy.back}
        </Link>
        <p className="create-step">{childCopy.step(stepNumber(step))}</p>
      </div>
      {safetyNote ? <p role="status">{safetyNote}</p> : null}
      {step === "pick" ? (
        <Entry
          basePath={basePath}
          draft={draft}
          onStart={(kind) => {
            const day = torontoDate();
            const fresh = {
              ...emptyDraft(childId, day),
              project: kind,
              step: "spark" as const,
              startedAt: draft.startedAt,
            };
            void persist(fresh, `${basePath}/${kind}/spark`);
          }}
        />
      ) : null}
      {step === "spark" && draft.project ? (
        <SparkStep
          draft={draft}
          onChange={(next) => void persist(next)}
          onContinue={() => {
            const following = nextStep("spark");
            if (!following || !draft.project) return;
            void persist({ ...draft, step: following }, `${basePath}/${draft.project}/${following}`);
          }}
        />
      ) : null}
      {step === "character" && draft.project ? (
        <PictureStep
          kind="character"
          draft={draft}
          onChange={(next) => void persist(next)}
          onContinue={() => {
            const following = nextStep("character");
            if (!following || !draft.project) return;
            void persist({ ...draft, step: following }, `${basePath}/${draft.project}/${following}`);
          }}
        />
      ) : null}
      {step === "setting" && draft.project ? (
        <PictureStep
          kind="setting"
          draft={draft}
          onChange={(next) => void persist(next)}
          onContinue={() => {
            const following = nextStep("setting");
            if (!following || !draft.project) return;
            void persist({ ...draft, step: following }, `${basePath}/${draft.project}/${following}`);
          }}
        />
      ) : null}
      {step === "pages" && draft.project ? (
        <PagesStep
          draft={draft}
          access={access}
          ownText={ownText}
          ownNote={ownNote}
          fixOpen={fixOpen}
          onOwnText={setOwnText}
          onFixOpen={setFixOpen}
          onNote={setOwnNote}
          onChange={(next) => void persist(next)}
          onFinish={() => {
            if (!draft.project) return;
            void persist({ ...draft, step: "finish" }, `${basePath}/${draft.project}/finish`);
          }}
        />
      ) : null}
      {step === "finish" && draft.project ? (
        <FinishStep
          draft={draft}
          playing={playing}
          clearAsk={clearAsk}
          onPlay={setPlaying}
          onClearAsk={setClearAsk}
          onChange={(next) => void persist(next)}
          onDone={async (clear) => {
            const row = metaFromDraft({ ...draft, step: "finish" }, true);
            if (row) {
              await fetch("/api/create/session", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(row),
              }).catch(() => undefined);
            }
            if (clear) await store.clear(childId);
            router.push(homeHref);
          }}
        />
      ) : null}
      {canSkip(step) && draft.project ? (
        <button
          type="button"
          className="create-skip"
          onClick={() => {
            const following = nextStep(step);
            if (!following || !draft.project) return;
            void persist({ ...draft, step: following }, `${basePath}/${draft.project}/${following}`);
          }}
        >
          {childCopy.skip}
        </button>
      ) : null}
    </div>
  );
}

function backTarget(basePath: string, step: CreateStep, project: ProjectType | null, homeHref: string): string {
  const previous = prevStep(step);
  if (!previous || previous === "pick" || !project) return step === "pick" ? homeHref : basePath;
  return `${basePath}/${project}/${previous}`;
}

function Entry({
  basePath,
  draft,
  onStart,
}: {
  basePath: string;
  draft: CreateDraft;
  onStart: (project: ProjectType) => void;
}) {
  const keep =
    draft.project && draft.step !== "pick" ? (
      <p className="create-keep">
        <Link href={`${basePath}/${draft.project}/${draft.step}`}>{childCopy.keepGoing}</Link>
        <span className="hint"> {projectCopy[draft.project].title} from earlier today.</span>
      </p>
    ) : null;
  return (
    <div className="create-entry">
      <h1 className="display text-4xl">{childCopy.title}</h1>
      <div className="speak-row">
        <p className="lede">{childCopy.subtitle}</p>
        <ReadAloud text={`${childCopy.title}. ${childCopy.subtitle}`} label="Speak the title" />
      </div>
      {keep}
      <div className="create-projects">
        {(Object.keys(projectCopy) as ProjectType[]).map((id) => (
          <Choice
            key={id}
            title={projectCopy[id].title}
            text={`${projectCopy[id].sentence} ${childCopy.minutes}`}
            icon={id}
            onClick={() => onStart(id)}
          />
        ))}
      </div>
      <Link href={`${basePath}/how`} className="create-how-link">
        {childCopy.how}
      </Link>
    </div>
  );
}

function SparkStep({
  draft,
  onChange,
  onContinue,
}: {
  draft: CreateDraft;
  onChange: (draft: CreateDraft) => void;
  onContinue: () => void;
}) {
  const cards = sparkSet(draft.sparkRefresh);
  return (
    <section className="grid gap-4">
      <h1 className="display text-3xl">Pick a spark</h1>
      <div className="create-projects">
        {cards.map((card) => (
          <Choice
            key={card.id}
            title={card.label}
            image={card.src}
            pressed={draft.sparkId === card.id}
            onClick={() =>
              onChange({
                ...draft,
                sparkId: draft.sparkId === card.id ? null : card.id,
                generations: draft.generations + (draft.sparkId === card.id ? 0 : 1),
              })
            }
          />
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={draft.sparkRefresh >= MAX_SPARK_REFRESH}
        onClick={() =>
          onChange({
            ...draft,
            sparkRefresh: Math.min(MAX_SPARK_REFRESH, draft.sparkRefresh + 1),
            sparkId: null,
            generations: draft.generations + 1,
          })
        }
      >
        {draft.sparkRefresh >= MAX_SPARK_REFRESH ? childCopy.showMoreDone : childCopy.showMore}
      </button>
      <Prompt text={childCopy.literacy} />
      <div className="create-chips">
        {(
          [
            ["boring", childCopy.boring],
            ["same", childCopy.same],
            ["different", childCopy.different],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            pressed={draft.sparkTap === id}
            onClick={() => onChange({ ...draft, sparkTap: draft.sparkTap === id ? null : id })}
          />
        ))}
      </div>
      <Continue disabled={!draft.sparkId} onClick={onContinue} />
    </section>
  );
}

function PictureStep({
  kind,
  draft,
  onChange,
  onContinue,
}: {
  kind: "character" | "setting";
  draft: CreateDraft;
  onChange: (draft: CreateDraft) => void;
  onContinue: () => void;
}) {
  const character = kind === "character";
  const regen = character ? draft.characterRegen : draft.settingRegen;
  const chips = character ? draft.characterChips : draft.settingChips;
  const selected = character ? draft.characterId : draft.settingId;
  const why = character ? draft.characterWhy : draft.settingWhy;
  const cards = character ? characterCards(regen, chips) : settingCards(regen);
  const title = character ? "Pick a character" : "Pick a setting";

  function choose(card: SampleAsset) {
    if (character) onChange({ ...draft, characterId: selected === card.id ? null : card.id });
    else onChange({ ...draft, settingId: selected === card.id ? null : card.id });
  }

  function setChips(next: ChipBag) {
    if (character) onChange({ ...draft, characterChips: next });
    else onChange({ ...draft, settingChips: next });
  }

  return (
    <section className="grid gap-4">
      <h1 className="display text-3xl">{title}</h1>
      <div className="create-projects">
        {cards.map((card) => (
          <Choice
            key={card.id}
            title={card.label}
            image={card.src}
            pressed={selected === card.id}
            onClick={() => choose(card)}
          />
        ))}
      </div>
      <ChipRow chips={chips} onChange={setChips} />
      <button
        type="button"
        className="btn btn-secondary"
        disabled={regen >= 1}
        onClick={() => {
          if (character) {
            onChange({
              ...draft,
              characterRegen: 1,
              characterId: null,
              generations: draft.generations + 1,
            });
          } else {
            onChange({ ...draft, settingRegen: 1, settingId: null, generations: draft.generations + 1 });
          }
        }}
      >
        {childCopy.notQuite}
      </button>
      <Prompt text={childCopy.why} />
      <div className="create-chips">
        {whyOptions.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            pressed={why === option.id}
            onClick={() => {
              const value: ReflectionTap | null = why === option.id ? null : option.id;
              if (character) onChange({ ...draft, characterWhy: value });
              else onChange({ ...draft, settingWhy: value });
            }}
          />
        ))}
      </div>
      <p className="hint">{childCopy.undo}</p>
      <Continue disabled={!selected} onClick={onContinue} />
    </section>
  );
}

function PagesStep({
  draft,
  access,
  ownText,
  ownNote,
  fixOpen,
  onOwnText,
  onFixOpen,
  onNote,
  onChange,
  onFinish,
}: {
  draft: CreateDraft;
  access: CreateFlags;
  ownText: string;
  ownNote: string;
  fixOpen: boolean;
  onOwnText: (value: string) => void;
  onFixOpen: (value: boolean) => void;
  onNote: (value: string) => void;
  onChange: (draft: CreateDraft) => void;
  onFinish: () => void;
}) {
  const project = draft.project ?? "story";
  const total = pageCount(project);
  const pages = projectPages(project, draft);
  const index = Math.min(draft.pageIndex, total - 1);
  const page = pages[index];
  const sentences = sentenceBank(project, index + 1);
  const art = pageArt({ project, page: index + 1, retry: page.variant, fixes: page.fixes });
  const chosen =
    page.own?.trim()
      ? page.own
      : (sentences.find((sentence) => sentence.id === page.sentenceId)?.text ?? "");

  function update(nextPage: PageWork, extra: Partial<CreateDraft> = {}) {
    const copy = pages.slice();
    copy[index] = nextPage;
    onChange({ ...draft, pages: copy, pageIndex: index, ...extra });
  }

  return (
    <section className="grid gap-4">
      <h1 className="display text-3xl">{childCopy.pageOf(index + 1, total, project)}</h1>
      <div className="create-projects">
        {sentences.map((sentence) => (
          <Choice
            key={sentence.id}
            title={sentence.text}
            pressed={page.sentenceId === sentence.id && !page.own}
            onClick={() =>
              update({
                ...page,
                sentenceId: page.sentenceId === sentence.id && !page.own ? null : sentence.id,
                own: null,
              })
            }
          />
        ))}
      </div>
      {access.writeOwn ? (
        <div className="create-own">
          <label className="create-own-label" htmlFor="own-sentence">
            {childCopy.writeOwn}
          </label>
          <textarea
            id="own-sentence"
            className="create-text"
            value={ownText}
            maxLength={60}
            onChange={(event) => onOwnText(event.target.value)}
          />
          <div className="create-chips">
            <button
              type="button"
              className="create-chip"
              onClick={() => {
                const host = window as unknown as {
                  SpeechRecognition?: new () => Dictation;
                  webkitSpeechRecognition?: new () => Dictation;
                };
                const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
                if (!Ctor) return;
                const rec = new Ctor();
                rec.lang = "en-CA";
                rec.onresult = (event) => onOwnText(event.results[0][0].transcript);
                rec.start();
              }}
            >
              {childCopy.dictate}
            </button>
            <button
              type="button"
              className="create-chip"
              onClick={() => {
                const checked = screenWriteMyOwn(ownText);
                if (!checked.ok) {
                  onNote(childCopy.differentChoice);
                  return;
                }
                onNote("");
                update({ ...page, own: ownText.trim(), sentenceId: null });
              }}
            >
              Use this sentence
            </button>
          </div>
          {ownNote ? <p className="hint">{ownNote}</p> : null}
        </div>
      ) : (
        <p className="hint">{childCopy.writeOwnOff}</p>
      )}
      {chosen ? (
        <div className="create-art-block">
          <div className="speak-row">
            <p>{chosen}</p>
            <ReadAloud text={chosen} label="Speak the sentence" />
          </div>
          {page.reported ? (
            <p>{childCopy.reported}</p>
          ) : (
            <img className={`create-scene size-${draft.characterChips.size}`} src={art.src} alt="" />
          )}
          <button
            type="button"
            className="create-chip"
            onClick={() =>
              update({ ...page, reported: true }, { reportCount: draft.reportCount + (page.reported ? 0 : 1) })
            }
          >
            {childCopy.report}
          </button>
          <div className="create-chips">
            <Chip
              label={childCopy.keep}
              pressed={page.kept}
              onClick={() => update({ ...page, kept: !page.kept }, { keepCount: draft.keepCount + (page.kept ? 0 : 1) })}
            />
            <button
              type="button"
              className="create-chip"
              disabled={page.variant >= MAX_PAGE_RETRY}
              onClick={() =>
                update(
                  { ...page, variant: page.variant + 1, kept: false },
                  { retryCount: draft.retryCount + 1, generations: draft.generations + 1 },
                )
              }
            >
              {page.variant >= MAX_PAGE_RETRY ? childCopy.tryAgainDone : childCopy.tryAgain}
            </button>
            <button type="button" className="create-chip" onClick={() => onFixOpen(!fixOpen)}>
              {childCopy.fix}
            </button>
          </div>
          {fixOpen ? (
            <div className="create-chips">
              {(["night", "friend"] as const).map((fix) => (
                <Chip
                  key={fix}
                  label={fix === "night" ? childCopy.night : childCopy.friend}
                  pressed={page.fixes.includes(fix)}
                  onClick={() => {
                    const fixes: FixChip[] = page.fixes.includes(fix)
                      ? page.fixes.filter((item) => item !== fix)
                      : [...page.fixes, fix];
                    update(
                      { ...page, fixes },
                      { fixCount: draft.fixCount + (page.fixes.includes(fix) ? 0 : 1), generations: draft.generations + 1 },
                    );
                  }}
                />
              ))}
            </div>
          ) : null}
          <Prompt text={childCopy.match} />
          <div className="create-chips">
            {(
              [
                ["yes", childCopy.yes],
                ["mostly", childCopy.mostly],
                ["no", childCopy.noFix],
              ] as const
            ).map(([id, label]) => (
              <Chip
                key={id}
                label={label}
                pressed={page.match === id}
                onClick={() => {
                  const match: MatchMark | null = page.match === id ? null : id;
                  update({ ...page, match });
                  if (match === "no") onFixOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="create-chips">
        {index > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => onChange({ ...draft, pages, pageIndex: index - 1 })}>
            {childCopy.prevPage}
          </button>
        ) : null}
        {index < total - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => onChange({ ...draft, pages, pageIndex: index + 1 })}>
            {childCopy.nextPage}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onFinish}>
            {childCopy.continue}
          </button>
        )}
      </div>
    </section>
  );
}

function FinishStep({
  draft,
  playing,
  clearAsk,
  onPlay,
  onClearAsk,
  onChange,
  onDone,
}: {
  draft: CreateDraft;
  playing: boolean;
  clearAsk: boolean;
  onPlay: (value: boolean) => void;
  onClearAsk: (value: boolean) => void;
  onChange: (draft: CreateDraft) => void;
  onDone: (clear: boolean) => void;
}) {
  const project = draft.project ?? "story";
  const total = pageCount(project);
  const pages = projectPages(project, draft);
  const [frame, setFrame] = useState(0);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    setMotionOk(window.matchMedia("(prefers-reduced-motion: reduce)").matches === false);
  }, []);

  function toggle(tap: ReflectionTap) {
    const finishTaps = draft.finishTaps.includes(tap)
      ? draft.finishTaps.filter((item) => item !== tap)
      : [...draft.finishTaps, tap];
    onChange({ ...draft, finishTaps });
  }

  const shown = pages[frame] ?? pages[0];
  const art = pageArt({
    project,
    page: frame + 1,
    retry: shown?.variant ?? 0,
    fixes: shown?.fixes ?? [],
  });
  const line =
    shown?.own?.trim() ||
    sentenceBank(project, frame + 1).find((sentence) => sentence.id === shown?.sentenceId)?.text ||
    sentenceBank(project, frame + 1)[0].text;

  return (
    <section className="grid gap-4 create-finish">
      <h1 className="display text-3xl">{projectCopy[project].title}</h1>
      <div className={`create-book ${playing && motionOk ? "is-playing" : ""}`}>
        <img src={art.src} alt="" />
        <div className="speak-row">
          <p>{line}</p>
          <ReadAloud text={line} label="Speak this page" />
        </div>
        <p className="hint">{childCopy.pageOf(frame + 1, total, project)}</p>
      </div>
      <div className="create-chips">
        <button type="button" className="btn btn-secondary" onClick={() => setFrame((current) => (current - 1 + total) % total)}>
          {childCopy.prevPage}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setFrame((current) => (current + 1) % total)}>
          {project === "moving" ? childCopy.nextFrame : childCopy.nextPage}
        </button>
        {project === "moving" ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onPlay(motionOk ? !playing : false)}
          >
            {childCopy.play}
          </button>
        ) : null}
      </div>
      <Prompt text="What did the computer get wrong? What did you change?" />
      <div className="create-chips">
        {wrongOptions.map((option) => (
          <Chip key={option.id} label={option.label} pressed={draft.finishTaps.includes(option.id)} onClick={() => toggle(option.id)} />
        ))}
        {changedOptions.map((option) => (
          <Chip key={option.id} label={option.label} pressed={draft.finishTaps.includes(option.id)} onClick={() => toggle(option.id)} />
        ))}
      </div>
      <div className="create-chips">
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
          {childCopy.save}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onClearAsk(true)}>
          {childCopy.done}
        </button>
      </div>
      {clearAsk ? (
        <div className="create-clear">
          <p>{childCopy.clearAsk}</p>
          <div className="create-chips">
            <button type="button" className="btn btn-secondary" onClick={() => onDone(true)}>
              {childCopy.clearYes}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onDone(false)}>
              {childCopy.clearNo}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function HowCreateWorks() {
  return (
    <div className="create-screen">
      <h1 className="display text-4xl">{childCopy.how}</h1>
      <ol className="create-how">
        {howPanels.map((panel) => (
          <li key={panel.title} className="card">
            <div className="speak-row">
              <div>
                <h2>{panel.title}</h2>
                <p>{panel.body}</p>
              </div>
              <ReadAloud text={`${panel.title}. ${panel.body}`} label={`Speak ${panel.title}`} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Choice({
  title,
  text,
  image,
  icon,
  pressed,
  onClick,
}: {
  title: string;
  text?: string;
  image?: string;
  icon?: ProjectType;
  pressed?: boolean;
  onClick: () => void;
}) {
  const spoken = text ? `${title}. ${text}` : title;
  return (
    <div className="speak-row create-choice-row">
      <button type="button" className={`create-choice ${pressed ? "is-on" : ""}`} aria-pressed={pressed} onClick={onClick}>
        {icon ? <ProjectIcon kind={icon} /> : null}
        {image ? <img src={image} alt="" /> : null}
        <span>{title}</span>
        {text ? <span className="hint">{text}</span> : null}
      </button>
      <ReadAloud text={spoken} label={`Speak ${title}`} />
    </div>
  );
}

function Chip({ label, pressed, onClick }: { label: string; pressed?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`create-chip ${pressed ? "is-on" : ""}`} aria-pressed={pressed} onClick={onClick}>
      {label}
    </button>
  );
}

function ChipRow({ chips, onChange }: { chips: ChipBag; onChange: (chips: ChipBag) => void }) {
  const groups = [
    ["size", SIZES],
    ["colour", COLOURS],
    ["mood", MOODS],
    ["special", SPECIALS],
  ] as const;
  return (
    <div className="grid gap-3">
      {groups.map(([key, values]) => (
        <div key={key} className="create-chips">
          {values.map((value) => (
            <Chip
              key={value}
              label={value}
              pressed={chips[key] === value}
              onClick={() => onChange({ ...chips, [key]: value })}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Prompt({ text }: { text: string }) {
  return (
    <div className="speak-row">
      <p className="create-prompt">{text}</p>
      <ReadAloud text={text} label="Speak this question" />
    </div>
  );
}

function Continue({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-primary" disabled={disabled} onClick={onClick}>
      {childCopy.continue}
    </button>
  );
}

function ProjectIcon({ kind }: { kind: ProjectType }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const };
  return (
    <svg className="create-icon" viewBox="0 0 32 32" aria-hidden="true">
      {kind === "story" ? <path {...common} d="M8 6h12a4 4 0 0 1 4 4v16H12a4 4 0 0 0-4 4V6z" /> : null}
      {kind === "comic" ? <path {...common} d="M6 8h20v16H6zM6 16h20M16 8v16" /> : null}
      {kind === "moving" ? <path {...common} d="M6 10h14v12H6zM20 14l6-3v10l-6-3z" /> : null}
    </svg>
  );
}

type Dictation = {
  lang: string;
  start: () => void;
  onresult: ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
};

export const createParentSamplesNote = parentCopy.samplesOnly;
