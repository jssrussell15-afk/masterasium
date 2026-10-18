import Link from "next/link";
import { CurriculumFooter } from "@/components/curriculum-footer";
import { CurriculumSwitch } from "@/components/curriculum-switch";
import { SampleRequest } from "@/components/sample-request";
import type { ChipModel, GradePage, PageItem } from "@/lib/curriculum/view";
import type { CurriculumSkill } from "@/lib/curriculum/overview";

export function CurriculumGrade({
  page,
  view,
}: {
  page: GradePage;
  view: "strands" | "sequence";
}) {
  const showSequence = view === "sequence" && page.sequence != null;
  const samples: CurriculumSkill[] = page.strands
    .flatMap((strand) => strand.items)
    .filter((item) => item.practice)
    .map((item) => ({
      id: item.practice!.id,
      title: item.title,
      line: item.chips.map((chip) => chip.label).join(" "),
      prompt: item.practice!.prompt,
      answer: item.practice!.answer,
    }));

  return (
    <div className="mt-6 grid gap-6">
      <CurriculumSwitch
        province={page.jurisdiction.slug}
        provinceCode={page.jurisdiction.code}
        grade={page.grade}
        view={showSequence ? "sequence" : page.sequence ? view : null}
        showSequenceToggle={page.sequence != null}
      />
      {page.gradeNote ? <p className="feedback">{page.gradeNote}</p> : null}
      <div>
        <h1 className="display text-4xl md:text-5xl">
          Grade {page.grade} math in {page.jurisdiction.name}
        </h1>
        {page.follows ? <p className="mt-3 font-semibold">{page.follows}</p> : null}
        <p className="lede mt-3 max-w-2xl">{page.intro}</p>
      </div>
      {page.banner ? (
        <p className="banner" role="status">
          {page.banner}
        </p>
      ) : null}
      {showSequence && page.sequence ? <SequenceView page={page} /> : <StrandView page={page} />}
      <div className="flex flex-wrap gap-3">
        <SampleRequest
          province={page.jurisdiction.slug}
          provinceName={page.jurisdiction.name}
          grade={page.grade}
          skills={samples}
        />
        <Link href="/signup" className="btn btn-primary">
          Create a parent account
        </Link>
      </div>
      <CurriculumFooter title={page.docTitle} lastVerified={page.lastVerified} note={page.footerNote} />
    </div>
  );
}

function StrandView({ page }: { page: GradePage }) {
  const seen = new Set<string>();
  return (
    <div className="grid gap-6">
      {page.strands.map((strand) => (
        <section key={strand.code} aria-labelledby={`strand-${strand.code}`}>
          <h2 id={`strand-${strand.code}`} className="text-lg font-semibold">
            {strand.heading}
          </h2>
          <ul className="strand-list">
            {strand.items.map((item) => (
              <ItemRow key={item.key} item={item} seen={seen} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SequenceView({ page }: { page: GradePage }) {
  const sequence = page.sequence;
  if (!sequence) return null;
  const seen = new Set<string>();
  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold">
          Suggested order{" "}
          <span className="sequence-badge" data-testid="sequence-badge">
            {sequence.label}
          </span>
        </h2>
        <p className="mt-2 max-w-2xl">{sequence.disclaimer}</p>
      </div>
      {sequence.blocks.map((block) => (
        <section key={block.position} className="card" data-testid="sequence-block" data-position={block.position}>
          <h3 className="font-semibold">
            {block.position}. {block.title}
            {block.approxWeeks ? ` ~${block.approxWeeks} weeks` : ""}
          </h3>
          <ul className="strand-list">
            {block.main.map((item) => (
              <ItemRow key={item.key} item={item} seen={seen} />
            ))}
            {block.comingSoon.map((item) => (
              <ItemRow key={item.key} item={item} seen={seen} />
            ))}
          </ul>
          {block.review.length > 0 ? (
            <div className="mt-3">
              <h4 className="font-semibold">Review</h4>
              <ul className="strand-list">
                {block.review.map((item) => (
                  <ItemRow key={`review-${item.key}`} item={item} seen={seen} />
                ))}
              </ul>
            </div>
          ) : null}
          {block.keepPractising.length > 0 ? (
            <p className="keep-practising" data-testid="keep-practising">
              Keep practising{" "}
              {block.keepPractising.map((chip) => {
                const anchor = !seen.has(chip.code);
                if (anchor) seen.add(chip.code);
                return <CodeChip key={chip.code} chip={chip} anchor={anchor} />;
              })}
            </p>
          ) : null}
        </section>
      ))}
      <details className="sources">
        <summary>Sources</summary>
        <ul>
          <li>Simcoe County DSB Grade 3 Course of Study (Aug 2020)</li>
          <li>
            <a href="https://andrw.dpcdsb.org/download/519657">Dufferin-Peel CDSB Grade 3 Long-Range Plan</a>
          </li>
        </ul>
      </details>
    </div>
  );
}

function ItemRow({ item, seen }: { item: PageItem; seen: Set<string> }) {
  if (item.kind === "subhead" || item.kind === "group") {
    return (
      <li className="strand-subhead">
        <p className="font-semibold">{item.title}</p>
      </li>
    );
  }
  return (
    <li className={item.kind === "note" ? "strand-note" : undefined}>
      <p className="font-semibold">
        {item.title}{" "}
        {item.chips.map((chip) => {
          const anchor = !seen.has(chip.code);
          if (anchor) seen.add(chip.code);
          return <CodeChip key={`${item.key}-${chip.code}`} chip={chip} anchor={anchor} />;
        })}
      </p>
      {item.tag ? <p className="hint practice-soon">{item.tag}</p> : null}
    </li>
  );
}

function CodeChip({ chip, anchor = false }: { chip: ChipModel; anchor?: boolean }) {
  return (
    <details className="code-chip" data-code-type={chip.codeType} id={anchor ? chip.code : undefined}>
      <summary>
        {chip.label}
        {chip.derived ? <small className="masterasium-ref">Masterasium ref</small> : null}
      </summary>
      <div className="chip-popover">
        {chip.text ? <p>{chip.text}</p> : null}
        {chip.extraLines.map((line) => (
          <div key={line.heading}>
            <p className="font-semibold">{line.heading}</p>
            <ul>
              {line.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
        {chip.processes.length > 0 ? (
          <p>
            {chip.processes.map((process) => (
              <span key={process.code} className="process-tag">
                {process.code} {process.label}
              </span>
            ))}
          </p>
        ) : null}
        <p>
          <a href={chip.sourceUrl}>Source</a>
        </p>
      </div>
    </details>
  );
}
