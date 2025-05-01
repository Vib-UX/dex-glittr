import {
  Account,
  GlittrSDK,
  Output,
  OpReturnMessage,
  BlockTxTuple,
  electrumFetchNonGlittrUtxos,
  BitcoinUTXO,
  txBuilder,
  addFeeToTx,
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

const sumArray = (arr: any[]) =>
  arr.reduce((total, current) => total + current, 0);

const contractTupleToString = (contract: [number, number]) => {
  return contract[0] + ":" + contract[1];
};

const calculateOutAmount = async (
  contract: [number, number],
  contractInput: [number, number],
  amount: number
): Promise<number> => {
  const contractState = await client.getContractState(contract[0], contract[1]);

  const outputContract = Object.keys(
    contractState.collateralized.amounts
  ).filter((item: string) => item !== contractTupleToString(contractInput))[0]!;

  const inputTotalSupply =
    contractState.collateralized.amounts[contractTupleToString(contractInput)];
  const outputTotalSupply =
    contractState.collateralized.amounts[outputContract];

  const outputAmount = Math.floor(
    outputTotalSupply -
      (inputTotalSupply * outputTotalSupply) / (inputTotalSupply + amount)
  );

  if (outputAmount == 0) {
    throw new Error("Calculated output amount is 0");
  }

  return outputAmount;
};

async function swap() {
  log("Starting swap operation...");

  // Get AMM contract information from the logs
  const contract: BlockTxTuple = [343451, 1]; // Latest AMM contract from logs
  const firstContract: BlockTxTuple = [343443, 1]; // GLTT-DEX1 contract
  const address = creatorAccount.p2tr().address;

  log(`Using AMM contract: ${contract[0]}:${contract[1]}`);
  log(`Using input contract: ${firstContract[0]}:${firstContract[1]}`);

  const inputAssetsFirst = await client.getAssetUtxos(
    address,
    firstContract[0] + ":" + firstContract[1]
  );

  const totalInput = sumArray(
    inputAssetsFirst.map((item) => parseInt(item.assetAmount))
  );
  const totalInputUsed = 10; // Amount to swap
  log(`Total Input Asset: ${totalInput}`);
  log(`Input Amount for swap: ${totalInputUsed}`);

  // Slippage calculation
  const outAmount = await calculateOutAmount(
    contract,
    firstContract,
    totalInputUsed
  );
  log(`[+] Calculated output amount is: ${outAmount}`);
  const slippagePercentage = 10;
  const minOutputAmount = Math.floor(
    outAmount - (outAmount * slippagePercentage) / 100
  );
  log(
    `[+] Minimum output amount is: ${minOutputAmount} (slippage: ${slippagePercentage}%)`
  );

  const tx: OpReturnMessage = {
    contract_call: {
      contract,
      call_type: {
        swap: {
          pointer: 1,
          assert_values: { min_out_value: minOutputAmount.toString() },
        },
      },
    },
    transfer: {
      transfers: [
        {
          asset: firstContract,
          output: 2,
          amount: (totalInput - totalInputUsed).toString(), // just use 10 for swap, the rest will be change for the account
        },
      ],
    },
  };

  const utxos = await electrumFetchNonGlittrUtxos(client, address);

  const nonFeeInputs: BitcoinUTXO[] = inputAssetsFirst;
  const nonFeeOutputs: Output[] = [
    { script: txBuilder.compile(tx), value: 0 }, // Output #0 should always be OP_RETURN
    { address: address, value: 546 },
    { address: address, value: 546 },
  ];

  const { inputs, outputs } = await addFeeToTx(
    NETWORK,
    address,
    utxos,
    nonFeeInputs,
    nonFeeOutputs
  );

  const txid = await client.createAndBroadcastRawTx({
    account: creatorAccount.p2tr(),
    inputs,
    outputs,
  });

  log(`TXID : ${txid}`);
  log("[+] Waiting to be mined");

  // Wait for transaction to be mined
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      log(`Mined! Response: ${JSON.stringify(message, null, 2)}`);
      const assetOutput = await client.getGlittrAsset(txid, 1);
      log(`Asset output: ${JSON.stringify(assetOutput, null, 2)}`);
      break;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
}

// Add error handling for the main function
swap().catch((error) => {
  log(`Error during swap: ${error.message}`);
  process.exit(1);
});
