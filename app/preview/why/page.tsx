import { notFound } from "next/navigation";
import { Shell } from "@/components/site-header";
import { generateQuestion } from "@/lib/practice/generate";
import { fillTemplate, WHY_SKILLS, type FilledWhy, type WhyQuestion, type WhySkill } from "@/lib/practice/why";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Why does that work? draft",
};

export default async function WhyPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const skills = WHY_SKILLS.filter((skill) => !params.skill || skill.id === params.skill);
  if (params.skill && skills.length === 0) notFound();

  return (
    <Shell narrow role="public" action={null} homeHref="/preview/why">
      <div className="why-preview">
        <p className="why-kicker">Draft preview</p>
        <h1>Why does that work?</h1>
        <p className="why-note">
          These prompts are not in practice. The feature flag is off. This page is for review.
        </p>
        {skills.map((skill) => (
          <section key={skill.id} className="why-skill" id={skill.id}>
            <h2>{skill.title}</h2>
            <p className="why-source">{sourceLine(skill)}</p>
            {framesFor(skill).map((frame) => (
              <article key={frame.template.id} className="why-card">
                <p className="why-question">{frame.question}</p>
                <h3>{frame.prompt}</h3>
                <p className="why-caption">
                  {frame.template.captionSource === "show-me"
                    ? "Show me"
                    : frame.template.captionSource === "heres-how"
                      ? "Here's how"
                      : "No walk caption"}
                  : {frame.caption}
                </p>
                <ul className="why-choices">
                  <li>
                    <span className="why-tag">Right reason</span>
                    {frame.right}
                  </li>
                  <li>
                    <span className="why-tag">{frame.mixupTag}</span>
                    {frame.mixup}
                  </li>
                  <li>
                    <span className="why-tag">irrelevant_true</span>
                    {frame.irrelevant}
                  </li>
                </ul>
                <p className="why-feedback">{frame.feedback}</p>
              </article>
            ))}
          </section>
        ))}
      </div>
    </Shell>
  );
}

function sourceLine(skill: WhySkill): string {
  if (!skill.generatorId) return "No Grade 3 generator. Samples only. No Show me and no Here's how.";
  const extra = skill.alsoGenerates.length > 0 ? ` Also filled from ${skill.alsoGenerates.join(", ")}.` : "";
  return `Filled from ${skill.generatorId}.${extra}`;
}

function framesFor(skill: WhySkill): FilledWhy[] {
  const frames: FilledWhy[] = [];
  for (const template of skill.templates) {
    const question = questionFor(skill, template.id);
    if (!question) continue;
    const prepared = skill.prepare(question);
    if (!prepared) continue;
    const filled = fillTemplate(template, question, prepared);
    if (filled) frames.push(filled);
  }
  return frames;
}

function questionFor(skill: WhySkill, templateId: string): WhyQuestion | null {
  if (!skill.generatorId) {
    return skill.samples.find((sample) => skill.prepare(sample)?.templateIds.includes(templateId)) ?? null;
  }
  const generators = [skill.generatorId, ...skill.alsoGenerates];
  for (const generatorId of generators) {
    for (let seed = 1; seed <= 200; seed += 1) {
      const rng = mulberry32(seed + templateId.length * 17);
      for (let index = 0; index < 12; index += 1) {
        const question = generateQuestion(generatorId, rng);
        const view: WhyQuestion = {
          prompt: question.prompt,
          answer: question.answer,
          steps: question.steps,
          walk: question.walk ?? null,
        };
        if (skill.prepare(view)?.templateIds.includes(templateId)) return view;
      }
    }
  }
  return null;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
