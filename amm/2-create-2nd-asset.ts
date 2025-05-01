import { Account, GlittrSDK, GlittrTransaction } from "@glittr-sdk/sdk";
import * as fs from "fs";
import * as path from "path";

const NETWORK = "regtest";
const client = new GlittrSDK({
  network: NETWORK,
  apiKey: "8284e714-41d1-425c-a2fe-ea1659d1b269",
  glittrApi: "https://devnet-core-api.glittr.fi", // devnet
  electrumApi: "https://devnet-electrum.glittr.fi", // devnet
});

const account = new Account({
  network: NETWORK,
  wif: "cW84FgWG9U1MpKvdzZMv4JZKLSU7iFAzMmXjkGvGUvh5WvhrEASj",
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

async function deployFreeMintContract() {
  log("Starting free mint contract deployment...");

  const transaction = new GlittrTransaction({
    client,
    account,
  });

  const txid = await transaction.contractDeployment.freeMint(
    "GLTT-DEX-2", // ticker changed to 2
    18, // divisibility
    "1000", // amount per mint
    "10000000000" // supply cap
  );

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
deployFreeMintContract().catch((error) => {
  log(`Error during deployment: ${error.message}`);
  process.exit(1);
});
