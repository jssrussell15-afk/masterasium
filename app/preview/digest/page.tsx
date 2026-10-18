import { SundayNote } from "@/components/sunday-note";
import { Shell } from "@/components/site-header";
import { buildSundayDigest } from "@/lib/digest/sunday";
import { buildParentProgress } from "@/lib/lesson/parent";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Sunday note sample",
};

export default function DigestSamplePage() {
  const progress = buildParentProgress({
    today: "2026-10-18",
    lessons: [
      {
        skillId: "g3-place",
        title: "Place value to 1,000",
        sentence: "Where a digit sits tells what it is worth, so in 482 the 4 means 4 hundreds.",
        stage: "complete",
        completedOn: "2026-10-16",
        lastMistake: null,
      },
    ],
    reviews: [
      {
        skillId: "g3-place",
        title: "Place value to 1,000",
        gap: "week",
        dueOn: "2026-10-25",
        done: false,
      },
    ],
    attempts: [],
    solved: {
      title: "Place value to 1,000",
      prompt: "In 482, what is the value of the hundreds digit?",
      answer: "400",
    },
    repaired: {
      title: "Multiplication facts to 10×10",
      prompt: "6 × 7 = ?",
      answer: "42",
    },
  });
  const digest = buildSundayDigest("Sam", progress);
  // TODO: sendSundayDigest(digest) belongs here once an email provider exists.
  // This page only renders the note.

  return (
    <Shell role="parent" action={null}>
      <div className="mt-6">
        <p className="hint mb-3">Sample Sunday note. Not a real child. Nothing is emailed.</p>
        <SundayNote digest={digest} />
      </div>
    </Shell>
  );
}
