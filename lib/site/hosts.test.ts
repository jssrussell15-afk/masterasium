import { describe, expect, it } from "vitest";
import { resolveAppEnv } from "@/lib/site/app-env";
import {
  analyticsToken,
  canonicalRedirectTarget,
  isAllowedHostname,
  publicOrigin,
  robotsHeader,
  showTestMode,
} from "@/lib/site/hosts";

describe("site hosts", () => {
  it("allows the apex, www, workers.dev, and local dev", () => {
    expect(isAllowedHostname("masterasium.com")).toBe(true);
    expect(isAllowedHostname("www.masterasium.com")).toBe(true);
    expect(isAllowedHostname("masterasium.workers.dev")).toBe(true);
    expect(isAllowedHostname("localhost:3000")).toBe(true);
    expect(isAllowedHostname("evil.example")).toBe(false);
    expect(isAllowedHostname("workers.dev")).toBe(false);
  });

  it("sends auth links on an unknown host to the apex", () => {
    expect(publicOrigin("evil.example", "https")).toBe("https://masterasium.com");
    expect(publicOrigin("www.masterasium.com", "http")).toBe("https://masterasium.com");
    expect(publicOrigin("localhost:3000", "http")).toBe("http://localhost:3000");
    expect(publicOrigin("127.0.0.1:3000", "http")).toBe("http://127.0.0.1:3000");
  });

  it("redirects www and http on the apex, and hides workers.dev from indexes", () => {
    expect(
      canonicalRedirectTarget({ host: "www.masterasium.com", proto: "https", path: "/login?as=student" }),
    ).toBe("https://masterasium.com/login?as=student");
    expect(canonicalRedirectTarget({ host: "masterasium.com", proto: "http", path: "/" })).toBe(
      "https://masterasium.com/",
    );
    expect(canonicalRedirectTarget({ host: "masterasium.com", proto: "https", path: "/" })).toBeNull();
    expect(robotsHeader("masterasium.workers.dev")).toBe("noindex, nofollow");
    expect(robotsHeader("masterasium.com")).toBeNull();
  });

  it("shows test mode unless the env is production, and skips a blank analytics token", () => {
    expect(showTestMode(undefined)).toBe(true);
    expect(showTestMode("staging")).toBe(true);
    expect(showTestMode("production")).toBe(false);
    expect(analyticsToken("  ")).toBeNull();
    expect(analyticsToken("token-1")).toBe("token-1");
  });

  it("uses the Worker env only on Cloudflare, and development everywhere else", () => {
    expect(resolveAppEnv({ onWorker: true, workerEnv: "production" })).toBe("production");
    expect(resolveAppEnv({ onWorker: true, workerEnv: "staging" })).toBe("staging");
    expect(resolveAppEnv({ onWorker: false, processEnv: undefined, workerEnv: "production" })).toBe("development");
  });
});
