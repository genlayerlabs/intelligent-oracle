import { z, type ZodError } from "zod";
import { normalizeSourceDomain } from "@/lib/evidence-url";
import { isIsoDateOnly, latestMarketEventIsoDateFromText, utcDateOnly } from "@/lib/resolution-date";

const optionalTrimmedString = z.string().trim().optional();

const dateString = z
  .string({ error: "Resolution date is required." })
  .trim()
  .min(1, "Resolution date is required.")
  .refine(isIsoDateOnly, "Resolution date must use YYYY-MM-DD.")
  .refine((value) => value >= utcDateOnly(), "Resolution date must be today or later.");

export const oracleConfigCandidateSchema = z.object({
  predictionMarketId: optionalTrimmedString,
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  potentialOutcomes: z.array(z.string().trim()).max(2, "Provide exactly two outcomes.").optional(),
  rules: z.array(z.string().trim()).optional(),
  dataSourceDomains: z.array(z.string().trim()).optional(),
  resolutionURLs: z.array(z.string().trim()).optional(),
  earliestResolutionDate: z.string().trim().optional(),
});

export const oracleConfigSchema = z.object({
  predictionMarketId: optionalTrimmedString,
  title: z.string({ error: "A title is required." }).trim().min(1, "A title is required."),
  description: z.string({ error: "A description is required." }).trim().min(1, "A description is required."),
  potentialOutcomes: z
    .array(z.string().trim().min(1, "Both outcomes are required."), { error: "Provide exactly two outcomes." })
    .length(2, "Provide exactly two outcomes."),
  rules: z
    .array(z.string().trim().min(1, "Rule can't be empty."), { error: "At least one rule is required." })
    .min(1, "At least one rule is required."),
  dataSourceDomains: z.array(z.string().trim().min(1, "Domain can't be empty.")).default([]),
  resolutionURLs: z.array(z.string().trim().min(1, "URL can't be empty.")).default([]),
  earliestResolutionDate: dateString,
}).superRefine((config, context) => {
  const hasDomains = config.dataSourceDomains.length > 0;
  const hasResolutionURLs = config.resolutionURLs.length > 0;

  if (!hasDomains && !hasResolutionURLs) {
    context.addIssue({
      code: "custom",
      message: "Add at least one domain or URL.",
      path: ["dataSourceDomains"],
    });
  }

  if (hasDomains && hasResolutionURLs) {
    context.addIssue({
      code: "custom",
      message: "Pick one — domains or URLs, not both.",
      path: ["resolutionURLs"],
    });
  }

  const latestEventDate = latestMarketEventIsoDateFromText([
    config.title,
    config.description,
    ...config.rules,
  ]);
  if (latestEventDate && config.earliestResolutionDate <= latestEventDate) {
    context.addIssue({
      code: "custom",
      message: `Resolution date must be after the market event date (${latestEventDate}).`,
      path: ["earliestResolutionDate"],
    });
  }
});

export const oracleConfigDraftSchema = z.object({
  predictionMarketId: optionalTrimmedString,
  title: z.string().trim().min(1, "Title can't be empty.").optional(),
  description: z.string().trim().min(1, "Description can't be empty.").optional(),
  potentialOutcomes: z
    .array(z.string().trim().min(1, "Fill in both outcomes."))
    .max(2, "Trim to exactly two outcomes.")
    .optional(),
  rules: z.array(z.string().trim().min(1, "Finish writing this rule or remove it.")).optional(),
  dataSourceDomains: z.array(z.string().trim().min(1, "Domain can't be empty.")).optional(),
  resolutionURLs: z.array(z.string().trim().min(1, "URL can't be empty.")).optional(),
  earliestResolutionDate: z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") return true;
      return isIsoDateOnly(value);
    }, "Use a valid date (YYYY-MM-DD).")
    .refine((value) => value === "" || value >= utcDateOnly(), "Use today or a future resolution date.")
    .optional(),
}).superRefine((config, context) => {
  const hasDomains = (config.dataSourceDomains ?? []).filter((value) => value.trim()).length > 0;
  const hasResolutionURLs = (config.resolutionURLs ?? []).filter((value) => value.trim()).length > 0;
  if (hasDomains && hasResolutionURLs) {
    context.addIssue({
      code: "custom",
      message: "Pick one — domains or URLs, not both.",
      path: ["resolutionURLs"],
    });
  }

  const earliestResolutionDate = config.earliestResolutionDate?.trim();
  const latestEventDate = latestMarketEventIsoDateFromText([
    config.title,
    config.description,
    ...(config.rules ?? []),
  ]);
  if (earliestResolutionDate && latestEventDate && earliestResolutionDate <= latestEventDate) {
    context.addIssue({
      code: "custom",
      message: `Use a resolution date after the market event date (${latestEventDate}).`,
      path: ["earliestResolutionDate"],
    });
  }
});

export const proposeOracleConfigOutputSchema = z.object({
  status: z.enum(["valid", "invalid"]),
  config: oracleConfigSchema.optional(),
  issues: z.array(z.string()),
});

export function parseOracleConfig(input: unknown) {
  return oracleConfigSchema.safeParse(input);
}

export function parseOracleDraft(input: unknown) {
  return oracleConfigDraftSchema.safeParse(input);
}

export function evaluateOracleConfig(input: unknown) {
  const parsedCandidate = oracleConfigCandidateSchema.safeParse(input);
  const candidate = parsedCandidate.success ? normalizeAiCandidate(parsedCandidate.data) : input;
  const parsed = parseOracleConfig(candidate);
  if (parsed.success) {
    return {
      status: "valid" as const,
      config: parsed.data,
      issues: [],
    };
  }

  return {
    status: "invalid" as const,
    config: undefined,
    issues: parsed.error.issues.map(formatIssue),
  };
}

function normalizeAiCandidate(candidate: z.infer<typeof oracleConfigCandidateSchema>) {
  const hasDomains = (candidate.dataSourceDomains ?? []).some((value) => value.trim());
  const hasResolutionURLs = (candidate.resolutionURLs ?? []).some((value) => value.trim());

  if (!hasDomains || !hasResolutionURLs) return candidate;

  return {
    ...candidate,
    resolutionURLs: [],
  };
}

export function formatValidationError(error: ZodError) {
  return error.issues.map(formatIssue).join(" ");
}

function formatIssue(issue: ZodError["issues"][number]) {
  const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export function oracleConfigToDeploymentArgs(config: z.infer<typeof oracleConfigSchema>) {
  return [
    config.predictionMarketId || "0",
    config.title,
    config.description,
    config.potentialOutcomes,
    config.rules,
    config.dataSourceDomains.map(normalizeSourceDomain).filter(Boolean),
    config.resolutionURLs,
    config.earliestResolutionDate,
  ];
}

export function oracleConfigToJson(config: z.infer<typeof oracleConfigSchema>) {
  return JSON.stringify(config, null, 2);
}
