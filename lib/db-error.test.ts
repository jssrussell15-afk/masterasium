import { describe, expect, it } from "vitest";
import {
  COLUMN_UPDATE_MESSAGE,
  friendlyDbError,
  GRADE_PROGRESS_SETUP_MESSAGE,
  STUDENT_LOGIN_SETUP_MESSAGE,
} from "@/lib/db-error";

describe("friendlyDbError", () => {
  it("points a missing student login column at the new statements", () => {
    expect(
      friendlyDbError({
        message: 'column children.username does not exist',
        code: "42703",
      }),
    ).toBe(STUDENT_LOGIN_SETUP_MESSAGE);
  });

  it("keeps the starter-schema message for an unrelated missing table", () => {
    expect(
      friendlyDbError({
        message: 'relation "public.profiles" does not exist',
        code: "42P01",
      }),
    ).toMatch(/001_init\.sql/);
  });

  it("points a missing working grade at the grade progress statements", () => {
    expect(
      friendlyDbError({
        message: 'column children.working_grade does not exist',
        code: "42703",
      }),
    ).toBe(GRADE_PROGRESS_SETUP_MESSAGE);
  });

  it("keeps parent approval messages specific", () => {
    expect(friendlyDbError({ message: "Ask a parent to approve that grade." })).toBe(
      "Ask a parent to approve that grade.",
    );
    expect(friendlyDbError({ message: "Grade 8 is the last grade." })).toBe(
      "Grade 8 is the last grade.",
    );
    expect(friendlyDbError({ message: "There is no grade request to review." })).toBe(
      "There is no grade request to review.",
    );
  });

  it("points a missing signup save at the child profile statements", () => {
    expect(
      friendlyDbError({
        message:
          "Could not find the function public.create_signup_child(p_first_name, p_grade) in the schema cache",
        code: "PGRST202",
      }),
    ).toBe(
      "A child cannot be saved yet. The child profile is not ready in the database.",
    );
  });

  it("says when a username is taken", () => {
    expect(
      friendlyDbError({
        message: 'duplicate key value violates unique constraint "children_username_key"',
        code: "23505",
      }),
    ).toBe("That username is already taken.");
  });

  it("uses calm copy for a missing column and keeps the table message for a missing relation", () => {
    expect(
      friendlyDbError({
        message: 'column skill_states.streak does not exist',
        code: "42703",
      }),
    ).toBe(COLUMN_UPDATE_MESSAGE);
    expect(
      friendlyDbError({
        message: 'column "public.skill_states.consecutive_correct" does not exist',
      }),
    ).toBe(COLUMN_UPDATE_MESSAGE);
    expect(friendlyDbError({ message: "undefined column", code: "42703" })).toBe(
      COLUMN_UPDATE_MESSAGE,
    );
    expect(COLUMN_UPDATE_MESSAGE).not.toMatch(/001_init\.sql/);

    expect(
      friendlyDbError({
        message: 'relation "public.skill_states" does not exist',
      }),
    ).toMatch(/001_init\.sql/);
    expect(
      friendlyDbError({
        message: "Could not find the table public.skill_states in the schema cache",
        code: "PGRST205",
      }),
    ).toMatch(/001_init\.sql/);
    expect(
      friendlyDbError({
        message: "Could not find the table public.widgets in the schema cache",
      }),
    ).toBe("Could not find the table public.widgets in the schema cache");
    expect(
      friendlyDbError({
        message: "function public.not_a_real_thing() does not exist",
      }),
    ).toBe("function public.not_a_real_thing() does not exist");
  });
});
