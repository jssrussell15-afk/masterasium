import { DigestPanel } from "@/components/digest-panel";
import { ParentProgressView } from "@/components/parent-progress";
import { StartPracticeButton } from "@/components/start-practice-button";
import { SetPinForm } from "@/components/student-access-forms";
import { Shell } from "@/components/site-header";
import { buildParentProgress } from "@/lib/lesson/parent";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Progress sample",
};

export default function ProgressSamplePage() {
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
      {
        skillId: "g3-mult",
        title: "Multiplication facts to 10×10",
        sentence: "Equal groups tell a multiplication: 6 groups of 7 is 42.",
        stage: "practice",
        completedOn: null,
        lastMistake: "The numbers were added. This question uses a different operation.",
      },
    ],
    reviews: [
      {
        skillId: "g3-place",
        title: "Place value to 1,000",
        gap: "day",
        dueOn: "2026-10-19",
        done: false,
      },
      {
        skillId: "g3-place",
        title: "Place value to 1,000",
        gap: "week",
        dueOn: "2026-10-25",
        done: false,
      },
    ],
    attempts: [
      { skillId: "g3-mult", title: "Multiplication facts to 10×10", correct: false, date: "2026-10-18" },
    ],
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

  return (
    <Shell role="parent" action={null}>
      <article className="card mt-6 grid gap-4">
        <p className="hint">Sample desk. Not a real child.</p>
        <h1 className="display text-4xl">Sam</h1>
        <p className="hint">Enrolled in Grade 3</p>
        <StartPracticeButton childId="00000000-0000-4000-8000-000000000001" />
        <SetPinForm
          childId="00000000-0000-4000-8000-000000000001"
          firstName="Sam"
          hasLogin
          returnTo="dashboard"
        />
        <div className="grid gap-1">
          <p>Practiced today.</p>
          <p>Working on Place value to 1,000.</p>
        </div>
        <ParentProgressView progress={progress} digestHref="/preview/digest" />
        <DigestPanel childId="00000000-0000-4000-8000-000000000001" savedText={null} />
      </article>
    </Shell>
  );
}
