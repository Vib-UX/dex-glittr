import {
  Account,
  BlockTxTuple,
  GlittrSDK,
  OpReturnMessage,
  Output,
} from "@glittr-sdk/sdk";
import * as fs from "fs";
import * as path from "path";

const NETWORK = "regtest";
const client = new GlittrSDK({
  network: NETWORK,
  apiKey: "8284e714-41d1-425c-a2fe-ea1659d1b269",
  glittrApi: "https://devnet-core-api.glittr.fi", // devnet
  electrumApi: "https://devnet-electrum.glittr.fi", // devnet
});

const creatorAccount = new Account({
  wif: "cW84FgWG9U1MpKvdzZMv4JZKLSU7iFAzMmXjkGvGUvh5WvhrEASj",
  network: NETWORK,
});

// Function to get current script name
function getCurrentFileName() {
  return path.basename(__filename);
}

// Function to create logs directory if it doesn't exist
function ensureLogsDirectory() {
  const logsDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  return logsDir;
}

// Function to log to both console and file
function log(message: string) {
  const timestamp = new Date().toISOString();
  const fileName = getCurrentFileName();
  const logMessage = `[${timestamp}] [${fileName}] ${message}\n`;

  console.log(message);

  // Create log file name based on current date and script name
  const date = new Date().toISOString().split("T")[0];
  const logFileName = `${date}_${path.parse(fileName).name}.log`;
  const logFilePath = path.join(ensureLogsDirectory(), logFileName);

  // Append to log file
  fs.appendFileSync(logFilePath, logMessage, "utf-8");
}

async function deployContract() {
  log("Starting AMM contract deployment...");

  // Contract information from the previous logs
  const firstContract: BlockTxTuple = [343443, 1]; // GLTT-DEX1 contract
  const secondContract: BlockTxTuple = [343447, 1]; // GLTT-DEX-2 contract

  log(`Using first contract: ${firstContract[0]}:${firstContract[1]}`);
  log(`Using second contract: ${secondContract[0]}:${secondContract[1]}`);

  const tx: OpReturnMessage = {
    contract_creation: {
      contract_type: {
        mba: {
          ticker: "GLTT-AMM", // More descriptive ticker name
          divisibility: 18,
          live_time: 0,
          mint_mechanism: {
            collateralized: {
              input_assets: [
                {
                  glittr_asset: firstContract,
                },
                {
                  glittr_asset: secondContract,
                },
              ],
              _mutable_assets: false,
              mint_structure: {
                proportional: {
                  ratio_model: "constant_product",
                },
              },
            },
          },
          burn_mechanism: {},
          swap_mechanism: {},
        },
      },
    },
  };

  const address = creatorAccount.p2tr().address;
  const outputs: Output[] = [{ address: address, value: 546 }];

  const txid = await client.createAndBroadcastTx({
    account: creatorAccount.p2tr(),
    outputs: outputs,
    tx: tx,
  });

  log(`TXID : ${txid}`);
  log("[+] Waiting to be mined");

  // Wait for transaction to be mined
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      log(`Mined! Response: ${JSON.stringify(message, null, 2)}`);
      break;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
}

// Add error handling for the main function
deployContract().catch((error) => {
  log(`Error during AMM contract deployment: ${error.message}`);
  process.exit(1);
});
