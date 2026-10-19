import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runClaimedLearning } from "@/lib/practice/learning-claim";

type AttemptRow = {
  child_id: string;
  client_attempt_id: string;
  learning_applied: boolean;
  skill_id: string;
  correct: boolean;
};

const childId = "child-1";
const attemptId = "11111111-1111-4111-8111-111111111111";

function attemptClient(rows: AttemptRow[], options?: { failClaim?: boolean }) {
  const updates: Record<string, unknown>[] = [];
  const client = {
    from(table: string) {
      if (table !== "attempts") throw new Error(table);
      const filters: { column: string; value: unknown }[] = [];
      let patch: Record<string, unknown> | null = null;
      const query = {
        update(values: Record<string, unknown>) {
          patch = values;
          updates.push(values);
          return query;
        },
        eq(column: string, value: unknown) {
          filters.push({ column, value });
          return query;
        },
        select() {
          return query;
        },
        finish() {
          if (options?.failClaim && patch?.learning_applied === true) {
            return { data: null, error: { message: "permission denied for table attempts" } };
          }
          const matches = rows.filter((row) =>
            filters.every((filter) => (row as Record<string, unknown>)[filter.column] === filter.value),
          );
          const row = matches[0];
          if (!row || !patch) return { data: null, error: null };
          Object.assign(row, patch);
          return { data: { skill_id: row.skill_id, correct: row.correct }, error: null };
        },
        maybeSingle() {
          return Promise.resolve(query.finish());
        },
        then(
          onFulfilled: (value: { data: { skill_id: string; correct: boolean } | null; error: { message: string } | null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          return Promise.resolve(query.finish()).then(onFulfilled, onRejected);
        },
      };
      return query;
    },
  };
  return { client: client as unknown as SupabaseClient, updates };
}

function storedRow(): AttemptRow {
  return {
    child_id: childId,
    client_attempt_id: attemptId,
    learning_applied: false,
    skill_id: "add-within-20",
    correct: true,
  };
}

describe("claimed learning", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies mastery once when a retry loses the flag", async () => {
    const rows = [storedRow()];
    const { client, updates } = attemptClient(rows);
    const seen: string[] = [];
    const apply = vi.fn(async (row: { skill_id: string }) => {
      seen.push(row.skill_id);
      return null;
    });

    const first = await runClaimedLearning({ supabase: client, childId, attemptId, apply });
    const second = await runClaimedLearning({ supabase: client, childId, attemptId, apply });

    expect(first).toEqual({ error: null, counted: true });
    expect(second).toEqual({ error: null, counted: true });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(["add-within-20"]);
    expect(rows[0]?.learning_applied).toBe(true);
    expect(updates[0]).toEqual({ learning_applied: true });
  });

  it("logs a failed flag write and does not apply or fail the save", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rows = [storedRow()];
    const { client } = attemptClient(rows, { failClaim: true });
    const apply = vi.fn(async () => null);

    const result = await runClaimedLearning({ supabase: client, childId, attemptId, apply });

    expect(result).toEqual({ error: null, counted: false });
    expect(apply).not.toHaveBeenCalled();
    expect(rows[0]?.learning_applied).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "Could not mark learning_applied.",
      "permission denied for table attempts",
    );
  });

  it("releases the flag when mastery does not save, so one later retry can apply", async () => {
    const rows = [storedRow()];
    const { client, updates } = attemptClient(rows);
    const apply = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce("Could not save that skill.")
      .mockResolvedValueOnce(null);

    const failed = await runClaimedLearning({ supabase: client, childId, attemptId, apply });
    expect(failed).toEqual({ error: "Could not save that skill.", counted: false });
    expect(rows[0]?.learning_applied).toBe(false);
    expect(updates.map((update) => update.learning_applied)).toEqual([true, false]);

    const retried = await runClaimedLearning({ supabase: client, childId, attemptId, apply });
    expect(retried).toEqual({ error: null, counted: true });
    expect(apply).toHaveBeenCalledTimes(2);
    expect(rows[0]?.learning_applied).toBe(true);

    const extra = await runClaimedLearning({ supabase: client, childId, attemptId, apply });
    expect(extra).toEqual({ error: null, counted: true });
    expect(apply).toHaveBeenCalledTimes(2);
  });
});
