import { describe, expect, it } from "vitest";
import {
  addUtcDays,
  getResolutionUnlockDate,
  isResolutionLocked,
  latestIsoDateFromText,
  utcDateOnly,
} from "@/lib/resolution-date";

describe("utcDateOnly", () => {
  it("formats the UTC calendar day", () => {
    expect(utcDateOnly(new Date("2026-05-20T23:59:59.999Z"))).toBe("2026-05-20");
  });
});

describe("isResolutionLocked", () => {
  it("locks resolution before the earliest UTC date", () => {
    expect(isResolutionLocked("2026-05-21", new Date("2026-05-20T23:59:59.999Z"))).toBe(true);
  });

  it("opens resolution on the earliest UTC date", () => {
    expect(isResolutionLocked("2026-05-21", new Date("2026-05-21T00:00:00.000Z"))).toBe(false);
  });

  it("opens resolution after the earliest UTC date", () => {
    expect(isResolutionLocked("2026-05-21", new Date("2026-05-22T00:00:00.000Z"))).toBe(false);
  });

  it("does not lock malformed or missing dates", () => {
    expect(isResolutionLocked("2026-05-", new Date("2026-05-20T00:00:00.000Z"))).toBe(false);
    expect(isResolutionLocked("", new Date("2026-05-20T00:00:00.000Z"))).toBe(false);
    expect(isResolutionLocked(undefined, new Date("2026-05-20T00:00:00.000Z"))).toBe(false);
  });

  it("locks until the day after an explicit later market date", () => {
    const eventText = "Will ChatGPT be #1 on 2026-06-30?";

    expect(isResolutionLocked("2026-05-01", new Date("2026-06-30T23:59:59.999Z"), [eventText])).toBe(true);
    expect(isResolutionLocked("2026-05-01", new Date("2026-07-01T00:00:00.000Z"), [eventText])).toBe(false);
  });
});

describe("date extraction", () => {
  it("adds UTC calendar days", () => {
    expect(addUtcDays("2026-06-30", 1)).toBe("2026-07-01");
  });

  it("finds the latest explicit ISO date from market text", () => {
    expect(latestIsoDateFromText(["First 2026-06-30", "Then 2026-07-15"])).toBe("2026-07-15");
  });

  it("uses the later of earliest resolution and day-after-event", () => {
    expect(getResolutionUnlockDate({
      earliestResolutionDate: "2026-05-01",
      eventDateTexts: ["Will ChatGPT be #1 on 2026-06-30?"],
    })).toBe("2026-07-01");

    expect(getResolutionUnlockDate({
      earliestResolutionDate: "2026-07-10",
      eventDateTexts: ["Will ChatGPT be #1 on 2026-06-30?"],
    })).toBe("2026-07-10");
  });
});
