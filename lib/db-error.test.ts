import { describe, expect, it } from "vitest";
import {
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

  it("says when a username is taken", () => {
    expect(
      friendlyDbError({
        message: 'duplicate key value violates unique constraint "children_username_key"',
        code: "23505",
      }),
    ).toBe("That username is already taken.");
  });
});
