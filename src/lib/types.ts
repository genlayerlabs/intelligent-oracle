import type { Address, GenLayerTransaction, TransactionHash } from "genlayer-js/types";
import type { UIMessage } from "ai";
import type { z } from "zod";
import type {
  oracleConfigCandidateSchema,
  oracleConfigSchema,
  proposeOracleConfigOutputSchema,
} from "@/lib/oracle-config";

export type OracleConfig = z.infer<typeof oracleConfigSchema>;
export type OracleConfigCandidate = z.infer<typeof oracleConfigCandidateSchema>;
export type ProposeOracleConfigOutput = z.infer<typeof proposeOracleConfigOutputSchema>;

export type OracleTools = {
  proposeOracleConfig: {
    input: OracleConfigCandidate;
    output: ProposeOracleConfigOutput;
  };
};

export type OracleChatMessage = UIMessage<unknown, Record<string, unknown>, OracleTools>;

export interface CreateOracleResult {
  oracleAddress: Address;
  transactionHash: TransactionHash;
  oracleTransactionHash: TransactionHash;
  receipt: GenLayerTransaction;
  parentReceipt: GenLayerTransaction;
}

export interface OracleAnalysis {
  justification?: string;
  reasoning?: string;
  raw?: string;
  [key: string]: unknown;
}

export interface Oracle {
  title?: string;
  address: Address;
  potential_outcomes?: string[];
  rules?: string[];
  status?: string;
  outcome?: string | null;
  creator?: string;
  earliest_resolution_date?: string;
  description?: string;
  prediction_market_id?: string;
  valid_data_sources?: string[];
  data_source_domains?: string[];
  resolution_urls?: string[];
  analysis?: OracleAnalysis | string | null;
  error?: string;
}

export interface DecodedCalldata {
  method: string;
  args?: string;
}

export interface LeaderReceipt {
  calldata?: string;
  class_name?: string;
  contract_state?: string;
  eq_outputs?: Record<string, unknown> | unknown[];
  error?: string | null;
  execution_result?: string;
  gas_used?: number;
  mode?: string;
  node_config?: Record<string, unknown>;
  pending_transactions?: unknown[];
  vote?: string;
  result?: string;
}

export interface TransactionParticipant {
  mode: "leader" | "validator";
  node_config: {
    address?: string;
    provider?: string;
    model?: string;
    stake?: string | number;
    [key: string]: unknown;
  };
  vote?: string;
  execution_result?: string;
}

export interface TransactionConsensusData {
  final?: boolean;
  leader_receipt?: LeaderReceipt | LeaderReceipt[];
  validators?: TransactionParticipant[] | Record<string, unknown>[];
  votes?: Record<string, string>;
}

export interface Transaction {
  hash?: string;
  txId?: string;
  status?: string | number;
  statusName?: string;
  created_at?: string | Date;
  createdTimestamp?: string;
  data?: Record<string, unknown>;
  txDataDecoded?: Record<string, unknown>;
  consensus_data?: TransactionConsensusData;
  appealed?: boolean;
  [key: string]: unknown;
}
