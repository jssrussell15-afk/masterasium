import { describe, expect, it } from "vitest";
import { scrubError, scrubLog } from "@/lib/log/scrub";

describe("log scrubber", () => {
  it("removes an email, a PIN, and a child name", () => {
    const line = scrubLog("Sam failed pin 2468 for sam@example.com", ["Sam"]);
    expect(line).not.toContain("sam@example.com");
    expect(line).not.toContain("2468");
    expect(line).not.toContain("Sam");
    expect(line).toContain("[email]");
    expect(line).toContain("[hidden]");
    expect(line).toContain("[name]");
  });

  it("keeps a math answer that is only a number", () => {
    expect(scrubLog("6 × 7 = 42")).toContain("42");
  });

  it("scrubs an error message before it is logged", () => {
    const logged = scrubError({ message: "parent ada@example.com", digest: "abc" });
    expect(logged.message).toBe("parent [email]");
    expect(logged.digest).toBe("abc");
  });
});
