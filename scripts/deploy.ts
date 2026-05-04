import { config } from "dotenv";
import { readFileSync } from "fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  GenLayerTransaction,
  TransactionHash,
  TransactionStatus,
} from "genlayer-js/types";
import path from "path";

config();

const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;
const account = createAccount(privateKey);

const client = createClient({
  chain: studionet,
  endpoint: process.env.RPC_URL || undefined,
  account,
});

function checkReceiptSuccess(
  receipt: GenLayerTransaction,
  context = "Transaction"
): void {
  const leader = receipt.consensus_data?.leader_receipt?.[0];
  if (leader?.execution_result !== "SUCCESS") {
    throw new Error(`${context} failed. Receipt: ${JSON.stringify(receipt)}`);
  }
}

function readContract(filename: string): string {
  return readFileSync(
    path.join(__dirname, "../intelligent-contracts", filename),
    "utf8"
  );
}

function extractContractAddress(receipt: GenLayerTransaction): string {
  if (receipt.txDataDecoded && "contractAddress" in receipt.txDataDecoded) {
    const addr = receipt.txDataDecoded.contractAddress;
    if (addr) return addr;
  }
  const fallback = receipt.data?.contract_address;
  if (typeof fallback === "string") return fallback;
  throw new Error(
    `Could not extract contract address from receipt: ${JSON.stringify(receipt)}`
  );
}

const main = async () => {
  console.log(`Deploying via ${process.env.RPC_URL || studionet.rpcUrls.default.http[0]}`);
  const factoryCode = readContract("IntelligentOracleFactory.py");
  const oracleCode = readContract("IntelligentOracle.py");

  const deployTxHash = (await client.deployContract({
    code: factoryCode,
    args: [oracleCode],
  })) as TransactionHash;
  console.log("Deploy tx hash:", deployTxHash);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTxHash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
  });
  console.log("Receipt:", JSON.stringify(receipt, null, 2));

  checkReceiptSuccess(receipt, "Contract deployment");

  const address = extractContractAddress(receipt);
  console.log(`Deployed contract to address: ${address}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
