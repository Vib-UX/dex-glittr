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

async function depositLiquidity() {
  log("Starting liquidity deposit to AMM...");

  // Get AMM contract information from the logs
  const contract: BlockTxTuple = [343451, 1]; // Latest AMM contract from logs

  // Get contract pair information from the AMM contract
  const contractInfo = await client.getGlittrMessage(contract[0], contract[1]);
  const firstContract: BlockTxTuple =
    contractInfo.message.message.contract_creation.contract_type.mba
      .mint_mechanism.collateralized.input_assets[0].glittr_asset;
  const secondContract: BlockTxTuple =
    contractInfo.message.message.contract_creation.contract_type.mba
      .mint_mechanism.collateralized.input_assets[1].glittr_asset;
  const address = creatorAccount.p2tr().address;

  log(`First contract: ${firstContract[0]}:${firstContract[1]}`);
  log(`Second contract: ${secondContract[0]}:${secondContract[1]}`);

  // Get your address' UTXO that contains the Assets
  const inputAssetsFirst = await client.getAssetUtxos(
    address,
    firstContract[0] + ":" + firstContract[1]
  );
  const inputAssetsSecond = await client.getAssetUtxos(
    address,
    secondContract[0] + ":" + secondContract[1]
  );

  // Check if you don't have the assets
  if (inputAssetsFirst.length == 0) {
    throw new Error(
      `You do not have assets for ${firstContract[0] + ":" + firstContract[1]}`
    );
  }

  if (inputAssetsSecond.length == 0) {
    throw new Error(
      `You do not have assets for ${
        secondContract[0] + ":" + secondContract[1]
      }`
    );
  }

  // Total of the assets
  const totalHoldFirstAsset = sumArray(
    inputAssetsFirst.map((item) => parseInt(item.assetAmount))
  );
  const totalHoldSecondAsset = sumArray(
    inputAssetsSecond.map((item) => parseInt(item.assetAmount))
  );
  log(
    `Total hold ${firstContract[0]}:${firstContract[1]} : ${totalHoldFirstAsset}`
  );
  log(
    `Total hold ${secondContract[0]}:${secondContract[1]} : ${totalHoldSecondAsset}`
  );

  // Set how much you want to transfer for AMM liquidity
  const firstContractAmountForLiquidity = 100; // Amount of first asset for liquidity
  const secondContractAmountForLiquidity = 100; // Amount of second asset for liquidity

  if (firstContractAmountForLiquidity > totalHoldFirstAsset) {
    throw new Error(
      `Amount for contract ${firstContract[0]}:${firstContract[1]} insufficient`
    );
  }

  if (secondContractAmountForLiquidity > totalHoldSecondAsset) {
    throw new Error(
      `Amount for contract ${secondContract[0]}:${secondContract[1]} insufficient`
    );
  }

  const tx: OpReturnMessage = {
    contract_call: {
      contract,
      call_type: {
        mint: {
          pointer: 1,
        },
      },
    },
    transfer: {
      transfers: [
        {
          asset: firstContract,
          output: 1,
          amount: (
            totalHoldFirstAsset - firstContractAmountForLiquidity
          ).toString(),
        },
        {
          asset: secondContract,
          output: 1,
          amount: (
            totalHoldSecondAsset - secondContractAmountForLiquidity
          ).toString(),
        },
      ],
    },
  };

  const utxos = await electrumFetchNonGlittrUtxos(client, address);

  const nonFeeInputs: BitcoinUTXO[] = inputAssetsFirst
    .concat(inputAssetsSecond)
    .filter((value, index, arr) => {
      const _value = JSON.stringify(value);
      return (
        index ===
        arr.findIndex((obj) => {
          return JSON.stringify(obj) === _value;
        })
      );
    }); // remove duplicates
  const nonFeeOutputs: Output[] = [
    { script: txBuilder.compile(tx), value: 0 }, // Output #0 should always be OP_RETURN
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
      break;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }
}

// Add error handling for the main function
depositLiquidity().catch((error) => {
  log(`Error during liquidity deposit: ${error.message}`);
  process.exit(1);
});
