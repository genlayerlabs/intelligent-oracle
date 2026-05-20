import { describe, expect, it } from "vitest";
import {
  assertWalletRpcReachable,
  ensureWalletChain,
  hasPublicDeploymentLocalRpc,
  isZeroFeeTransactionError,
  isWalletMissingStudioNetworkError,
  isWalletRpcFetchError,
  normalizeWalletError,
  PUBLIC_LOCAL_RPC_MESSAGE,
  STUDIO_NETWORK_SETUP_MESSAGE,
  WALLET_RPC_UNREACHABLE_MESSAGE,
  type WalletRpcProvider,
} from "@/lib/wallet-rpc";

describe("wallet RPC helpers", () => {
  it("detects MetaMask failed fetch RPC errors", () => {
    expect(isWalletRpcFetchError({ code: -32603, message: "Failed to fetch" })).toBe(true);
    expect(isWalletRpcFetchError(new Error("MetaMask - RPC Error: Failed to fetch"))).toBe(true);
    expect(isWalletRpcFetchError(new Error("User rejected the request."))).toBe(false);
  });

  it("tells users to add Studio Network when the wallet is missing the chain", () => {
    const missingChain = {
      code: 4902,
      message: "Unrecognized chain ID. Try adding the chain using wallet_addEthereumChain first.",
    };

    expect(isWalletMissingStudioNetworkError(missingChain)).toBe(true);
    expect(normalizeWalletError(missingChain, "fallback")).toBe(STUDIO_NETWORK_SETUP_MESSAGE);
    expect(normalizeWalletError(new Error("Switch chain failed"), "fallback"))
      .toContain("If it is not listed");
  });

  it("does not confuse fee-cap minimum errors with missing chain errors", () => {
    const error = new Error("[0xabc]: transaction feeCap 0 below chain minimum");

    expect(isZeroFeeTransactionError(error)).toBe(true);
    expect(isWalletMissingStudioNetworkError(error)).toBe(false);
    expect(normalizeWalletError(error, "fallback")).toContain("chain minimum");
  });

  it("does not imply Studio users need funded GEN when the wallet reports insufficient funds", () => {
    expect(normalizeWalletError(new Error("insufficient funds for gas * price + value"), "fallback"))
      .toContain("should not require funded GEN");
  });

  it("preserves actionable app errors through nested normalization", () => {
    expect(normalizeWalletError(new Error(WALLET_RPC_UNREACHABLE_MESSAGE), "fallback"))
      .toBe(WALLET_RPC_UNREACHABLE_MESSAGE);
    expect(normalizeWalletError(new Error(PUBLIC_LOCAL_RPC_MESSAGE), "fallback"))
      .toBe(PUBLIC_LOCAL_RPC_MESSAGE);
  });

  it("rejects localhost RPC URLs on public browser origins", () => {
    expect(hasPublicDeploymentLocalRpc("http://localhost:4000/api", "https://oracle.example"))
      .toBe(true);
    expect(hasPublicDeploymentLocalRpc("http://127.0.0.1:4000/api", "https://oracle.example"))
      .toBe(true);
    expect(hasPublicDeploymentLocalRpc("http://localhost:4000/api", "http://localhost:3000"))
      .toBe(false);
    expect(hasPublicDeploymentLocalRpc("https://studio.genlayer.com/api", "https://oracle.example"))
      .toBe(false);
  });

  it("preflights wallet chain and block RPC calls", async () => {
    const calls: string[] = [];
    const provider: WalletRpcProvider = {
      async request({ method }) {
        calls.push(method);
        return method === "eth_chainId" ? "0xf22f" : "0x1";
      },
    };

    await expect(assertWalletRpcReachable(provider, "https://studio.genlayer.com/api", "https://oracle.example"))
      .resolves.toBeUndefined();
    expect(calls).toEqual(["eth_chainId", "eth_blockNumber"]);
  });

  it("switches to Studio Network when the wallet already has the chain", async () => {
    const calls: { method: string; params?: readonly unknown[] }[] = [];
    let chainId = "0x1";
    const provider: WalletRpcProvider = {
      async request(args) {
        calls.push(args);
        if (args.method === "eth_chainId") return chainId;
        if (args.method === "wallet_switchEthereumChain") {
          chainId = "0xf22f";
          return null;
        }
        throw new Error(`unexpected ${args.method}`);
      },
    };

    await expect(ensureWalletChain(provider, {
      chainId: 61999,
      chainName: "Studio Network",
      nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
      rpcUrl: "https://studio.genlayer.com/api",
    })).resolves.toBeUndefined();

    expect(calls.map((call) => call.method)).toEqual([
      "eth_chainId",
      "wallet_switchEthereumChain",
      "eth_chainId",
    ]);
  });

  it("adds Studio Network when wallet switch reports the chain is missing", async () => {
    const calls: { method: string; params?: readonly unknown[] }[] = [];
    let chainId = "0x1";
    const provider: WalletRpcProvider = {
      async request(args) {
        calls.push(args);
        if (args.method === "eth_chainId") return chainId;
        if (args.method === "wallet_switchEthereumChain") {
          if (!calls.some((call) => call.method === "wallet_addEthereumChain")) {
            throw { code: 4902, message: "Unrecognized chain" };
          }
          chainId = "0xf22f";
          return null;
        }
        if (args.method === "wallet_addEthereumChain") return null;
        throw new Error(`unexpected ${args.method}`);
      },
    };

    await expect(ensureWalletChain(provider, {
      chainId: 61999,
      chainName: "Studio Network",
      nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
      rpcUrl: "https://studio.genlayer.com/api",
    })).resolves.toBeUndefined();

    expect(calls.map((call) => call.method)).toEqual([
      "eth_chainId",
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "wallet_switchEthereumChain",
      "eth_chainId",
    ]);
    expect(calls[2].params).toEqual([
      {
        chainId: "0xf22f",
        chainName: "Studio Network",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: ["https://studio.genlayer.com/api"],
      },
    ]);
  });

  it("fails preflight with an actionable message when the wallet cannot fetch RPC", async () => {
    const provider: WalletRpcProvider = {
      async request() {
        throw { code: -32603, message: "Failed to fetch" };
      },
    };

    await expect(assertWalletRpcReachable(provider, "https://studio.genlayer.com/api", "https://oracle.example"))
      .rejects.toThrow(WALLET_RPC_UNREACHABLE_MESSAGE);
  });

  it("fails before wallet RPC calls when a public deployment points at localhost", async () => {
    const provider: WalletRpcProvider = {
      async request() {
        throw new Error("should not call wallet provider");
      },
    };

    await expect(assertWalletRpcReachable(provider, "http://localhost:4000/api", "https://oracle.example"))
      .rejects.toThrow(PUBLIC_LOCAL_RPC_MESSAGE);
  });

});
