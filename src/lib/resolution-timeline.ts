import type {
  Oracle,
  Transaction,
  TransactionParticipant,
} from "@/lib/types";
import {
  decodeBase64,
  getNodeConfigParticipants,
  normalizeLeaderReceipt,
  parseEqOutput,
} from "@/lib/transactions";

// Status the contract emits via get_dict() (see IntelligentOracle.py:14-16).
const STATUS_ACTIVE = "Active";
const STATUS_RESOLVED = "Resolved";
const STATUS_ERROR = "Error";

export interface ResolutionSummaryActive {
  status: "active";
  title?: string;
  description?: string;
  potentialOutcomes: string[];
  sources: ResolutionSource[];
  earliestResolutionDate?: string;
  consensusReasoning?: string;
  consensusOutcome?: string;
}

export interface ResolutionSummaryResolved {
  status: "resolved";
  title?: string;
  description?: string;
  outcome: string;
  potentialOutcomes: string[];
  sources: ResolutionSource[];
  consensusReasoning?: string;
  validators: ResolutionValidator[];
  resolvedAt?: string;
}

export interface ResolutionSummaryError {
  status: "error";
  title?: string;
  description?: string;
  potentialOutcomes: string[];
  sources: ResolutionSource[];
  consensusReasoning?: string;
  consensusOutcome?: string;
  validators: ResolutionValidator[];
  failedAt?: string;
}

export type ResolutionSummary =
  | ResolutionSummaryActive
  | ResolutionSummaryResolved
  | ResolutionSummaryError;

export interface ResolutionSource {
  kind: "domain" | "url";
  value: string;
}

export interface ResolutionValidator {
  label: string;
  address?: string;
  role: "leader" | "validator";
  /** The validator's own proposed outcome (parsed from their eq_output JSON). */
  proposedOutcome?: string;
  /** The validator's reasoning text (parsed from their eq_output JSON). */
  reasoning?: string;
  /** The equivalence-principle vote: agree / disagree / etc. NOT Yes/No. */
  vote?: string;
  /** Whether this validator agreed with the equivalence principle (vote === "agree"). */
  agreed?: boolean;
  /** Execution status: typically SUCCESS or ERROR. Surfaced as a small tag. */
  executionStatus?: string;
}

interface OracleAnalysisShape {
  reasoning?: unknown;
  outcome?: unknown;
  justification?: unknown;
  raw?: unknown;
}

function collectSources(oracle: Oracle): ResolutionSource[] {
  const sources: ResolutionSource[] = [];
  for (const value of oracle.data_source_domains ?? []) {
    if (value.trim()) sources.push({ kind: "domain", value });
  }
  for (const value of oracle.resolution_urls ?? []) {
    if (value.trim()) sources.push({ kind: "url", value });
  }
  return sources;
}

function statusKind(oracle: Oracle): "active" | "resolved" | "error" {
  if (oracle.status === STATUS_RESOLVED) return "resolved";
  if (oracle.status === STATUS_ERROR) return "error";
  // Fallback: an oracle with a non-empty outcome is treated as resolved even
  // if the status field is missing (defensive).
  if (typeof oracle.outcome === "string" && oracle.outcome.trim().length > 0) {
    return "resolved";
  }
  // Anything else (Active, unknown, missing) is active per contract semantics.
  return "active";
  void STATUS_ACTIVE;
}

function parseConsensusAnalysis(analysis: Oracle["analysis"]):
  | { reasoning?: string; outcome?: string }
  | undefined {
  if (!analysis) return undefined;
  if (typeof analysis === "string") {
    // use-genlayer's parseAnalysis already tried JSON.parse; if it stayed a
    // string we treat it as the raw reasoning.
    return analysis.trim() ? { reasoning: analysis } : undefined;
  }
  if (typeof analysis !== "object") return undefined;
  const shape = analysis as OracleAnalysisShape;
  const reasoningSource = shape.reasoning ?? shape.justification ?? shape.raw;
  const reasoning = typeof reasoningSource === "string" ? reasoningSource : undefined;
  const outcome = typeof shape.outcome === "string" ? shape.outcome : undefined;
  if (!reasoning && !outcome) return undefined;
  return { reasoning, outcome };
}

function transactionTimestamp(transaction: Transaction): number {
  const candidate = transaction.created_at ?? transaction.createdTimestamp;
  if (!candidate) return 0;
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isCreationTransaction(transaction: Transaction): boolean {
  const data = transaction.data ?? {};
  const decoded = transaction.txDataDecoded ?? {};
  return Boolean(
    (data as Record<string, unknown>).contract_address ||
      (decoded as Record<string, unknown>).contractAddress,
  );
}

function leaderExecutionStatus(transaction: Transaction): string | undefined {
  const leader = normalizeLeaderReceipt(transaction.consensus_data?.leader_receipt);
  return leader?.execution_result;
}

function isSuccessfulResolution(transaction: Transaction): boolean {
  // Only count a transaction as a successful resolution when the leader's
  // execution succeeded. A failed resolve() attempt against an already-resolved
  // oracle must not "poison" the summary with stale validator outputs.
  const status = leaderExecutionStatus(transaction)?.toUpperCase();
  return status === "SUCCESS";
}

function hasFinalizedConsensus(transaction: Transaction): boolean {
  if (!transaction.consensus_data) return false;
  return transaction.consensus_data.final === true;
}

/**
 * Pick the resolution transaction that produced the *current* oracle outcome.
 * The selection is conservative: only successful, finalized, non-creation
 * transactions are eligible. The latest by timestamp wins; ties break by hash
 * for stable ordering.
 */
export function pickResolutionTransaction(
  transactions: Transaction[],
): Transaction | undefined {
  const eligible = transactions.filter(
    (tx) =>
      !isCreationTransaction(tx) &&
      hasFinalizedConsensus(tx) &&
      isSuccessfulResolution(tx),
  );
  if (eligible.length === 0) return undefined;
  return [...eligible].sort((a, b) => {
    const diff = transactionTimestamp(b) - transactionTimestamp(a);
    if (diff !== 0) return diff;
    return (b.hash ?? "").localeCompare(a.hash ?? "");
  })[0];
}

function decodeValidatorEqOutput(value: unknown): { outcome?: string; reasoning?: string } | undefined {
  if (value === null || value === undefined) return undefined;
  const raw = typeof value === "string" ? value : (() => {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  })();
  const decoded = decodeBase64(raw);
  const parsed = parseEqOutput(decoded) ?? parseEqOutput(raw);
  if (!parsed) return { reasoning: decoded || raw };
  const outcome = typeof parsed.outcome === "string" ? parsed.outcome : undefined;
  const reasoningRaw = parsed.reasoning ?? parsed.justification ?? parsed.analysis;
  const reasoning = typeof reasoningRaw === "string" ? reasoningRaw : undefined;
  if (!outcome && !reasoning) return { reasoning: decoded || raw };
  return { outcome, reasoning };
}

function gatherEqOutputs(transaction: Transaction): unknown[] {
  const leader = normalizeLeaderReceipt(transaction.consensus_data?.leader_receipt);
  const outputs = leader?.eq_outputs;
  if (!outputs) return [];
  // eq_outputs may be a Record keyed by validator index ("0", "1"...) OR an
  // array. Normalize to an array preserving order.
  if (Array.isArray(outputs)) return [...outputs];
  return Object.entries(outputs)
    .sort(([a], [b]) => {
      const an = Number(a);
      const bn = Number(b);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a.localeCompare(b);
    })
    .map(([, value]) => value);
}

function buildLabel(participant: TransactionParticipant, validatorIndex: number): string {
  if (participant.mode === "leader") return "Leader";
  return `Validator ${validatorIndex}`;
}

function buildValidators(transaction: Transaction): ResolutionValidator[] {
  const participants = getNodeConfigParticipants(transaction);
  if (participants.length === 0) return [];

  // eq_outputs are keyed by validator index (validators only, not the leader).
  // Per IntelligentOracle.py, gl.eq_principle.prompt_comparative runs the
  // prompt across validators and stores their outputs in eq_outputs. The leader's
  // own output lives in leader_receipt.result, not eq_outputs.
  const eqOutputs = gatherEqOutputs(transaction);
  const leaderResult = normalizeLeaderReceipt(transaction.consensus_data?.leader_receipt)?.result;
  const leaderParsed = leaderResult ? decodeValidatorEqOutput(leaderResult) : undefined;

  let validatorIndex = 0;
  let eqIndex = 0;

  return participants.map((participant) => {
    const isLeader = participant.mode === "leader";
    const decoded = isLeader ? leaderParsed : decodeValidatorEqOutput(eqOutputs[eqIndex++]);
    const label = isLeader ? "Leader" : buildLabel(participant, ++validatorIndex);
    const vote = participant.vote;
    const agreed =
      typeof vote === "string"
        ? vote.trim().toLowerCase() === "agree"
        : undefined;
    return {
      label,
      address: participant.node_config.address,
      role: participant.mode,
      proposedOutcome: decoded?.outcome,
      reasoning: decoded?.reasoning,
      vote,
      agreed,
      executionStatus: participant.execution_result?.trim() || undefined,
    };
  });
}

function isoTimestamp(transaction: Transaction): string | undefined {
  const raw = transaction.created_at ?? transaction.createdTimestamp;
  if (!raw) return undefined;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function buildResolutionSummary(
  oracle: Oracle,
  transactions: Transaction[],
): ResolutionSummary {
  const sources = collectSources(oracle);
  const potentialOutcomes = oracle.potential_outcomes ?? [];
  const consensus = parseConsensusAnalysis(oracle.analysis);
  const kind = statusKind(oracle);

  if (kind === "active") {
    return {
      status: "active",
      title: oracle.title,
      description: oracle.description,
      potentialOutcomes,
      sources,
      earliestResolutionDate: oracle.earliest_resolution_date,
      consensusReasoning: consensus?.reasoning,
      consensusOutcome: consensus?.outcome,
    };
  }

  const resolutionTx = pickResolutionTransaction(transactions);
  const validators = resolutionTx ? buildValidators(resolutionTx) : [];
  const txTimestamp = resolutionTx ? isoTimestamp(resolutionTx) : undefined;

  if (kind === "error") {
    return {
      status: "error",
      title: oracle.title,
      description: oracle.description,
      potentialOutcomes,
      sources,
      consensusReasoning: consensus?.reasoning,
      consensusOutcome: consensus?.outcome,
      validators,
      failedAt: txTimestamp,
    };
  }

  const outcome = (oracle.outcome ?? "").trim() || "Unknown";
  return {
    status: "resolved",
    title: oracle.title,
    description: oracle.description,
    outcome,
    potentialOutcomes,
    sources,
    consensusReasoning: consensus?.reasoning,
    validators,
    resolvedAt: txTimestamp,
  };
}
