import { config } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  GenLayerTransaction,
  TransactionHash,
  TransactionStatus,
} from "genlayer-js/types";
import path from "path";

config();

const FACTORY_ENV_KEY = "NEXT_PUBLIC_ORACLE_FACTORY_ADDRESS";
const ROOT_ENV_LOCAL = path.join(__dirname, "..", ".env.local");
const STUDIO_RPC_DEFAULT = studionet.rpcUrls.default.http[0];

const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;
const account = createAccount(privateKey);
const effectiveRpc = process.env.RPC_URL || STUDIO_RPC_DEFAULT;

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

function upsertEnvKey(filePath: string, key: string, value: string): void {
  const newLine = `${key}=${value}`;
  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${newLine}\n`);
    return;
  }
  const content = readFileSync(filePath, "utf8");
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keyPattern = new RegExp(`^${escapedKey}=.*$`, "m");
  if (keyPattern.test(content)) {
    writeFileSync(filePath, content.replace(keyPattern, () => newLine));
  } else {
    const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
    writeFileSync(filePath, `${content}${separator}${newLine}\n`);
  }
}

async function verifyFactory(address: string): Promise<void> {
  const readClient = createClient({
    chain: studionet,
    endpoint: process.env.RPC_URL || undefined,
  });
  try {
    const markets = await readClient.readContract({
      address: address as `0x${string}`,
      functionName: "get_contract_addresses",
      args: [],
    });
    if (Array.isArray(markets)) {
      console.log(`Factory verified — ${markets.length} markets registered.`);
    } else {
      console.warn("Factory verify call returned non-array:", markets);
    }
  } catch (err) {
    console.warn("Factory verify call failed (deploy still succeeded):", err);
  }
}

const main = async () => {
  console.log(`Deploying via ${effectiveRpc}`);

  if (!privateKey) {
    const isStudio = effectiveRpc.includes("studio.genlayer.com")
      || effectiveRpc === STUDIO_RPC_DEFAULT;
    if (isStudio) {
      console.log("Using ephemeral account — fine for Studio, not for testnets.");
    } else {
      console.warn(
        `WARNING: deploying with ephemeral account against non-Studio RPC (${effectiveRpc}). `
        + "You probably want to set PRIVATE_KEY in scripts/.env.",
      );
    }
  }

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

  upsertEnvKey(ROOT_ENV_LOCAL, FACTORY_ENV_KEY, address);
  console.log(`Wrote ${FACTORY_ENV_KEY}=${address} → ${ROOT_ENV_LOCAL}`);

  await verifyFactory(address);

  const accountSource = privateKey ? "from PRIVATE_KEY" : "ephemeral";
  console.log("");
  console.log(`✓ Factory: ${address}`);
  console.log(`✓ RPC:     ${effectiveRpc}`);
  console.log(`✓ Account: ${account.address} (${accountSource})`);
  console.log(`✓ .env.local updated.`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
