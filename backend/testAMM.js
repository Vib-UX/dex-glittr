import {
  Account,
  GlittrSDK,
  electrumFetchNonGlittrUtxos,
  txBuilder,
  addFeeToTx,
} from "@glittr-sdk/sdk";

import { schnorr, getPublicKey } from "@noble/secp256k1";
import { sha256 } from "bitcoinjs-lib/src/crypto.js";

const NETWORK = "regtest";
const API_KEY = "ccc80ba0-e813-41ed-8a62-1ea0560688e7";
const WIF = "cW84FgWG9U1MpKvdzZMv4JZKLSU7iFAzMmXjkGvGUvh5WvhrEASj";
// const WIF = "cTFZ5Bm9euMZWcAxZEmCXKr228WFY37QSsU9TgSZ65SAt4QTUhWU";

// Initialize the Glittr client and our account.
const client = new GlittrSDK({
  network: NETWORK,
  apiKey: API_KEY,
  glittrApi: "https://devnet-core-api.glittr.fi",
  electrumApi: "https://devnet-electrum.glittr.fi",
});
const account = new Account({ wif: WIF, network: NETWORK });
const address = account.p2tr().address;

// Helper delay function
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debug: Fetch and log valid outputs (UTXOs) for a given address.
 */
async function verifyValidOutputs(addr, apiKey) {
  const url = `https://devnet-core-api.glittr.fi/helper/address/${addr}/valid-outputs`;
  try {
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    const data = await res.json();
    console.log("=== Valid Outputs for Address ===");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error fetching valid outputs:", error);
  }
}

/**
 * Create an outcome asset (MOA) with a given ticker (e.g., "YES" or "NO")
 */
async function createOutcomeAsset(ticker) {
  const tx = {
    contract_creation: {
      contract_type: {
        moa: {
          ticker,
          divisibility: 18,
          live_time: 0,
          mint_mechanism: {
            free_mint: {
              amount_per_mint: BigInt(100000).toString(),
            },
          },
        },
      },
    },
  };

  const txid = await client.createAndBroadcastTx({
    account: account.p2tr(),
    tx,
  });
  console.log(`${ticker} asset created, TXID: ${txid}`);
  console.log("[+] Waiting for asset to be mined...");
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      console.log(`${ticker} asset mined:`, JSON.stringify(message));
      const [block, order] = message.block_tx.split(":").map(Number);
      return [block, order];
    } catch (error) {
      await delay(1000);
    }
  }
}

/**
 * Mint the asset using its contract (pointer is usually 1).
 */
async function mintAsset(contract, pointer = 1) {
  const tx = {
    contract_call: {
      contract,
      call_type: {
        mint: { pointer },
      },
    },
  };

  const outputs = [{ address, value: 546 }];
  const txid = await client.createAndBroadcastTx({
    account: account.p2tr(),
    tx,
    outputs,
  });
  console.log(`Mint TXID for contract ${contract[0]}:${contract[1]}: ${txid}`);
  console.log("[+] Waiting for mint to be mined...");
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      console.log("Mint mined:", JSON.stringify(message));
      break;
    } catch (error) {
      await delay(1000);
    }
  }
}

/**
 * Create an AMM contract (MBA) that uses the YES and NO tokens as collateral.
 * The AMM ticker is passed as an argument.
 */
async function createAMMContract(yesContract, noContract, ammTicker) {
  const tx = {
    contract_creation: {
      contract_type: {
        mba: {
          ticker: ammTicker, // Use the random AMM ticker
          divisibility: 18,
          live_time: 0,
          mint_mechanism: {
            collateralized: {
              input_assets: [
                { glittr_asset: yesContract },
                { glittr_asset: noContract },
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

  const outputs = [{ address, value: 546 }];
  const txid = await client.createAndBroadcastTx({
    account: account.p2tr(),
    tx,
    outputs,
  });
  console.log(`AMM contract creation TXID: ${txid}`);
  console.log("[+] Waiting for AMM contract to be mined...");
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      console.log("AMM contract mined:", JSON.stringify(message));
      const [block, order] = message.block_tx.split(":").map(Number);
      return [block, order];
    } catch (error) {
      await delay(1000);
    }
  }
}

/**
 * Deposit liquidity into the AMM by transferring a fixed amount of YES and NO tokens.
 */
async function depositLiquidity(
  ammContract,
  yesContract,
  noContract,
  depositAmount
) {
  const inputYes = await client.getAssetUtxos(
    address,
    `${yesContract[0]}:${yesContract[1]}`
  );
  const inputNo = await client.getAssetUtxos(
    address,
    `${noContract[0]}:${noContract[1]}`
  );

  const sumArray = (arr) =>
    arr.reduce((total, item) => total + parseInt(item.assetAmount), 0);
  const totalYes = sumArray(inputYes);
  const totalNo = sumArray(inputNo);
  console.log(`Total YES: ${totalYes}, Total NO: ${totalNo}`);

  if (totalYes < depositAmount || totalNo < depositAmount) {
    throw new Error("Insufficient balance to deposit liquidity");
  }

  const tx = {
    contract_call: {
      contract: ammContract,
      call_type: {
        mint: { pointer: 1 },
      },
    },
    transfer: {
      transfers: [
        {
          asset: yesContract,
          output: 1,
          amount: (totalYes - depositAmount).toString(),
        },
        {
          asset: noContract,
          output: 1,
          amount: (totalNo - depositAmount).toString(),
        },
      ],
    },
  };

  const outputs = [{ address, value: 546 }];
  const txid = await client.createAndBroadcastTx({
    account: account.p2tr(),
    tx,
    outputs,
  });
  console.log(`Liquidity deposit TXID: ${txid}`);
  console.log("[+] Waiting for liquidity deposit to be mined...");
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      console.log("Liquidity deposit mined:", JSON.stringify(message));
      break;
    } catch (error) {
      await delay(1000);
    }
  }
}

/**
 * Perform a swap of one outcome token for the other.
 */
/**
 * Perform a swap of one outcome token for the other.
 * This version gathers fee inputs using addFeeToTx and uses createAndBroadcastRawTx,
 * ensuring that inputs are properly signed.
 */
async function performSwap(
  ammContract,
  inputAsset,
  swapAmount,
  slippagePercentage
) {
  // Get the current AMM state.
  const contractState = await client.getContractState(
    ammContract[0],
    ammContract[1]
  );
  const assetKeyInput = `${inputAsset[0]}:${inputAsset[1]}`;
  const assetKeys = Object.keys(contractState.collateralized.amounts);
  const assetKeyOutput = assetKeys.find((key) => key !== assetKeyInput);
  if (!assetKeyOutput) {
    throw new Error("Output asset not found");
  }
  const inputTotal = parseInt(
    contractState.collateralized.amounts[assetKeyInput]
  );
  const outputTotal = parseInt(
    contractState.collateralized.amounts[assetKeyOutput]
  );
  const outputAmount = Math.floor(
    outputTotal - (inputTotal * outputTotal) / (inputTotal + swapAmount)
  );
  if (outputAmount <= 0) {
    throw new Error("Calculated output amount is 0");
  }
  const minOutput = Math.floor(
    outputAmount - (outputAmount * slippagePercentage) / 100
  );
  console.log(
    `Swapping ${swapAmount} tokens: calculated output = ${outputAmount}, with minimum acceptable = ${minOutput}`
  );

  // Build the swap transaction.
  const tx = {
    contract_call: {
      contract: ammContract,
      call_type: {
        swap: {
          pointer: 1,
          assert_values: { min_out_value: minOutput.toString() },
        },
      },
    },
    transfer: {
      transfers: [
        {
          asset: inputAsset,
          output: 2,
          amount: swapAmount.toString(),
        },
      ],
    },
  };

  // Define fee outputs.
  const nonFeeOutputs = [
    { script: txBuilder.compile(tx), value: 0 }, // OP_RETURN output with tx message.
    { address, value: 546 },
    { address, value: 546 },
  ];

  // Fetch UTXOs to fund the fee.
  const utxos = await electrumFetchNonGlittrUtxos(
    client.electrumApi,
    API_KEY,
    address
  );
  // (Optionally, you could also include specific asset UTXOs as nonFeeInputs.)
  const nonFeeInputs = []; // leaving empty so fee inputs are selected automatically

  // Use addFeeToTx to get fee inputs and adjusted outputs.
  const { inputs, outputs } = await addFeeToTx(
    NETWORK,
    address,
    utxos,
    nonFeeInputs,
    nonFeeOutputs
  );

  // Broadcast the raw transaction with the fee inputs.
  const txid = await client.createAndBroadcastRawTx({
    account: account.p2tr(),
    inputs,
    outputs,
  });
  console.log(`Swap TXID: ${txid}`);
  console.log("[+] Waiting for swap transaction to be mined...");
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      console.log("Swap mined:", JSON.stringify(message));
      break;
    } catch (error) {
      await delay(1000);
    }
  }
}

/**
 * Generate an Oracle Commitment for market resolution.
 */
async function getOracleCommitment(winningOutcome) {
  const currentBlockHeight = 880000; // Ideally, fetch this dynamically
  const oracleMessage = {
    asset_id: "prediction-market-001",
    outcome: winningOutcome,
    block_height: currentBlockHeight,
  };

  const messageStr = JSON.stringify(oracleMessage);
  const hashHex = sha256(Buffer.from(messageStr, "ascii")).toString("hex");
  const oraclePrivateKey = new Uint8Array([
    155, 112, 1, 86, 197, 238, 25, 119, 90, 109, 241, 199, 214, 248, 145, 209,
    253, 107, 11, 21, 162, 36, 125, 70, 42, 12, 110, 21, 177, 251, 9, 79,
  ]);
  const signature = await schnorr.sign(hashHex, oraclePrivateKey);
  const oracleCommitment = {
    signature: Array.from(signature),
    message: oracleMessage,
  };
  return oracleCommitment;
}

/**
 * Resolve the market using an oracle commitment.
 */
async function resolveMarket(ammContract, winningOutcome) {
  console.log(`Resolving market with winning outcome: ${winningOutcome}`);
  const oracleCommitment = await getOracleCommitment(winningOutcome);
  const tx = {
    contract_call: {
      contract: ammContract,
      call_type: {
        resolve: {
          pointer: 1,
          oracle_message: oracleCommitment,
        },
      },
    },
  };
  const outputs = [{ address, value: 546 }];
  const txid = await client.createAndBroadcastTx({
    account: account.p2tr(),
    tx,
    outputs,
  });
  console.log(`Market resolution TXID: ${txid}`);
  console.log("[+] Waiting for market resolution to be mined...");
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      console.log("Market resolution mined:", JSON.stringify(message));
      break;
    } catch (error) {
      await delay(1000);
    }
  }
}

/**
 * Placeholder for claiming winnings.
 */
async function claimWinnings(ammContract, outcomeAsset) {
  console.log("Claiming winnings using outcome asset", outcomeAsset);
  // Implement your claim logic here.
}

/**
 * Deposit collateral (USDC/BTC) and either mint outcome tokens or directly swap collateral for outcome tokens.
 */
async function depositCollateralAndMintOrSwap(
  ammContract,
  collateralAsset,
  depositAmount,
  outcomeAsset,
  slippagePercentage
) {
  // Get the current AMM state.
  const contractState = await client.getContractState(
    ammContract[0],
    ammContract[1]
  );
  const assetKeys = Object.keys(contractState.collateralized.amounts);
  const outcomeAssetKey = assetKeys.find((key) => key.includes(outcomeAsset));
  if (!outcomeAssetKey) {
    throw new Error(`${outcomeAsset} asset not found in AMM contract`);
  }
  const inputTotal = parseInt(
    contractState.collateralized.amounts[outcomeAssetKey]
  );
  const outputTotal = parseInt(
    contractState.collateralized.amounts[collateralAsset]
  );
  const outputAmount = Math.floor(
    outputTotal - (inputTotal * outputTotal) / (inputTotal + depositAmount)
  );
  if (outputAmount <= 0) {
    throw new Error("Calculated output amount is 0");
  }
  const minOutput = Math.floor(
    outputAmount - (outputAmount * slippagePercentage) / 100
  );
  console.log(
    `Depositing ${depositAmount} ${collateralAsset}: calculated output = ${outputAmount} ${outcomeAsset} tokens, with minimum acceptable = ${minOutput}`
  );

  // Build the transaction.
  const tx = {
    contract_call: {
      contract: ammContract,
      call_type: {
        swap: {
          pointer: 1,
          assert_values: { min_out_value: minOutput.toString() },
        },
      },
    },
    transfer: {
      transfers: [
        {
          asset: collateralAsset,
          output: 2,
          amount: depositAmount.toString(),
        },
      ],
    },
  };

  // Define fee outputs.
  const nonFeeOutputs = [
    { script: txBuilder.compile(tx), value: 0 }, // OP_RETURN output with tx message.
    { address, value: 546 },
    { address, value: 546 },
  ];

  // Fetch UTXOs to fund the fee.
  const utxos = await electrumFetchNonGlittrUtxos(
    client.electrumApi,
    API_KEY,
    address
  );
  const nonFeeInputs = []; // leaving empty so fee inputs are selected automatically

  // Use addFeeToTx to get fee inputs and adjusted outputs.
  const { inputs, outputs } = await addFeeToTx(
    NETWORK,
    address,
    utxos,
    nonFeeInputs,
    nonFeeOutputs
  );

  // Broadcast the raw transaction with the fee inputs.
  const txid = await client.createAndBroadcastRawTx({
    account: account.p2tr(),
    inputs,
    outputs,
  });
  console.log(`Collateral deposit TXID: ${txid}`);
  console.log("[+] Waiting for collateral deposit transaction to be mined...");
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      console.log("Collateral deposit mined:", JSON.stringify(message));
      break;
    } catch (error) {
      await delay(1000);
    }
  }
}

async function main() {
  // Generate random suffix for tickers to ensure uniqueness.
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const yesTicker = "test_yes_" + randomSuffix;
  const noTicker = "test_no_" + randomSuffix;
  const ammTicker = "AMM-market-" + randomSuffix;

  console.log("=== Creating outcome assets for the prediction market ===");
  console.log(account.p2tr().address);

  const yesAsset = await createOutcomeAsset(yesTicker);
  const noAsset = await createOutcomeAsset(noTicker);

  console.log("=== Minting outcome tokens ===");
  await mintAsset(yesAsset);
  await mintAsset(noAsset);

  console.log("=== Creating the AMM contract for the prediction market ===");
  const ammContract = await createAMMContract(yesAsset, noAsset, ammTicker);

  console.log("=== Waiting 1 minute before depositing liquidity ===");
  await delay(60000);

  console.log("=== Depositing liquidity into the AMM ===");
  const depositAmount = 100; // Adjust as needed
  await depositLiquidity(ammContract, yesAsset, noAsset, depositAmount);

  console.log("=== Waiting 1 minute before performing swap ===");
  await delay(80000);

  // // Debug: Verify valid outputs after liquidity deposit
  // await verifyValidOutputs(address, API_KEY);

  console.log("=== Performing a swap (example: swap 10 YES tokens) ===");
  const swapAmount = 100;
  const slippage = 10; // 10% tolerance
  await performSwap(ammContract, yesAsset, swapAmount, slippage);

  console.log("=== Simulating market resolution ===");
  const winningOutcome = "YES";
  await resolveMarket(ammContract, winningOutcome);

  console.log("=== Claiming winnings ===");
  await claimWinnings(ammContract, yesAsset);

  // Debug: Verify valid outputs after resolution and claims
  await verifyValidOutputs(address, API_KEY);

  // New user flow: Deposit collateral and mint outcome tokens or swap collateral for outcome tokens
  console.log(
    "=== New user flow: Deposit collateral and mint outcome tokens or swap collateral for outcome tokens ==="
  );
  const collateralAsset = ["BTC", "0"]; // Example collateral asset (BTC)
  const collateralDepositAmount = 0.01; // Example deposit amount in BTC
  const outcomeAsset = "YES"; // Example outcome asset to receive
  const slippagePercentage = 10; // 10% slippage tolerance
  await depositCollateralAndMintOrSwap(
    ammContract,
    collateralAsset,
    collateralDepositAmount,
    outcomeAsset,
    slippagePercentage
  );
}

main().catch((error) => {
  console.error("Error:", error);
});

main().catch((error) => {
  console.error("Error:", error);
});
