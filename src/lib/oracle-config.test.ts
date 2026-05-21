import { describe, expect, it } from "vitest";
import {
  evaluateOracleConfig,
  oracleConfigToDeploymentArgs,
  parseOracleConfig,
  parseOracleDraft,
} from "@/lib/oracle-config";
import { utcDateOnly } from "@/lib/resolution-date";

const validConfig = {
  predictionMarketId: "42",
  title: "Will Team A win?",
  description: "Resolves based on the official final score.",
  potentialOutcomes: ["Yes", "No"],
  rules: ["Use the official league result after full time."],
  dataSourceDomains: ["league.example"],
  resolutionURLs: [],
  earliestResolutionDate: "2099-06-01",
};

describe("oracle config validation", () => {
  it("accepts a canonical config and maps deployment args", () => {
    const parsed = parseOracleConfig(validConfig);

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(oracleConfigToDeploymentArgs(parsed.data)).toEqual([
      "42",
      validConfig.title,
      validConfig.description,
      validConfig.potentialOutcomes,
      validConfig.rules,
      validConfig.dataSourceDomains,
      [],
      validConfig.earliestResolutionDate,
    ]);
  });

  it("requires exactly one source strategy in strict validation", () => {
    const output = parseOracleConfig({
      ...validConfig,
      resolutionURLs: ["https://league.example/result"],
    });

    expect(output.success).toBe(false);
    if (output.success) return;
    expect(output.error.issues.map((issue) => issue.message).join(" ")).toContain("not both");
  });

  it("normalizes AI drafts that include domains and URLs by keeping domains", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      resolutionURLs: ["https://league.example/result"],
    });

    expect(output.status).toBe("valid");
    if (output.status !== "valid") return;
    expect(output.config.resolutionURLs).toEqual([]);
    expect(output.config.dataSourceDomains).toEqual(validConfig.dataSourceDomains);
  });

  it("rejects incomplete outcomes and invalid dates", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      potentialOutcomes: ["Yes"],
      earliestResolutionDate: "06/01/2026",
    });

    expect(output.status).toBe("invalid");
    expect(output.issues.join(" ")).toContain("exactly two outcomes");
    expect(output.issues.join(" ")).toContain("YYYY-MM-DD");
  });

  it("accepts canonical ISO dates and rejects partial, localized, or impossible dates", () => {
    expect(parseOracleConfig({ ...validConfig, earliestResolutionDate: "2099-12-26" }).success)
      .toBe(true);

    for (const earliestResolutionDate of ["2026-12-", "26/12/2026", "2026-02-31"]) {
      const result = parseOracleConfig({ ...validConfig, earliestResolutionDate });

      expect(result.success).toBe(false);
      if (result.success) continue;
      expect(result.error.issues.map((issue) => issue.message).join(" ")).toContain("YYYY-MM-DD");
    }
  });

  it("rejects resolution dates before today", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      earliestResolutionDate: "2000-01-01",
    });

    expect(output.status).toBe("invalid");
    expect(output.issues.join(" ")).toContain("today or later");
  });

  it("accepts today's date for immediate resolution tests", () => {
    expect(parseOracleConfig({ ...validConfig, earliestResolutionDate: utcDateOnly() }).success)
      .toBe(true);
  });

  it("rejects a resolution date before an explicit ISO event date", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      title: "Will ChatGPT be #1 on 2099-06-30?",
      description: "Resolve the chart position on 2099-06-30.",
      rules: ["Use Apple's chart for 2099-06-30."],
      dataSourceDomains: ["https://apps.apple.com/us/charts/iphone"],
      earliestResolutionDate: "2099-06-30",
    });

    expect(output.status).toBe("invalid");
    expect(output.issues.join(" ")).toContain("after the market event date");
  });

  it("does not treat archive or settlement deadlines as market event dates", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      title: "Will New York City record measurable snowfall on 2099-12-25?",
      description: "Resolve whether Central Park records measurable snowfall on 2099-12-25.",
      rules: [
        "Use the measurement reported for calendar date 2099-12-25 local time.",
        "If agencies revise their totals, use the final archived record as published by 2100-01-02 UTC to settle this market.",
      ],
      earliestResolutionDate: "2099-12-26",
    });

    expect(output.status).toBe("valid");
  });

  it("does not treat pushed-back resolution dates as market event dates", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      title: "Will ChatGPT be the #1 free iPhone app in the US App Store at 2099-06-30?",
      description: "Resolve whether ChatGPT is ranked #1 on the US App Store free iPhone chart on 2099-06-30.",
      rules: [
        "Use the official Apple App Store chart for 2099-06-30.",
        "If the chart is unavailable, use the earliest subsequent date with a published chart by 2099-07-08.",
      ],
      dataSourceDomains: ["apps.apple.com"],
      earliestResolutionDate: "2099-07-08",
    });

    expect(output.status).toBe("valid");
  });

  it("normalizes source domains before deployment", () => {
    const parsed = parseOracleConfig({
      ...validConfig,
      dataSourceDomains: ["https://www.apps.apple.com/us/charts/iphone"],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(oracleConfigToDeploymentArgs(parsed.data)[5]).toEqual(["apps.apple.com"]);
  });

  it("rejects more than two outcomes", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      potentialOutcomes: ["Yes", "No", "Unknown"],
    });

    expect(output.status).toBe("invalid");
    expect(output.issues.join(" ")).toContain("exactly two outcomes");
  });

  it("uses human-readable copy for required fields", () => {
    const output = evaluateOracleConfig({});

    expect(output.status).toBe("invalid");
    const joined = output.issues.join(" | ");
    expect(joined).toContain("A title is required.");
    expect(joined).toContain("A description is required.");
    expect(joined).toContain("At least one rule is required.");
    expect(joined).toContain("Resolution date is required.");
  });

  it("flags missing sources with a single actionable message", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      dataSourceDomains: [],
      resolutionURLs: [],
    });

    expect(output.status).toBe("invalid");
    expect(output.issues.join(" ")).toContain("Add at least one domain or URL.");
  });
});

describe("oracle draft schema", () => {
  it("accepts an empty draft (no spurious 'expected string, received undefined')", () => {
    const result = parseOracleDraft({});
    expect(result.success).toBe(true);
  });

  it("accepts a partial draft with only the title populated", () => {
    const result = parseOracleDraft({ title: "Will Team A win?" });
    expect(result.success).toBe(true);
  });

  it("rejects a whitespace-only title but allows undefined", () => {
    expect(parseOracleDraft({ title: "   " }).success).toBe(false);
    expect(parseOracleDraft({ title: undefined }).success).toBe(true);
  });

  it("accepts an empty earliestResolutionDate but rejects a malformed one", () => {
    expect(parseOracleDraft({ earliestResolutionDate: "" }).success).toBe(true);
    expect(parseOracleDraft({ earliestResolutionDate: "2099-12-26" }).success).toBe(true);

    for (const earliestResolutionDate of ["06/01/2026", "2026-12-", "2026-02-31"]) {
      const malformed = parseOracleDraft({ earliestResolutionDate });
      expect(malformed.success).toBe(false);
      if (malformed.success) continue;
      expect(malformed.error.issues.map((issue) => issue.message).join(" ")).toContain("YYYY-MM-DD");
    }
  });

  it("rejects a past draft resolution date", () => {
    const result = parseOracleDraft({ earliestResolutionDate: "2000-01-01" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message).join(" ")).toContain("today or a future");
  });

  it("rejects a draft resolution date before an explicit ISO event date", () => {
    const result = parseOracleDraft({
      title: "Will ChatGPT be #1 on 2099-06-30?",
      earliestResolutionDate: "2099-06-30",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message).join(" ")).toContain("after the market event date");
  });

  it("rejects mixing populated domains and URLs in a draft", () => {
    const result = parseOracleDraft({
      dataSourceDomains: ["league.example"],
      resolutionURLs: ["https://league.example/result"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty strings inside rules", () => {
    const result = parseOracleDraft({ rules: ["", "   "] });
    expect(result.success).toBe(false);
  });
});
