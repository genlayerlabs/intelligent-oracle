import { studionet } from "genlayer-js/chains";
import type { Address, GenLayerTransaction, TransactionHash } from "genlayer-js/types";
import { isAddress } from "viem";

const DEFAULT_STUDIO_RPC_URL = studionet.rpcUrls.default.http[0] || "https://studio.genlayer.com/api";
const LOCAL_WALLETCONNECT_PROJECT_ID = "local-development-walletconnect-project-id";

type PublicGenLayerEnv = {
  NEXT_PUBLIC_GENLAYER_RPC_URL?: string;
  NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS?: string;
  NEXT_PUBLIC_IC_REGISTRY_ADDRESS?: string;
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
};

function trim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

// Use direct `process.env.NEXT_PUBLIC_*` access so Next.js inlines values at
// build time for the client bundle. Tests pass `env` explicitly to override.
function resolveEnv(env?: PublicGenLayerEnv) {
  return {
    rpcUrl: trim(env?.NEXT_PUBLIC_GENLAYER_RPC_URL ?? process.env.NEXT_PUBLIC_GENLAYER_RPC_URL),
    factoryAddress: trim(env?.NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS ?? process.env.NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS),
    legacyRegistryAddress: trim(env?.NEXT_PUBLIC_IC_REGISTRY_ADDRESS ?? process.env.NEXT_PUBLIC_IC_REGISTRY_ADDRESS),
    walletConnectProjectId: trim(env?.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
  };
}

export function getGenLayerRpcUrl(env?: PublicGenLayerEnv) {
  return resolveEnv(env).rpcUrl || DEFAULT_STUDIO_RPC_URL;
}

export function getWalletConnectProjectId(env?: PublicGenLayerEnv) {
  return resolveEnv(env).walletConnectProjectId || LOCAL_WALLETCONNECT_PROJECT_ID;
}

export function getOracleFactoryAddress(env?: PublicGenLayerEnv): Address | undefined {
  const { factoryAddress, legacyRegistryAddress } = resolveEnv(env);
  const address = factoryAddress || legacyRegistryAddress;
  return address && isAddress(address) ? address : undefined;
}

export function hasInvalidOracleFactoryAddress(env?: PublicGenLayerEnv) {
  const { factoryAddress, legacyRegistryAddress } = resolveEnv(env);
  const address = factoryAddress || legacyRegistryAddress;
  return Boolean(address && !isAddress(address));
}

export function getGenLayerChain(env?: PublicGenLayerEnv) {
  const rpcUrl = getGenLayerRpcUrl(env);

  return {
    ...studionet,
    name: "Studio Network",
    rpcUrls: {
      ...studionet.rpcUrls,
      default: {
        http: [rpcUrl],
      },
      public: {
        http: [rpcUrl],
      },
    },
  };
}

export const genLayerChain = getGenLayerChain();

function addressFromValue(value: unknown): Address | null {
  return typeof value === "string" && isAddress(value) ? value : null;
}

export function extractOracleAddressFromReceipt(receipt: GenLayerTransaction | null | undefined): Address | null {
  if (!receipt) return null;

  const decoded = receipt.txDataDecoded;
  if (decoded && "contractAddress" in decoded) {
    const decodedAddress = addressFromValue(decoded.contractAddress);
    if (decodedAddress) return decodedAddress;
  }

  const dataAddress = addressFromValue(receipt.data?.contract_address);
  if (dataAddress) return dataAddress;

  return addressFromValue(receipt.data?.contractAddress);
}

export function getFirstTriggeredTransactionHash(triggered: unknown): TransactionHash | null {
  if (!Array.isArray(triggered)) return null;

  const [hash] = triggered;
  return typeof hash === "string" && hash.startsWith("0x") ? (hash as TransactionHash) : null;
}
