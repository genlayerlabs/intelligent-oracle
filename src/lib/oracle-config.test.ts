import { describe, expect, it } from "vitest";
import {
  evaluateOracleConfig,
  oracleConfigToDeploymentArgs,
  parseOracleConfig,
  parseOracleDraft,
} from "@/lib/oracle-config";

const validConfig = {
  predictionMarketId: "42",
  title: "Will Team A win?",
  description: "Resolves based on the official final score.",
  potentialOutcomes: ["Yes", "No"],
  rules: ["Use the official league result after full time."],
  dataSourceDomains: ["league.example"],
  resolutionURLs: [],
  earliestResolutionDate: "2026-06-01",
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

  it("requires exactly one source strategy", () => {
    const output = evaluateOracleConfig({
      ...validConfig,
      resolutionURLs: ["https://league.example/result"],
    });

    expect(output.status).toBe("invalid");
    expect(output.issues.join(" ")).toContain("not both");
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
    const malformed = parseOracleDraft({ earliestResolutionDate: "06/01/2026" });
    expect(malformed.success).toBe(false);
    if (malformed.success) return;
    expect(malformed.error.issues.map((issue) => issue.message).join(" ")).toContain("YYYY-MM-DD");
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
