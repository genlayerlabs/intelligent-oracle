import type {
  DecodedCalldata,
  LeaderReceipt,
  Transaction,
  TransactionParticipant,
} from "@/lib/types";

export function decodeBase64(value: string) {
  try {
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      return window.atob(value);
    }
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return value;
  }
}

export function decodeCalldata(value: unknown): DecodedCalldata | null {
  if (!value) return null;

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const method = getString(record.method) || getString(record.functionName) || getString(record.name);
    if (!method) return null;
    return {
      method,
      args: stringifyArgs(record.args ?? record.kwargs),
    };
  }

  if (typeof value !== "string") return null;

  const decoded = decodeBase64(value);
  const parsed = parseJson(decoded) ?? parseJson(value);
  if (parsed && typeof parsed === "object") {
    return decodeCalldata(parsed);
  }

  const methodMatch = /(?:method|functionName|name)["':\s]+([A-Za-z_][\w]*)/.exec(decoded);
  return {
    method: methodMatch?.[1] || "Unknown",
    args: decoded.length > 300 ? `${decoded.slice(0, 300)}...` : decoded,
  };
}

export function formatKey(key: string) {
  return key
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeLeaderReceipt(value: unknown): LeaderReceipt | null {
  if (Array.isArray(value)) {
    return normalizeLeaderReceipt(value[0]);
  }
  if (!value || typeof value !== "object") return null;
  return value as LeaderReceipt;
}

export function getNodeConfigParticipants(transaction?: Transaction | null): TransactionParticipant[] {
  if (!transaction?.consensus_data) return [];

  const participants: TransactionParticipant[] = [];
  const leader = normalizeLeaderReceipt(transaction.consensus_data.leader_receipt);
  if (leader) {
    participants.push({
      mode: "leader",
      node_config: normalizeNodeConfig(leader.node_config),
      vote: leader.vote,
      execution_result: leader.execution_result,
    });
  }

  const validators = transaction.consensus_data.validators;
  if (Array.isArray(validators)) {
    for (const validator of validators) {
      if (!validator || typeof validator !== "object") continue;
      const record = validator as Record<string, unknown>;
      participants.push({
        mode: "validator",
        node_config: normalizeNodeConfig(record.node_config),
        vote: getString(record.vote),
        execution_result: getString(record.execution_result),
      });
    }
  }

  return participants;
}

export function parseEqOutput(value: string): Record<string, unknown> | null {
  const parsed = parseJson(value);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }

  const normalized = value
    .replaceAll("'", "\"")
    .replace(/\bNone\b/g, "null")
    .replace(/\bTrue\b/g, "true")
    .replace(/\bFalse\b/g, "false");
  const fallback = parseJson(normalized);
  return fallback && typeof fallback === "object" && !Array.isArray(fallback)
    ? (fallback as Record<string, unknown>)
    : null;
}

export function sanitizeTransactionForDisplay(transaction?: Transaction | null): Transaction | null {
  if (!transaction) return null;
  return sanitizeValue(transaction) as Transaction;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    output[key] = sanitizeValue(nestedValue);
  }
  return output;
}

function normalizeNodeConfig(value: unknown): TransactionParticipant["node_config"] {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    ...record,
    address: getString(record.address),
    provider: getString(record.provider),
    model: getString(record.model),
    stake: typeof record.stake === "string" || typeof record.stake === "number" ? record.stake : undefined,
  };
}

function stringifyArgs(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
