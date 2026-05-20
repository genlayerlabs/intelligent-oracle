import { describe, expect, it } from "vitest";
import {
  normalizeEvidenceUrl,
  normalizeEvidenceUrlForDomains,
  normalizeSourceDomain,
} from "@/lib/evidence-url";

describe("normalizeSourceDomain", () => {
  it("canonicalizes domains and full URLs to a host", () => {
    expect(normalizeSourceDomain("https://www.apps.apple.com/us/charts/iphone")).toBe("apps.apple.com");
    expect(normalizeSourceDomain("apps.apple.com/us/charts/iphone")).toBe("apps.apple.com");
  });
});

describe("normalizeEvidenceUrl", () => {
  it("adds https when the user enters a bare domain path", () => {
    expect(normalizeEvidenceUrl("apps.apple.com/us/charts/iphone")).toEqual({
      success: true,
      url: "https://apps.apple.com/us/charts/iphone",
      hostname: "apps.apple.com",
    });
  });

  it("rejects unsupported schemes", () => {
    const result = normalizeEvidenceUrl("ftp://apps.apple.com/us/charts/iphone");
    expect(result.success).toBe(false);
  });
});

describe("normalizeEvidenceUrlForDomains", () => {
  it("accepts evidence from a configured domain", () => {
    expect(normalizeEvidenceUrlForDomains("apps.apple.com/us/charts/iphone", ["apps.apple.com"])).toEqual({
      success: true,
      url: "https://apps.apple.com/us/charts/iphone",
      hostname: "apps.apple.com",
    });
  });

  it("rejects evidence from an unconfigured domain before sending a transaction", () => {
    const result = normalizeEvidenceUrlForDomains("example.com/result", ["apps.apple.com"]);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("apps.apple.com");
  });
});
