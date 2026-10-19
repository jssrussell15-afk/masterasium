// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { getLocalTemplateSnapshot, subscribeLocalTemplates } from "@/lib/worksheets/local";

describe("local template snapshot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    const first = getLocalTemplateSnapshot();
    const second = getLocalTemplateSnapshot();

    expect(first).toEqual([]);
    expect(second).toBe(first);
  });

  it("does not throw when subscribing is blocked", () => {
    vi.spyOn(window, "addEventListener").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(() => subscribeLocalTemplates(() => undefined)).not.toThrow();
  });
});
