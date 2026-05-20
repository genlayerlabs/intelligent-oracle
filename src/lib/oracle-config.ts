import { z, type ZodError } from "zod";

const optionalTrimmedString = z.string().trim().optional();

const dateString = z
  .string({ error: "Resolution date is required." })
  .trim()
  .min(1, "Resolution date is required.")
  .refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
  }, "Resolution date must use YYYY-MM-DD.");

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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
    }, "Use a valid date (YYYY-MM-DD).")
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
  const parsed = parseOracleConfig(input);
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
    config.dataSourceDomains,
    config.resolutionURLs,
    config.earliestResolutionDate,
  ];
}

export function oracleConfigToJson(config: z.infer<typeof oracleConfigSchema>) {
  return JSON.stringify(config, null, 2);
}
