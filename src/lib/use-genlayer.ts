"use client";

import { createClient } from "genlayer-js";
import { type Address, type CalldataEncodable, TransactionStatus } from "genlayer-js/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import {
  extractOracleAddressFromReceipt,
  genLayerChain,
  getFirstTriggeredTransactionHash,
  getGenLayerRpcUrl,
  getOracleFactoryAddress,
  hasInvalidOracleFactoryAddress,
} from "@/lib/genlayer-config";
import {
  formatValidationError,
  oracleConfigToDeploymentArgs,
  parseOracleConfig,
} from "@/lib/oracle-config";
import type { CreateOracleResult, Oracle, OracleConfig, Transaction } from "@/lib/types";
import {
  addOrUpdateWalletChain,
  assertPublicRpcConfiguration,
  assertWalletRpcReachable,
  ensureWalletChain,
  normalizeWalletError,
  type WalletRpcProvider,
} from "@/lib/wallet-rpc";

const ORACLES_STORAGE_KEY = "io-explorer.oracles";

type GenLayerClientConfig = NonNullable<Parameters<typeof createClient>[0]>;
type GenLayerProvider = GenLayerClientConfig["provider"];

function loadCachedOracles() {
  if (typeof window === "undefined") return [];

  try {
    const cached = window.localStorage.getItem(ORACLES_STORAGE_KEY);
    return cached ? (JSON.parse(cached) as Oracle[]) : [];
  } catch {
    window.localStorage.removeItem(ORACLES_STORAGE_KEY);
    return [];
  }
}

function saveCachedOracles(oracles: Oracle[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORACLES_STORAGE_KEY, JSON.stringify(oracles));
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function toPlainObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (Array.isArray(value)) {
    try {
      return Object.fromEntries(value as Iterable<readonly [PropertyKey, unknown]>);
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseAnalysis(value: unknown): Oracle["analysis"] {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    return typeof value === "object" ? (value as Oracle["analysis"]) : String(value);
  }
  try {
    return JSON.parse(value) as Oracle["analysis"];
  } catch {
    return value;
  }
}

function normalizeOracle(address: Address, value: unknown): Oracle {
  const object = toPlainObject(value);
  return {
    address,
    title: typeof object.title === "string" ? object.title : undefined,
    description: typeof object.description === "string" ? object.description : undefined,
    potential_outcomes: normalizeStringArray(object.potential_outcomes),
    rules: normalizeStringArray(object.rules),
    status: typeof object.status === "string" ? object.status : undefined,
    outcome: typeof object.outcome === "string" ? object.outcome : null,
    creator: typeof object.creator === "string" ? object.creator : undefined,
    earliest_resolution_date: typeof object.earliest_resolution_date === "string"
      ? object.earliest_resolution_date
      : undefined,
    prediction_market_id: typeof object.prediction_market_id === "string" ? object.prediction_market_id : undefined,
    valid_data_sources: normalizeStringArray(object.valid_data_sources),
    data_source_domains: normalizeStringArray(object.data_source_domains),
    resolution_urls: normalizeStringArray(object.resolution_urls),
    analysis: parseAnalysis(object.analysis),
  };
}

function normalizeTransaction(value: unknown): Transaction {
  return value && typeof value === "object" ? (value as Transaction) : {};
}

function normalizeReadError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error || "");

  if (/server busy|execution slots occupied|retry later/i.test(message)) {
    return "GenLayer Studio RPC is busy. Wait a moment, then refresh.";
  }

  if (/failed to fetch|network|fetch failed/i.test(message)) {
    return "Unable to reach GenLayer Studio RPC. Check the RPC URL or try again in a moment.";
  }

  return message || fallback;
}

function isPendingResolutionTimeout(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const match = message.match(/Timed out waiting for transaction .*current status: (\d+)/i);
  if (!match) return false;
  // 1-4 are PENDING/PROPOSING/COMMITTING/REVEALING. These are still in-flight,
  // not failed. Resolution can take longer than the SDK default wait window.
  return ["1", "2", "3", "4"].includes(match[1]);
}

export function useGenLayer() {
  const factoryAddress = getOracleFactoryAddress();
  const invalidFactoryAddress = hasInvalidOracleFactoryAddress();
  const endpoint = getGenLayerRpcUrl();
  const { address: walletAddress, connector, isConnected } = useAccount();
  const chainId = useChainId();
  const ready = Boolean(factoryAddress);
  const walletConnected = Boolean(isConnected && walletAddress && connector);
  const wrongNetwork = walletConnected && chainId !== genLayerChain.id;
  const [oracles, setOracles] = useState<Oracle[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState("");

  useEffect(() => {
    setOracles(loadCachedOracles());
  }, []);

  const readClient = useMemo(
    () => createClient({ chain: genLayerChain, endpoint }),
    [endpoint],
  );

  const getWalletProvider = useCallback(async () => {
    if (!walletAddress || !connector) {
      throw new Error("Connect your wallet to continue.");
    }

    const provider = await connector.getProvider().catch(() => null);
    if (!provider) {
      throw new Error("Reconnect your wallet and try again.");
    }

    return provider as GenLayerProvider & WalletRpcProvider;
  }, [connector, walletAddress]);

  const getStudioWalletTarget = useCallback(() => ({
    chainId: genLayerChain.id,
    chainName: genLayerChain.name,
    nativeCurrency: genLayerChain.nativeCurrency,
    rpcUrl: endpoint,
  }), [endpoint]);

  const setupStudioNetwork = useCallback(async () => {
    const origin = typeof window === "undefined" ? undefined : window.location.origin;
    assertPublicRpcConfiguration(endpoint, origin);

    const walletProvider = await getWalletProvider();
    const target = getStudioWalletTarget();

    try {
      await ensureWalletChain(walletProvider, target);
      await assertWalletRpcReachable(walletProvider, endpoint, origin);
    } catch (error) {
      if (error instanceof Error && /cannot reach|failed to fetch|rpc/i.test(error.message)) {
        await addOrUpdateWalletChain(walletProvider, target);
        await assertWalletRpcReachable(walletProvider, endpoint, origin);
        return;
      }

      throw new Error(normalizeWalletError(error, "Unable to add or switch to Studio Network."));
    }
  }, [endpoint, getStudioWalletTarget, getWalletProvider]);

  const getWriteClient = useCallback(async () => {
    const origin = typeof window === "undefined" ? undefined : window.location.origin;
    assertPublicRpcConfiguration(endpoint, origin);

    const walletProvider = await getWalletProvider();
    try {
      await ensureWalletChain(walletProvider, getStudioWalletTarget());
      await assertWalletRpcReachable(walletProvider, endpoint, origin);
    } catch (error) {
      throw new Error(normalizeWalletError(error, "Switch to Studio Network in your wallet and try again."));
    }

    return createClient({
      chain: genLayerChain,
      account: walletAddress as Address,
      provider: walletProvider,
      endpoint,
    });
  }, [endpoint, getStudioWalletTarget, getWalletProvider, walletAddress]);

  const fetchOracle = useCallback(async (address: Address) => {
    try {
      const result = await readClient.readContract({
        address,
        functionName: "get_dict",
        args: [],
      });
      const oracle = normalizeOracle(address, result);

      setOracles((current) => {
        const next = current.some((item) => item.address === address)
          ? current.map((item) => (item.address === address ? oracle : item))
          : [...current, oracle];
        saveCachedOracles(next);
        return next;
      });

      return oracle;
    } catch (error) {
      const message = normalizeReadError(error, "Unable to fetch oracle.");
      setLastError(message);
      throw new Error(message);
    }
  }, [readClient]);

  const refreshOracles = useCallback(async () => {
    if (invalidFactoryAddress) {
      setLastError("Factory address is invalid.");
      return;
    }

    if (!factoryAddress) {
      setLastError("Factory address is not configured.");
      return;
    }

    setLoading(true);
    setLastError("");
    try {
      const result = await readClient.readContract({
        address: factoryAddress,
        functionName: "get_contract_addresses",
        args: [],
      });
      const addresses = Array.isArray(result) ? (result as Address[]) : [];
      const next = await Promise.all(addresses.map((address) => fetchOracle(address)));
      setOracles(next);
      saveCachedOracles(next);
    } catch (error) {
      const message = normalizeReadError(error, "Unable to refresh markets.");
      setLastError(message);
    } finally {
      setLoading(false);
    }
  }, [factoryAddress, fetchOracle, invalidFactoryAddress, readClient]);

  const fetchTransactions = useCallback(async (address: Address) => {
    try {
      const result = await readClient.request({
        method: "sim_getTransactionsForAddress",
        params: [address],
      });
      return Array.isArray(result) ? result.map(normalizeTransaction) : [];
    } catch (error) {
      setLastError(normalizeReadError(error, "Unable to fetch transactions."));
      return [];
    }
  }, [readClient]);

  const createOracle = useCallback(async (config: OracleConfig): Promise<CreateOracleResult> => {
    if (invalidFactoryAddress) {
      throw new Error("Factory address is invalid.");
    }

    if (!factoryAddress) {
      throw new Error("Factory address is not configured.");
    }

    const parsed = parseOracleConfig(config);
    if (!parsed.success) {
      throw new Error(formatValidationError(parsed.error));
    }

    let transactionHash: CreateOracleResult["transactionHash"];
    try {
      const writeClient = await getWriteClient();
      transactionHash = await writeClient.writeContract({
        address: factoryAddress,
        functionName: "create_new_prediction_market",
        args: oracleConfigToDeploymentArgs(parsed.data) as CalldataEncodable[],
        value: BigInt(0),
      }) as CreateOracleResult["transactionHash"];
    } catch (error) {
      throw new Error(normalizeWalletError(error, "Unable to create this market. Check your wallet and try again."));
    }

    const parentReceipt = await readClient.waitForTransactionReceipt({
      hash: transactionHash,
      status: TransactionStatus.ACCEPTED,
    });

    let oracleTransactionHash: ReturnType<typeof getFirstTriggeredTransactionHash> = null;
    for (let attempt = 0; attempt < 30 && !oracleTransactionHash; attempt += 1) {
      oracleTransactionHash = getFirstTriggeredTransactionHash(
        await readClient.getTriggeredTransactionIds({ hash: transactionHash }),
      );
      if (!oracleTransactionHash) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!oracleTransactionHash) {
      throw new Error("Market creation finished, but no oracle transaction was returned.");
    }

    const receipt = await readClient.waitForTransactionReceipt({
      hash: oracleTransactionHash,
      status: TransactionStatus.ACCEPTED,
    });
    const oracleAddress = extractOracleAddressFromReceipt(receipt);

    if (!oracleAddress) {
      throw new Error("Market creation finished without an oracle address.");
    }

    await fetchOracle(oracleAddress).catch(() => undefined);

    return {
      oracleAddress,
      transactionHash,
      oracleTransactionHash,
      receipt,
      parentReceipt,
    };
  }, [factoryAddress, fetchOracle, getWriteClient, invalidFactoryAddress, readClient]);

  const resolveOracle = useCallback(async (address: Address, evidenceUrl: string) => {
    const args = evidenceUrl.trim() ? [evidenceUrl.trim() as CalldataEncodable] : [];
    let hash: CreateOracleResult["transactionHash"];

    try {
      const writeClient = await getWriteClient();
      hash = await writeClient.writeContract({
        address,
        functionName: "resolve",
        args,
        value: BigInt(0),
      }) as CreateOracleResult["transactionHash"];
    } catch (error) {
      throw new Error(normalizeWalletError(error, "Unable to submit this resolution. Check your wallet and try again."));
    }

    try {
      await readClient.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        interval: 2000,
        retries: 90,
      });
    } catch (error) {
      if (!isPendingResolutionTimeout(error)) {
        throw error;
      }
    }

    return hash;
  }, [getWriteClient, readClient]);

  return {
    ready,
    factoryAddress,
    invalidFactoryAddress,
    walletConnected,
    wrongNetwork,
    oracles,
    loading,
    lastError,
    setupStudioNetwork,
    refreshOracles,
    fetchOracle,
    fetchTransactions,
    createOracle,
    resolveOracle,
  };
}
