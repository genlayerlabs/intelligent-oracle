import { defineStore } from "pinia";
import { createClient, createAccount as createGenLayerAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ref, computed, watch } from "vue";
import type { Address } from "genlayer-js/types";

export interface Oracle {
  title: string;
  address: Address;
  potential_outcomes: string[];
  rules: string[];
  status: string;
  outcome: string | null;
  creator: string;
  earliest_resolution_date: string;
  description: string;
  prediction_market_id: string;
  valid_data_sources: string[];
  data_source_domains: string[];
  resolution_urls: string[];
  analysis: Record<string, any>;
}

// This store is for:
// - storing the private key for the account in local storage
// - providing one account and client to the whole app
// - caching the oracles
// It might be a good idea to split it into multiple stores, dependant on each other
export const useGenlayerStore = defineStore("genlayer", () => {
  // Account
  const accountPrivateKey = ref(localStorage.getItem("accountPrivateKey") || null);

  function createAccount() {
    const newAccountPrivateKey = generatePrivateKey();
    accountPrivateKey.value = newAccountPrivateKey;
    localStorage.setItem("accountPrivateKey", newAccountPrivateKey);
  }

  const account = computed(() => {
    if (!accountPrivateKey.value) {
      createAccount();
    }
    return createGenLayerAccount(accountPrivateKey.value as `0x${string}`);
  });

  const client = computed(() =>
    createClient({
      chain: studionet,
      account: account.value,
      endpoint: import.meta.env.VITE_SIMULATOR_RPC_URL || undefined,
    })
  );

  // Oracles
  const loading = ref(false);
  const _oracles = ref<Oracle[]>(JSON.parse(localStorage.getItem("io-explorer.oracles") || "[]"));

  watch(
    _oracles,
    (newOracles) => {
      localStorage.setItem("io-explorer.oracles", JSON.stringify(newOracles));
    },
    { deep: true }
  );

  const oracles = computed(async () => {
    if (_oracles.value.length === 0) {
      await refreshOracles();
    }
    return _oracles.value;
  });

  async function refreshOracles() {
    if (loading.value) return;

    loading.value = true;
    try {
      const registryContractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as Address;
      const contract_addresses = (await client.value.readContract({
        account: account.value,
        address: registryContractAddress,
        functionName: "get_contract_addresses",
        args: [],
      })) as Address[];
      _oracles.value = await Promise.all(contract_addresses.map((address) => fetchOracle(address)));
    } catch (error) {
      console.error("Error refreshing oracles:", error);
    } finally {
      loading.value = false;
    }
  }

  async function fetchOracle(address: Address): Promise<Oracle> {
    const oracle = await client.value
      .readContract({
        account: account.value,
        address,
        functionName: "get_dict",
        args: [],
      })
      .then((result: any) => {
        const entries = result instanceof Map ? Array.from(result.entries()) : Object.entries(result ?? {});
        return { ...Object.fromEntries(entries), address };
      })
      .catch((error) => {
        console.error("Error fetching oracle:", error);
        return { address, error: "Error fetching oracle" } as any;
      });
    if (typeof oracle.analysis === "string" && !!oracle.analysis) {
      oracle.analysis = JSON.parse(oracle.analysis);
    }

    const existingIndex = _oracles.value.findIndex((o) => o.address === address);
    if (existingIndex >= 0) {
      _oracles.value[existingIndex] = oracle as Oracle;
    } else {
      _oracles.value.push(oracle as Oracle);
    }

    return oracle as Oracle;
  }

  async function resolveOracle(address: Address, evidence: string) {
    return await client.value.writeContract({
      account: account.value,
      address,
      functionName: "resolve",
      args: evidence ? [evidence] : [],
      value: BigInt(0),
    });
  }

  return {
    accountPrivateKey,
    client,
    account,
    oracles,
    refreshOracles,
    fetchOracle,
    resolveOracle,
    loading,
  };
});
