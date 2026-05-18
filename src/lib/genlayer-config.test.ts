import { describe, expect, it } from "vitest";
import {
  extractOracleAddressFromReceipt,
  getFirstTriggeredTransactionHash,
  getGenLayerRpcUrl,
  getOracleFactoryAddress,
  hasInvalidOracleFactoryAddress,
} from "@/lib/genlayer-config";

const factoryAddress = "0x1111111111111111111111111111111111111111";
const legacyRegistryAddress = "0x2222222222222222222222222222222222222222";

describe("genlayer public config", () => {
  it("prefers the oracle factory address and falls back to the legacy registry address", () => {
    expect(getOracleFactoryAddress({
      NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS: factoryAddress,
      NEXT_PUBLIC_IC_REGISTRY_ADDRESS: legacyRegistryAddress,
    })).toBe(factoryAddress);

    expect(getOracleFactoryAddress({
      NEXT_PUBLIC_IC_REGISTRY_ADDRESS: legacyRegistryAddress,
    })).toBe(legacyRegistryAddress);
  });

  it("rejects invalid factory addresses without exposing env details to callers", () => {
    const env = { NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS: "not-an-address" };

    expect(getOracleFactoryAddress(env)).toBeUndefined();
    expect(hasInvalidOracleFactoryAddress(env)).toBe(true);
  });

  it("uses the hosted Studio RPC URL by default", () => {
    expect(getGenLayerRpcUrl({})).toBe("https://studio.genlayer.com/api");
    expect(getGenLayerRpcUrl({ NEXT_PUBLIC_GENLAYER_RPC_URL: "https://example.test/rpc" }))
      .toBe("https://example.test/rpc");
  });
});

describe("genlayer transaction extraction", () => {
  it("extracts the created oracle address from decoded deploy receipt data", () => {
    expect(extractOracleAddressFromReceipt({
      txDataDecoded: {
        type: "deploy",
        contractAddress: factoryAddress,
      },
    })).toBe(factoryAddress);
  });

  it("extracts the created oracle address from legacy receipt data", () => {
    expect(extractOracleAddressFromReceipt({
      data: {
        contract_address: legacyRegistryAddress,
      },
    })).toBe(legacyRegistryAddress);
  });

  it("extracts the first triggered transaction hash", () => {
    const hash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    expect(getFirstTriggeredTransactionHash([hash])).toBe(hash);
    expect(getFirstTriggeredTransactionHash([])).toBeNull();
    expect(getFirstTriggeredTransactionHash(["not-a-hash"])).toBeNull();
  });
});
