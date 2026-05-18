import { describe, expect, it } from "vitest";
import {
  buildResolutionSummary,
  pickResolutionTransaction,
} from "@/lib/resolution-timeline";
import type { Address } from "genlayer-js/types";
import type { Oracle, Transaction } from "@/lib/types";

const ORACLE_ADDR = "0x0000000000000000000000000000000000000000" as Address;

function makeOracle(overrides: Partial<Oracle> = {}): Oracle {
  return {
    address: ORACLE_ADDR,
    title: "Will Team A win?",
    description: "Resolves based on the official final score.",
    potential_outcomes: ["Yes", "No"],
    rules: ["Use the official league result after full time."],
    data_source_domains: ["league.example"],
    resolution_urls: [],
    earliest_resolution_date: "2026-06-01",
    status: "Active",
    outcome: null,
    ...overrides,
  };
}

// Build a base64-encoded validator output matching the contract's eq_outputs
// shape: per-validator JSON with reasoning + outcome.
function encodeValidatorOutput(outcome: string, reasoning: string): string {
  const json = JSON.stringify({
    relevant_sources: ["league.example/result"],
    reasoning,
    outcome,
  });
  return typeof Buffer !== "undefined"
    ? Buffer.from(json, "utf8").toString("base64")
    : btoa(json);
}

function makeResolutionTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    hash: "0xabc",
    statusName: "Finalized",
    created_at: "2026-06-02T12:00:00.000Z",
    consensus_data: {
      final: true,
      leader_receipt: {
        node_config: { address: "0xLEADER", provider: "openai", model: "gpt-5" },
        vote: "agree",
        execution_result: "SUCCESS",
        result: encodeValidatorOutput("Yes", "Leader read the URL and concluded Yes."),
        eq_outputs: {
          "0": encodeValidatorOutput("Yes", "Validator 1 read the URL and concluded Yes."),
          "1": encodeValidatorOutput("Yes", "Validator 2 read the URL and concluded Yes."),
        },
      },
      validators: [
        {
          node_config: { address: "0xV1" },
          vote: "agree",
          execution_result: "SUCCESS",
        },
        {
          node_config: { address: "0xV2" },
          vote: "agree",
          execution_result: "SUCCESS",
        },
      ],
    },
    ...overrides,
  };
}

describe("buildResolutionSummary", () => {
  it("returns active when status is Active", () => {
    const summary = buildResolutionSummary(makeOracle(), []);
    expect(summary.status).toBe("active");
    if (summary.status !== "active") return;
    expect(summary.title).toBe("Will Team A win?");
    expect(summary.sources).toEqual([{ kind: "domain", value: "league.example" }]);
    expect(summary.earliestResolutionDate).toBe("2026-06-01");
  });

  it("returns resolved with decoded validator outputs when status is Resolved", () => {
    const summary = buildResolutionSummary(
      makeOracle({
        outcome: "Yes",
        status: "Resolved",
        analysis: { reasoning: "Both sources independently agreed.", outcome: "Yes" },
      }),
      [makeResolutionTx()],
    );
    expect(summary.status).toBe("resolved");
    if (summary.status !== "resolved") return;
    expect(summary.outcome).toBe("Yes");
    expect(summary.consensusReasoning).toBe("Both sources independently agreed.");
    expect(summary.validators).toHaveLength(3);
    const [leader, v1, v2] = summary.validators;
    expect(leader.label).toBe("Leader");
    expect(leader.role).toBe("leader");
    expect(leader.proposedOutcome).toBe("Yes");
    expect(leader.reasoning).toContain("Leader read the URL");
    expect(leader.vote).toBe("agree");
    expect(leader.agreed).toBe(true);
    expect(v1.label).toBe("Validator 1");
    expect(v1.proposedOutcome).toBe("Yes");
    expect(v1.reasoning).toContain("Validator 1 read the URL");
    expect(v2.proposedOutcome).toBe("Yes");
    expect(v2.reasoning).toContain("Validator 2 read the URL");
    expect(summary.resolvedAt).toBe("2026-06-02T12:00:00.000Z");
  });

  it("returns error when status is Error", () => {
    const summary = buildResolutionSummary(
      makeOracle({
        status: "Error",
        outcome: "",
        analysis: {
          reasoning: "The validators returned ERROR; outcome not in potential list.",
          outcome: "ERROR",
        },
      }),
      [makeResolutionTx()],
    );
    expect(summary.status).toBe("error");
    if (summary.status !== "error") return;
    expect(summary.consensusReasoning).toContain("validators returned ERROR");
    expect(summary.consensusOutcome).toBe("ERROR");
    expect(summary.validators).toHaveLength(3);
  });

  it("surfaces a validator that disagreed with the equivalence principle", () => {
    const summary = buildResolutionSummary(
      makeOracle({ outcome: "Yes", status: "Resolved" }),
      [
        makeResolutionTx({
          consensus_data: {
            final: true,
            leader_receipt: {
              node_config: { address: "0xLEADER" },
              vote: "agree",
              execution_result: "SUCCESS",
              result: encodeValidatorOutput("Yes", "Leader said Yes."),
              eq_outputs: {
                "0": encodeValidatorOutput("Yes", "Validator 1 said Yes."),
                "1": encodeValidatorOutput("No", "Validator 2 disagreed."),
              },
            },
            validators: [
              {
                node_config: { address: "0xV1" },
                vote: "agree",
                execution_result: "SUCCESS",
              },
              {
                node_config: { address: "0xV2" },
                vote: "disagree",
                execution_result: "SUCCESS",
              },
            ],
          },
        }),
      ],
    );
    expect(summary.status).toBe("resolved");
    if (summary.status !== "resolved") return;
    expect(summary.validators[1].agreed).toBe(true);
    expect(summary.validators[2].agreed).toBe(false);
    expect(summary.validators[2].vote).toBe("disagree");
    expect(summary.validators[2].proposedOutcome).toBe("No");
  });

  it("handles a degenerate single-validator (leader only) resolution", () => {
    const summary = buildResolutionSummary(
      makeOracle({ outcome: "Yes", status: "Resolved" }),
      [
        makeResolutionTx({
          consensus_data: {
            final: true,
            leader_receipt: {
              node_config: { address: "0xLEADER" },
              vote: "agree",
              execution_result: "SUCCESS",
              result: encodeValidatorOutput("Yes", "Solo run."),
              eq_outputs: {},
            },
            validators: [],
          },
        }),
      ],
    );
    expect(summary.status).toBe("resolved");
    if (summary.status !== "resolved") return;
    expect(summary.validators).toHaveLength(1);
    expect(summary.validators[0].label).toBe("Leader");
    expect(summary.validators[0].reasoning).toContain("Solo run");
  });

  it("falls back to the raw decoded string when eq_output is not valid JSON", () => {
    const rawEqOutput = Buffer.from("not-json-just-text", "utf8").toString("base64");
    const summary = buildResolutionSummary(
      makeOracle({ outcome: "Yes", status: "Resolved" }),
      [
        makeResolutionTx({
          consensus_data: {
            final: true,
            leader_receipt: {
              node_config: { address: "0xLEADER" },
              vote: "agree",
              execution_result: "SUCCESS",
              result: encodeValidatorOutput("Yes", "Leader OK."),
              eq_outputs: { "0": rawEqOutput },
            },
            validators: [
              {
                node_config: { address: "0xV1" },
                vote: "agree",
                execution_result: "SUCCESS",
              },
            ],
          },
        }),
      ],
    );
    expect(summary.status).toBe("resolved");
    if (summary.status !== "resolved") return;
    expect(summary.validators[1].reasoning).toBe("not-json-just-text");
  });

  it("returns resolved with empty validators when no successful resolution tx exists", () => {
    const summary = buildResolutionSummary(
      makeOracle({ outcome: "No", status: "Resolved" }),
      [],
    );
    expect(summary.status).toBe("resolved");
    if (summary.status !== "resolved") return;
    expect(summary.validators).toEqual([]);
    expect(summary.outcome).toBe("No");
  });

  it("ignores failed resolve attempts when picking the resolution tx", () => {
    const failedAttempt = makeResolutionTx({
      hash: "0xFAIL",
      created_at: "2026-06-05T00:00:00Z",
      consensus_data: {
        final: true,
        leader_receipt: {
          node_config: { address: "0xLEADER" },
          execution_result: "ERROR",
          vote: "agree",
          result: encodeValidatorOutput("ERROR", "Validator 1 hit an error."),
          eq_outputs: {
            "0": encodeValidatorOutput("ERROR", "Polluted reasoning that must not surface."),
          },
        },
        validators: [
          { node_config: { address: "0xV1" }, vote: "agree", execution_result: "ERROR" },
        ],
      },
    });
    const successAttempt = makeResolutionTx({ hash: "0xOK" });
    const summary = buildResolutionSummary(
      makeOracle({ outcome: "Yes", status: "Resolved" }),
      [failedAttempt, successAttempt],
    );
    expect(summary.status).toBe("resolved");
    if (summary.status !== "resolved") return;
    expect(summary.validators[0].reasoning).toContain("Leader read the URL");
    expect(summary.resolvedAt).toBe("2026-06-02T12:00:00.000Z");
  });

  it("collects both domain and url sources separately", () => {
    const summary = buildResolutionSummary(
      makeOracle({
        data_source_domains: ["a.example"],
        resolution_urls: ["https://b.example/result"],
      }),
      [],
    );
    expect(summary.status).toBe("active");
    if (summary.status !== "active") return;
    expect(summary.sources).toEqual([
      { kind: "domain", value: "a.example" },
      { kind: "url", value: "https://b.example/result" },
    ]);
  });

  it("surfaces oracle.analysis as the consensus reasoning when present", () => {
    const summary = buildResolutionSummary(
      makeOracle({
        analysis: { reasoning: "Pending resolution; previous attempt was UNDETERMINED." },
      }),
      [],
    );
    expect(summary.status).toBe("active");
    if (summary.status !== "active") return;
    expect(summary.consensusReasoning).toContain("UNDETERMINED");
  });
});

describe("pickResolutionTransaction", () => {
  it("returns undefined when no transactions have successful finalized consensus", () => {
    const result = pickResolutionTransaction([
      { hash: "0x1" },
      { hash: "0x2", data: { contract_address: "0xCREATE" } },
    ]);
    expect(result).toBeUndefined();
  });

  it("ignores creation transactions even if they have consensus data", () => {
    const create = makeResolutionTx({
      hash: "0xCREATE",
      data: { contract_address: "0xANY" },
    });
    const resolve = makeResolutionTx({ hash: "0xRESOLVE" });
    expect(pickResolutionTransaction([create, resolve])?.hash).toBe("0xRESOLVE");
  });

  it("rejects transactions whose leader execution did not succeed", () => {
    const errored = makeResolutionTx({
      hash: "0xERR",
      consensus_data: {
        final: true,
        leader_receipt: {
          node_config: {},
          execution_result: "ERROR",
        },
      },
    });
    const success = makeResolutionTx({ hash: "0xOK" });
    expect(pickResolutionTransaction([errored, success])?.hash).toBe("0xOK");
  });

  it("rejects non-finalized resolution transactions even when SUCCESS", () => {
    const pending = makeResolutionTx({
      hash: "0xPENDING",
      consensus_data: {
        final: false,
        leader_receipt: { node_config: {}, execution_result: "SUCCESS" },
      },
    });
    const final = makeResolutionTx({ hash: "0xFINAL" });
    expect(pickResolutionTransaction([pending, final])?.hash).toBe("0xFINAL");
  });

  it("picks the latest among multiple successful finalized resolution transactions", () => {
    const older = makeResolutionTx({ hash: "0xOLD", created_at: "2026-06-01T00:00:00Z" });
    const newer = makeResolutionTx({ hash: "0xNEW", created_at: "2026-06-05T00:00:00Z" });
    expect(pickResolutionTransaction([older, newer])?.hash).toBe("0xNEW");
  });
});
