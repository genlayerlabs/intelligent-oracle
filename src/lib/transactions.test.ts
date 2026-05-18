import { describe, expect, it } from "vitest";
import {
  decodeBase64,
  decodeCalldata,
  getNodeConfigParticipants,
  parseEqOutput,
  sanitizeTransactionForDisplay,
} from "@/lib/transactions";
import type { Transaction } from "@/lib/types";

describe("transaction display helpers", () => {
  it("decodes base64 and JSON calldata", () => {
    const encoded = Buffer.from(JSON.stringify({ method: "resolve", args: ["https://example.com"] })).toString("base64");

    expect(decodeBase64(encoded)).toContain("resolve");
    expect(decodeCalldata(encoded)).toEqual({
      method: "resolve",
      args: "[\"https://example.com\"]",
    });
  });

  it("normalizes leader and validator participants", () => {
    const transaction: Transaction = {
      consensus_data: {
        leader_receipt: [{
          node_config: { address: "0x1", provider: "openai", model: "gpt" },
          vote: "agree",
          execution_result: "success",
        }],
        validators: [{
          node_config: { address: "0x2", provider: "anthropic", model: "claude" },
          vote: "agree",
          execution_result: "success",
        }],
      },
    };

    expect(getNodeConfigParticipants(transaction)).toHaveLength(2);
    expect(getNodeConfigParticipants(transaction)[0].mode).toBe("leader");
  });

  it("parses equivalence outputs and stringifies bigint values for display", () => {
    expect(parseEqOutput("{'outcome': 'Yes', 'ok': True}")).toEqual({ outcome: "Yes", ok: true });
    expect(sanitizeTransactionForDisplay({ value: BigInt(3) })?.value).toBe("3");
  });
});
