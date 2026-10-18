import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { ParentCanDoSummary, StudentCanDo } from "@/components/can-do-list";
import { LessonView } from "@/components/lesson-session";
import { StudentDashboard } from "@/components/student-dashboard";
import { parentCanDoChildId, studentCanDoChildId } from "@/lib/can-do/access";
import { sampleCanDo } from "@/lib/can-do/sample";
import { loadCanDo } from "@/lib/can-do/load";
import { GRADE_3_I_CAN, iCanStatement } from "@/lib/can-do/statements";
import {
  LOOKBACK_LABEL,
  PARENT_CAN_DO_LIMIT,
  PARENT_EMPTY,
  STUDENT_EMPTY,
  buildCanDo,
  workingOnLine,
  type CanDoView,
} from "@/lib/can-do/view";
import { lessonById } from "@/lib/lesson/catalog";
import { freshRun } from "@/lib/lesson/flow";
import { buildLessonScreen } from "@/lib/lesson/screen";
import { writeLearn } from "@/lib/practice/memory";
import { emptyCard } from "@/lib/practice/scheduler";
import { skillById, skillsForGrade } from "@/lib/practice/skills";

const today = "2026-10-18";

describe("i can statements", () => {
  it("maps a short line only to genuine Ontario Grade 3 skills", () => {
    const genuine = [
      "g3-place",
      "g3-add-sub",
      "g3-fractions",
      "g3-mult",
      "g3-perimeter",
      "g3-time",
      "g3-data",
    ];
    expect(Object.keys(GRADE_3_I_CAN).sort()).toEqual([...genuine].sort());
    for (const id of genuine) {
      const skill = skillById(id);
      expect(skill?.grade).toBe(3);
      if (!skill) continue;
      const line = iCanStatement(skill);
      expect(line).toBe(GRADE_3_I_CAN[id]);
      expect(line.startsWith("I can ")).toBe(true);
      expect(line.endsWith(".")).toBe(true);
      expect(line.split(/[.!?]/u).filter(Boolean)).toHaveLength(1);
      expect(line.split(/\s+/u).length).toBeLessThanOrEqual(12);
      expect(line.toLowerCase()).not.toContain("denominator");
      expect(line.toLowerCase()).not.toContain("numerator");
    }
    expect(GRADE_3_I_CAN["g3-place"]).toBe("I can show what each digit is worth to 1,000.");
    expect(GRADE_3_I_CAN["g3-fractions"]).toBe("I can name equal fractions for a fair share.");
    expect(GRADE_3_I_CAN["g3-mult"]).toBe("I can multiply and divide by 2, 5, and 10.");
    expect(GRADE_3_I_CAN["g3-perimeter"]).toBe("I can find the distance around a polygon.");
    expect(GRADE_3_I_CAN["g3-time"]).toBe("I can tell time in hours, minutes, and seconds.");
    expect(GRADE_3_I_CAN["g3-data"]).toBe("I can read pictographs and bar graphs.");
    expect(GRADE_3_I_CAN["g3-div-rem"]).toBeUndefined();

    const remainders = skillById("g3-div-rem");
    expect(remainders).toBeTruthy();
    if (!remainders) return;
    expect(iCanStatement(remainders)).toBe("I can do division with remainders.");
    expect(iCanStatement({ id: "sample-product", grade: 4, title: "Facts of 2 × 5" })).toBe(
      "I can do facts of 2\u00A0×\u00A05.",
    );

    const area = skillById("g4-area");
    expect(area).toBeDefined();
    if (!area) return;
    expect(iCanStatement(area)).toBe("I can do area of rectangles.");
    expect(GRADE_3_I_CAN[area.id]).toBeUndefined();
    expect(skillsForGrade(3).some((skill) => skill.id === "g3-mult")).toBe(true);
  });
});

describe("can-do query", () => {
  it("groups mastered skills by strand, newest first, with a quiet review only when it is due", () => {
    const view = buildCanDo({
      grade: 3,
      today,
      childId: "child-a",
      showReviewLinks: true,
      lessons: [
        { skillId: "g3-place", stage: "complete", completedOn: "2026-10-16" },
        { skillId: "g3-fractions", stage: "complete", completedOn: "2026-08-02" },
        { skillId: "g3-mult", stage: "complete", completedOn: "2026-09-12" },
        { skillId: "g3-add-sub", stage: "practice", completedOn: null },
        { skillId: "g3-data", stage: "complete", completedOn: "2026-07-01" },
      ],
      reviews: [
        { skillId: "g3-place", gap: "day", dueOn: "2026-10-17", done: false },
        { skillId: "g3-place", gap: "week", dueOn: "2026-10-25", done: false },
        { skillId: "g3-mult", gap: "month", dueOn: "2026-11-12", done: false },
        { skillId: "g3-fractions", gap: "week", dueOn: "2026-08-09", done: true },
        { skillId: "g3-add-sub", gap: "day", dueOn: "2026-10-01", done: false },
        { skillId: "g4-area", gap: "month", dueOn: "2026-10-01", done: false },
      ],
      cards: [
        {
          ...emptyCard("g4-area"),
          attempted: 10,
          correct: 8,
          fsrs: null,
        },
        {
          ...emptyCard("g3-time"),
          attempted: 10,
          correct: 7,
          fsrs: null,
        },
      ],
      practicedOn: { "g4-area": "2026-05-03", "g3-place": "2026-11-02" },
    });

    expect(view.workingTitle).toBe("Addition and subtraction within 1,000");
    expect(view.strands.map((strand) => strand.label)).toEqual([
      "Number sense",
      "Operations",
      "Measurement",
      "Data",
    ]);
    const number = view.strands.find((strand) => strand.id === "number");
    expect(number?.skills.map((skill) => skill.skillId)).toEqual(["g3-place", "g3-fractions"]);
    expect(number?.skills[0]?.month).toBe("October");
    expect(number?.skills[0]?.statement).toBe(GRADE_3_I_CAN["g3-place"]);
    expect(number?.skills[0]?.review).toEqual({
      kind: "lesson",
      href: "/practice/child-a/lesson/g3-place",
    });
    expect(view.recent.find((skill) => skill.skillId === "g3-mult")?.review).toBeNull();
    expect(view.recent.find((skill) => skill.skillId === "g3-fractions")?.review).toBeNull();
    expect(view.recent.map((skill) => skill.skillId)).not.toContain("g3-add-sub");
    expect(view.recent.map((skill) => skill.skillId)).not.toContain("g3-time");
    const area = view.recent.find((skill) => skill.skillId === "g4-area");
    expect(area?.statement).toBe("I can do area of rectangles.");
    expect(area?.month).toBe("May");
    expect(area?.review).toEqual({ kind: "practice", childId: "child-a", skillId: "g4-area" });
    expect(view.recent.filter((skill) => skill.review)).toHaveLength(2);
  });

  it("builds the preview list from genuine Grade 3 skills only", () => {
    const filled = sampleCanDo("filled", true);
    expect(filled.workingTitle).toBe("Addition and subtraction within 1,000");
    expect(filled.recent.map((skill) => skill.skillId)).toEqual([
      "g3-time",
      "g3-data",
      "g3-perimeter",
      "g3-fractions",
      "g3-mult",
      "g3-place",
    ]);
    for (const skill of filled.recent) {
      expect(GRADE_3_I_CAN[skill.skillId]).toBe(skill.statement);
      expect(skill.statement).not.toMatch(/10\s*×\s*10/u);
      expect(skill.statement.toLowerCase()).not.toContain("remainder");
    }
    expect(filled.recent[0]?.review).toMatchObject({ kind: "lesson" });
    expect(filled.recent.map((skill) => skill.skillId)).not.toContain("g3-div-rem");
    expect(filled.recent.map((skill) => skill.skillId)).not.toContain("g3-add-sub");
    expect(sampleCanDo("empty", true).recent).toEqual([]);
    expect(sampleCanDo("empty", true).workingTitle).toBe("Addition and subtraction within 1,000");
  });

  it("keeps the month a lesson was finished, even if practice continued later", () => {
    const view = buildCanDo({
      grade: 3,
      today,
      childId: "child-a",
      showReviewLinks: false,
      lessons: [{ skillId: "g3-place", stage: "complete", completedOn: "2026-10-02" }],
      reviews: [],
      cards: [{ ...emptyCard("g3-place"), attempted: 12, correct: 12, fsrs: writeLearn(null, { lessonCheck: "passed" }) }],
      practicedOn: { "g3-place": "2026-11-20" },
    });
    expect(view.recent[0]?.month).toBe("October");
    expect(view.recent[0]?.review).toBeNull();
  });

  it("reads only the requested child and still lists a mastered skill when lesson tables are missing", async () => {
    const { client, filters } = mockSupabase({
      lesson_runs: [
        { child_id: "child-a", skill_id: "g3-place", stage: "complete", completed_at: "2026-10-16T16:00:00.000Z" },
        { child_id: "child-b", skill_id: "g3-data", stage: "complete", completed_at: "2026-10-16T16:00:00.000Z" },
      ],
      skill_reviews: [
        { child_id: "child-a", skill_id: "g3-place", gap: "day", due_on: "2026-10-17", done_at: null },
        { child_id: "child-b", skill_id: "g3-data", gap: "day", due_on: "2026-10-17", done_at: null },
      ],
      skill_states: [
        {
          child_id: "child-a",
          skill_id: "g3-place",
          attempted: 6,
          correct: 5,
          streak: 2,
          fsrs: writeLearn(null, { lessonCheck: "passed" }),
          updated_at: "2026-11-02T16:00:00.000Z",
        },
        {
          child_id: "child-b",
          skill_id: "g3-mult",
          attempted: 10,
          correct: 10,
          streak: 4,
          fsrs: null,
          updated_at: "2026-09-01T16:00:00.000Z",
        },
      ],
    });

    const loaded = await loadCanDo(client, {
      childId: "child-a",
      grade: 3,
      today,
      showReviewLinks: true,
    });
    expect(filters.map((filter) => filter.table).sort()).toEqual([
      "go_further_sets",
      "lesson_runs",
      "skill_reviews",
      "skill_states",
    ]);
    expect(filters.every((filter) => filter.column === "child_id" && filter.value === "child-a")).toBe(true);
    expect(loaded.error).toBeNull();
    expect(loaded.view?.recent.map((skill) => skill.skillId)).toEqual(["g3-place"]);
    expect(loaded.view?.recent[0]?.month).toBe("October");
    expect(loaded.view?.recent[0]?.review).toEqual({
      kind: "lesson",
      href: "/practice/child-a/lesson/g3-place",
    });
    expect(loaded.view?.recent[0]?.statement).not.toContain("bar graph");
  });

  it("uses skill states when the lesson tables are not there yet", async () => {
    const missing = { message: 'relation "public.lesson_runs" does not exist', code: "42P01" };
    const { client } = mockSupabase({
      lesson_runs: { error: missing },
      skill_reviews: { error: { message: 'relation "public.skill_reviews" does not exist', code: "42P01" } },
      skill_states: [
        {
          child_id: "child-a",
          skill_id: "g4-area",
          attempted: 10,
          correct: 9,
          streak: 3,
          fsrs: null,
          updated_at: "2026-05-03T16:00:00.000Z",
        },
      ],
    });
    const loaded = await loadCanDo(client, {
      childId: "child-a",
      grade: 4,
      today,
      showReviewLinks: false,
    });
    expect(loaded.error).toBeNull();
    expect(loaded.view?.recent[0]?.statement).toBe("I can do area of rectangles.");
    expect(loaded.view?.recent[0]?.month).toBe("May");
    expect(loaded.view?.recent[0]?.review).toBeNull();
  });

  it("adds a quiet Go further line and still loads when that table is missing", async () => {
    const done = mockSupabase({
      skill_states: [
        {
          child_id: "child-a",
          skill_id: "g3-add-sub",
          attempted: 10,
          correct: 8,
          streak: 1,
          fsrs: null,
          updated_at: "2026-10-02T16:00:00.000Z",
        },
      ],
      go_further_sets: [{ child_id: "child-a", skill_id: "g3-add-sub", completed_at: "2026-10-03T16:00:00.000Z" }],
    });
    const loaded = await loadCanDo(done.client, {
      childId: "child-a",
      grade: 3,
      today,
      showReviewLinks: false,
    });
    expect(loaded.view?.recent[0]?.statement).toBe(GRADE_3_I_CAN["g3-add-sub"]);
    expect(loaded.view?.further).toEqual(["Went further on adding with regrouping"]);

    const missing = mockSupabase({
      skill_states: [
        {
          child_id: "child-a",
          skill_id: "g3-add-sub",
          attempted: 10,
          correct: 8,
          streak: 1,
          fsrs: null,
          updated_at: "2026-10-02T16:00:00.000Z",
        },
      ],
      go_further_sets: { error: { message: 'relation "public.go_further_sets" does not exist', code: "42P01" } },
    });
    const fallback = await loadCanDo(missing.client, {
      childId: "child-a",
      grade: 3,
      today,
      showReviewLinks: false,
    });
    expect(fallback.error).toBeNull();
    expect(fallback.view?.further).toEqual([]);
    expect(fallback.view?.recent[0]?.statement).toBe(GRADE_3_I_CAN["g3-add-sub"]);
  });

  it("does not invent a list when the skill query fails", async () => {
    const { client } = mockSupabase({
      lesson_runs: [],
      skill_reviews: [],
      skill_states: { error: { message: "permission denied for table skill_states", code: "42501" } },
    });
    const loaded = await loadCanDo(client, {
      childId: "child-a",
      grade: 3,
      today,
      showReviewLinks: true,
    });
    expect(loaded.view).toBeNull();
    expect(loaded.error).toContain("permission denied");
  });
});

describe("can-do access", () => {
  it("keeps a student on their own id and a parent on their own children", () => {
    expect(studentCanDoChildId("child-a")).toBe("child-a");
    expect(studentCanDoChildId("child-a", "child-a")).toBe("child-a");
    expect(studentCanDoChildId("child-a", "child-b")).toBeNull();
    expect(studentCanDoChildId("  ", "child-a")).toBeNull();
    expect(parentCanDoChildId(["child-a", "child-c"], "child-a")).toBe("child-a");
    expect(parentCanDoChildId(["child-a"], "child-b")).toBeNull();
    expect(parentCanDoChildId([], "child-a")).toBeNull();
  });
});

describe("can-do rendering", () => {
  it("lists statements, the month, and a gentle look-back without totals or rewards", () => {
    const view = sampleView();
    const html = renderToStaticMarkup(createElement(StudentCanDo, { view }));
    expect(html).toContain("Things I can do");
    expect(html).toContain(workingOnLine("Addition and subtraction within 1,000"));
    expect(html).toContain("Number sense");
    expect(html).toContain(GRADE_3_I_CAN["g3-place"]);
    expect(html).toContain("October");
    expect(html.indexOf(GRADE_3_I_CAN["g3-place"])).toBeLessThan(html.indexOf(GRADE_3_I_CAN["g3-fractions"]));
    expect(html.indexOf("Number sense")).toBeLessThan(html.indexOf("Measurement"));
    expect(html).toContain(LOOKBACK_LABEL);
    expect(html).toContain('href="/practice/child-a/lesson/g3-place"');
    expect(html).not.toContain("/practice/child-a/lesson/g3-mult");
    expect(html).not.toContain("10\u00A0×\u00A010");
    expect(html).toContain("I can do area of rectangles.");
    expect(html).toContain('name="skillId" value="g4-area"');
    expect(html).toContain("Learned");
    expect(html).not.toContain(STUDENT_EMPTY);
    expect(quiet(html)).toBe(true);
  });

  it("shows the empty line and the skill in progress", () => {
    const view = buildCanDo({
      grade: 3,
      today,
      childId: "child-a",
      showReviewLinks: true,
      lessons: [],
      reviews: [],
      cards: [],
    });
    const html = renderToStaticMarkup(createElement(StudentCanDo, { view }));
    expect(html).toContain(STUDENT_EMPTY.replaceAll("'", "&#x27;"));
    expect(html).toContain(workingOnLine(view.workingTitle));
    expect(html).not.toContain(LOOKBACK_LABEL);
    expect(html).not.toContain("Number sense");
    expect(quiet(html)).toBe(true);
  });

  it("shows the parent the five newest lines, the current skill, and see all", () => {
    const view = sixSkills();
    const html = renderToStaticMarkup(
      createElement(ParentCanDoSummary, { view, seeAllHref: "/dashboard/can-do/child-a" }),
    );
    expect(html).toContain("Can do now");
    expect(html).toContain(workingOnLine(view.workingTitle));
    expect(html).toContain('href="/dashboard/can-do/child-a"');
    expect(html).toContain("See all");
    expect(html).not.toContain(LOOKBACK_LABEL);
    expect(html).not.toContain(PARENT_EMPTY);
    const shown = view.recent.slice(0, PARENT_CAN_DO_LIMIT);
    const hidden = view.recent.slice(PARENT_CAN_DO_LIMIT);
    expect(shown).toHaveLength(5);
    expect(hidden).toHaveLength(1);
    for (const skill of shown) expect(html).toContain(skill.statement);
    for (const skill of hidden) expect(html).not.toContain(skill.statement);
    expect(quiet(html)).toBe(true);
  });

  it("uses a calm empty line on the parent desk when nothing is finished", () => {
    const view = buildCanDo({
      grade: 2,
      today,
      childId: "child-a",
      showReviewLinks: false,
      lessons: [],
      reviews: [],
      cards: [],
    });
    const html = renderToStaticMarkup(
      createElement(ParentCanDoSummary, { view, seeAllHref: "/dashboard/can-do/child-a" }),
    );
    expect(html).toContain(PARENT_EMPTY);
    expect(html).toContain(workingOnLine(view.workingTitle));
    expect(html).not.toContain("See all");
    expect(html).not.toContain(STUDENT_EMPTY.replaceAll("'", "&#x27;"));
  });

  it("links the practice home and the lesson-complete screen to the list", () => {
    const home = renderToStaticMarkup(
      createElement(StudentDashboard, {
        childId: "child-1",
        childName: "Sam",
        grade: 3,
        home: { assigned: [], recommended: [], recent: [] },
        skills: [],
        access: { enrolled: 3, working: 3, nextUnlocked: false, requested: null },
        requestedGrade: null,
      }),
    );
    expect(home).toContain('href="/practice/can-do"');
    expect(home).toContain("Things I can do");

    const skill = skillById("g3-place");
    const lesson = lessonById("g3-place");
    expect(skill && lesson).toBeTruthy();
    if (!skill || !lesson) return;
    const done = renderToStaticMarkup(
      createElement(LessonView, {
        screen: buildLessonScreen({ ...freshRun(skill.id), stage: "complete" }, skill, lesson, {
          nextReview: null,
        }),
      }),
    );
    expect(done).toContain('href="/practice/can-do"');
    expect(done).toContain("Things I can do");
    expect(done).toContain("Back to skills");
  });
});

function sampleView(): CanDoView {
  return buildCanDo({
    grade: 3,
    today,
    childId: "child-a",
    showReviewLinks: true,
    lessons: [
      { skillId: "g3-place", stage: "complete", completedOn: "2026-10-16" },
      { skillId: "g3-fractions", stage: "complete", completedOn: "2026-08-02" },
      { skillId: "g3-perimeter", stage: "complete", completedOn: "2026-09-12" },
    ],
    reviews: [
      { skillId: "g3-place", gap: "day", dueOn: "2026-10-18", done: false },
      { skillId: "g3-perimeter", gap: "week", dueOn: "2026-10-30", done: false },
      { skillId: "g4-area", gap: "month", dueOn: "2026-10-01", done: false },
    ],
    cards: [{ ...emptyCard("g4-area"), attempted: 10, correct: 10, fsrs: null }],
    practicedOn: { "g4-area": "2026-05-03" },
  });
}

function sixSkills(): CanDoView {
  return buildCanDo({
    grade: 3,
    today,
    childId: "child-a",
    showReviewLinks: true,
    lessons: [
      { skillId: "g3-time", stage: "complete", completedOn: "2026-10-16" },
      { skillId: "g3-data", stage: "complete", completedOn: "2026-10-02" },
      { skillId: "g3-perimeter", stage: "complete", completedOn: "2026-09-18" },
      { skillId: "g3-fractions", stage: "complete", completedOn: "2026-09-04" },
      { skillId: "g3-place", stage: "complete", completedOn: "2026-08-20" },
      { skillId: "g3-add-sub", stage: "complete", completedOn: "2026-08-02" },
    ],
    reviews: [{ skillId: "g3-time", gap: "day", dueOn: "2026-10-17", done: false }],
    cards: [],
  });
}

function quiet(html: string): boolean {
  const visible = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const lower = visible.toLowerCase();
  return (
    !lower.includes("streak") &&
    !lower.includes("badge") &&
    !lower.includes("trophy") &&
    !lower.includes("confetti") &&
    !lower.includes("points") &&
    !visible.includes("$") &&
    !visible.includes("progressbar") &&
    !lower.includes("pricing")
  );
}

type Row = Record<string, unknown>;
type TableSource = Row[] | { error: { message: string; code?: string } };

function mockSupabase(tables: Record<string, TableSource>): {
  client: SupabaseClient;
  filters: { table: string; column: string; value: string }[];
} {
  const filters: { table: string; column: string; value: string }[] = [];
  const client = {
    from(table: string) {
      const state = { filters: [] as { column: string; value: string }[] };
      const query = {
        select() {
          return query;
        },
        eq(column: string, value: string) {
          state.filters.push({ column, value });
          filters.push({ table, column, value });
          return query;
        },
        then(
          onFulfilled: (value: {
            data: Row[] | null;
            error: { message: string; code?: string } | null;
          }) => unknown,
        ) {
          const source = tables[table];
          if (source && !Array.isArray(source)) {
            return Promise.resolve(onFulfilled({ data: null, error: source.error }));
          }
          const rows = ((source as Row[] | undefined) ?? []).filter((row) =>
            state.filters.every((filter) => row[filter.column] === undefined || row[filter.column] === filter.value),
          );
          return Promise.resolve(onFulfilled({ data: rows, error: null }));
        },
      };
      return query;
    },
  };
  return { client: client as unknown as SupabaseClient, filters };
}
