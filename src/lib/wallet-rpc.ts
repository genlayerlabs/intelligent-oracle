const LOCAL_RPC_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

export const WALLET_RPC_UNREACHABLE_MESSAGE =
  "Your wallet cannot reach the GenLayer RPC. Open MetaMask network settings and re-add Studio Network with RPC URL https://studio.genlayer.com/api, then try again.";

export const STUDIO_NETWORK_SETUP_MESSAGE =
  "Add Studio Network to your wallet, then switch to it. Use RPC URL https://studio.genlayer.com/api and chain ID 61999 (0xf22f).";

export const PUBLIC_LOCAL_RPC_MESSAGE =
  "This deployment is configured with a localhost GenLayer RPC URL. Set NEXT_PUBLIC_GENLAYER_RPC_URL to a public RPC URL such as https://studio.genlayer.com/api and redeploy.";

const LOW_FEE_MESSAGE =
  "The wallet submitted a transaction fee below Studio's chain minimum. Use Add / switch Studio Network to refresh the wallet network config, then retry.";

export type WalletRpcProvider = {
  request(args: { method: string; params?: readonly unknown[] }): Promise<unknown>;
};

type WalletChainTarget = {
  chainId: number;
  chainName: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
};

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return [error.message, error.stack, error.cause ? errorText(error.cause) : ""]
      .filter(Boolean)
      .join(" ");
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error || "");
}

export function isWalletRpcFetchError(error: unknown) {
  const text = errorText(error);
  return /failed to fetch|network\s*error|load failed|fetch failed|rpc.*fetch|-32603/i.test(text);
}

export function isZeroFeeTransactionError(error: unknown) {
  const text = errorText(error);
  return /feecap\s+0\s+below|fee cap\s+0\s+below|gasprice\s+0\s+below|gas price\s+0\s+below|fee.*below.*minimum/i.test(text);
}

export function isWalletMissingStudioNetworkError(error: unknown) {
  const text = errorText(error);
  return /4902|unrecognized chain|unknown chain|not added|add.*chain|wallet_addEthereumChain|chain.*not.*configured|unsupported chain/i.test(text);
}

export function normalizeWalletError(error: unknown, fallback: string) {
  const message = errorText(error);

  if (message.includes(WALLET_RPC_UNREACHABLE_MESSAGE)) return WALLET_RPC_UNREACHABLE_MESSAGE;
  if (message.includes(STUDIO_NETWORK_SETUP_MESSAGE)) return STUDIO_NETWORK_SETUP_MESSAGE;
  if (message.includes(PUBLIC_LOCAL_RPC_MESSAGE)) return PUBLIC_LOCAL_RPC_MESSAGE;
  if (message.includes(LOW_FEE_MESSAGE)) return LOW_FEE_MESSAGE;

  if (/user rejected|user denied|rejected request|request rejected|denied transaction|cancelled|canceled/i.test(message)) {
    return "Request cancelled in your wallet.";
  }

  if (/insufficient funds|not enough balance/i.test(message)) {
    return "The wallet reported insufficient funds, but Studio transactions should not require funded GEN. Use Add / switch Studio Network to refresh the wallet network config, then retry.";
  }

  if (isWalletRpcFetchError(error)) {
    return WALLET_RPC_UNREACHABLE_MESSAGE;
  }

  if (isZeroFeeTransactionError(error)) {
    return LOW_FEE_MESSAGE;
  }

  if (isWalletMissingStudioNetworkError(error)) {
    return STUDIO_NETWORK_SETUP_MESSAGE;
  }

  if (/switch|wrong network|unsupported network|incorrect network|chain id|chain mismatch/i.test(message)) {
    return `Switch to Studio Network in your wallet. If it is not listed, ${STUDIO_NETWORK_SETUP_MESSAGE}`;
  }

  return fallback;
}

export function isLocalRpcUrl(rpcUrl: string) {
  try {
    const parsed = new URL(rpcUrl);
    return LOCAL_RPC_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isLocalBrowserOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    return LOCAL_RPC_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function hasPublicDeploymentLocalRpc(rpcUrl: string, origin?: string) {
  if (!isLocalRpcUrl(rpcUrl)) return false;
  if (!origin) return false;
  return !isLocalBrowserOrigin(origin);
}

export function assertPublicRpcConfiguration(rpcUrl: string, origin?: string) {
  if (hasPublicDeploymentLocalRpc(rpcUrl, origin)) {
    throw new Error(PUBLIC_LOCAL_RPC_MESSAGE);
  }
}

export async function assertWalletRpcReachable(provider: WalletRpcProvider, rpcUrl: string, origin?: string) {
  assertPublicRpcConfiguration(rpcUrl, origin);

  try {
    await provider.request({ method: "eth_chainId" });
    await provider.request({ method: "eth_blockNumber" });
  } catch (error) {
    throw new Error(normalizeWalletError(error, WALLET_RPC_UNREACHABLE_MESSAGE));
  }
}

export async function ensureWalletChain(provider: WalletRpcProvider, target: WalletChainTarget) {
  const chainIdHex = `0x${target.chainId.toString(16)}`;
  const currentChainId = await provider.request({ method: "eth_chainId" }).catch(() => undefined);

  if (typeof currentChainId === "string" && currentChainId.toLowerCase() === chainIdHex) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError) {
    if (!isWalletMissingStudioNetworkError(switchError)) {
      throw new Error(normalizeWalletError(switchError, STUDIO_NETWORK_SETUP_MESSAGE));
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: target.chainName,
          nativeCurrency: target.nativeCurrency,
          rpcUrls: [target.rpcUrl],
        },
      ],
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  }

  const nextChainId = await provider.request({ method: "eth_chainId" });
  if (typeof nextChainId !== "string" || nextChainId.toLowerCase() !== chainIdHex) {
    throw new Error(`Switch to Studio Network in your wallet. If it is not listed, ${STUDIO_NETWORK_SETUP_MESSAGE}`);
  }
}

export async function addOrUpdateWalletChain(provider: WalletRpcProvider, target: WalletChainTarget) {
  const chainIdHex = `0x${target.chainId.toString(16)}`;
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: chainIdHex,
        chainName: target.chainName,
        nativeCurrency: target.nativeCurrency,
        rpcUrls: [target.rpcUrl],
      },
    ],
  });

  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: chainIdHex }],
  });
}
