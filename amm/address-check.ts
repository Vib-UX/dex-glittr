import { Account } from "@glittr-sdk/sdk";
import * as fs from "fs";
import * as path from "path";

const NETWORK = "regtest";

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

const account = new Account({
  wif: "cVv9BxHH7z8ygBZY2p3dTYD9qb1uM6akPqFVucM73GivRz5py8eh",
  network: NETWORK,
});

log(`Checking address for WIF`);
log(`Generated address: ${account.p2tr().address}`);
