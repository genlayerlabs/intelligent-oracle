import { defineEventHandler, readBody } from "h3";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  type Address,
  type GenLayerTransaction,
  TransactionStatus,
} from "genlayer-js/types";

interface IntelligentOracleInput {
  predictionMarketId: string;
  title: string;
  description: string;
  potentialOutcomes: string[];
  rules: string[];
  dataSourceDomains: string[];
  resolutionURLs: string[];
  earliestResolutionDate: string;
}

const { bridgePrivateKey, simulatorUrl, icRegistryAddress } = useRuntimeConfig();

function validateInput(input: IntelligentOracleInput): string | null {
  const requiredFields: (keyof IntelligentOracleInput)[] = [
    "title",
    "description",
    "potentialOutcomes",
    "rules",
    "earliestResolutionDate",
  ];

  for (const field of requiredFields) {
    if (!input[field] || (Array.isArray(input[field]) && input[field].length === 0)) {
      return `Missing or empty field: ${field}`;
    }
  }

  if (
    (!input.resolutionURLs && !input.dataSourceDomains) ||
    (Array.isArray(input.resolutionURLs) &&
      Array.isArray(input.dataSourceDomains) &&
      input.resolutionURLs.length === 0 &&
      input.dataSourceDomains.length === 0)
  ) {
    return "Missing resolution URLs or data source domains.";
  }

  if (
    Array.isArray(input.resolutionURLs) &&
    Array.isArray(input.dataSourceDomains) &&
    input.resolutionURLs.length > 0 &&
    input.dataSourceDomains.length > 0
  ) {
    return "Cannot provide both resolution URLs and data source domains.";
  }

  return null;
}

function extractContractAddress(receipt: GenLayerTransaction): Address | null {
  if (receipt.txDataDecoded && "contractAddress" in receipt.txDataDecoded) {
    return (receipt.txDataDecoded.contractAddress as Address | undefined) ?? null;
  }

  const fallback = receipt.data?.contract_address;
  return typeof fallback === "string" ? (fallback as Address) : null;
}

export default defineEventHandler(async (event) => {
  try {
    setResponseHeaders(event, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    if (event.method === "OPTIONS") {
      return "OK";
    }
    const body = await readBody(event);
    const validationError = validateInput(body);

    if (validationError) {
      return {
        status: "error",
        message: validationError,
      };
    }

    const account = createAccount(bridgePrivateKey as `0x${string}`);
    const client = createClient({
      chain: studionet,
      account,
      endpoint: simulatorUrl || undefined,
    });

    const deploymentArgs = [
      body.predictionMarketId || "0",
      body.title,
      body.description,
      body.potentialOutcomes,
      body.rules,
      body.dataSourceDomains || [],
      body.resolutionURLs || [],
      body.earliestResolutionDate,
    ];

    const registerContractTransactionHash = await client.writeContract({
      address: icRegistryAddress as Address,
      functionName: "create_new_prediction_market",
      args: deploymentArgs,
      value: BigInt(0),
    });
    console.log("registerContractTransactionHash:", registerContractTransactionHash);

    const methodCallReceipt = await client.waitForTransactionReceipt({
      hash: registerContractTransactionHash,
      status: TransactionStatus.FINALIZED,
    });

    const triggered = await client.getTriggeredTransactionIds({
      hash: registerContractTransactionHash,
    });

    if (triggered.length === 0) {
      return {
        status: "error",
        message: "Registration finalized but no oracle deploy transaction was returned.",
        receipt: methodCallReceipt,
      };
    }

    const intelligentOracleDeployTxHash = triggered[0];
    const intelligentOracleDeployReceipt = await client.waitForTransactionReceipt({
      hash: intelligentOracleDeployTxHash,
      status: TransactionStatus.ACCEPTED,
    });
    const oracleAddress = extractContractAddress(intelligentOracleDeployReceipt);

    if (!oracleAddress) {
      return {
        status: "error",
        message: "Oracle deploy transaction finalized without a contract address.",
        receipt: intelligentOracleDeployReceipt,
      };
    }

    return {
      status: "success",
      message: "Intelligent Oracle deployed successfully",
      oracleAddress,
      receipt: intelligentOracleDeployReceipt,
    };
  } catch (error) {
    console.error("Error deploying Intelligent Oracle:", error);
  }
  return {
    status: "error",
    message: "An error occurred while deploying the Intelligent Oracle",
  };
});
