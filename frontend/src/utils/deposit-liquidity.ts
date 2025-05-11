import {
  OpReturnMessage,
  txBuilder,
  electrumFetchNonGlittrUtxos,
  BitcoinUTXO,
  Output,
  addFeeToTx,
} from "@glittr-sdk/sdk";
import { Psbt } from "bitcoinjs-lib";
import { client, NETWORK } from "../app/Provider";
import toast from "react-hot-toast";
import { toastStyles } from "@/components/helpers";

export type TokenInfo = {
  contractId: string;
  ticker: string;
};

export type DepositLiquidityParams = {
  // Contract and token info
  ammContractId: string | [number, number];
  firstToken: TokenInfo;
  secondToken: TokenInfo;

  // Wallet info
  paymentAddress: string;
  paymentPublicKey: string;
  signPsbt: (
    tx: string,
    finalize?: boolean,
    broadcast?: boolean
  ) => Promise<
    | {
        signedPsbtHex?: string;
        signedPsbtBase64?: string;
        txId?: string;
      }
    | undefined
  >;

  // Amount info
  depositAmount: string | number;

  // UI callbacks
  onStart?: () => void;
  onSuccess?: (txid: string, blockTx: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
};

/**
 * Shared utility function to deposit liquidity to an AMM pool
 */
export const depositLiquidity = async ({
  ammContractId,
  firstToken,
  secondToken,
  paymentAddress,
  paymentPublicKey,
  signPsbt,
  depositAmount,
  onStart,
  onSuccess,
  onError,
  onComplete,
}: DepositLiquidityParams): Promise<void> => {
  try {
    if (onStart) onStart();

    console.log("Starting liquidity deposit to AMM...");

    // Parse contract ID
    let contract: [number, number];
    if (typeof ammContractId === "string") {
      // Handle blockId format
      console.log("Raw blockId value:", ammContractId);
      console.log("blockId type:", typeof ammContractId);
      console.log("blockId length:", ammContractId.length);
      console.log("blockId slice(0,7):", ammContractId.slice(0, 7));
      console.log("Parsed blockId:", parseInt(ammContractId.slice(0, 7)));

      contract = [parseInt(ammContractId.slice(0, 7)), 1];
    } else {
      // Handle tuple format
      contract = ammContractId;
    }

    console.log("AMM Contract:", contract);

    // Get contract pair information from the AMM contract
    console.log("Fetching AMM contract info...");
    const contractInfo = await client.getGlittrMessage(
      contract[0],
      contract[1]
    );
    console.log("AMM Contract Info:", contractInfo);

    const firstContract: [number, number] = [
      parseInt(firstToken.contractId.slice(0, 7)),
      1,
    ];

    const secondContract: [number, number] = [
      parseInt(secondToken.contractId.slice(0, 7)),
      1,
    ];

    console.log(`First contract: ${firstContract[0]}:${firstContract[1]}`);
    console.log(`Second contract: ${secondContract[0]}:${secondContract[1]}`);

    // Get your address' UTXO that contains the Assets
    console.log("Fetching asset UTXOs...");
    const inputAssetsFirst = await client.getAssetUtxos(
      paymentAddress,
      `${parseInt(firstToken.contractId.slice(0, 7))}:${1}`
    );
    const inputAssetsSecond = await client.getAssetUtxos(
      paymentAddress,
      `${parseInt(secondToken.contractId.slice(0, 7))}:${1}`
    );

    console.log("First asset UTXOs:", inputAssetsFirst);
    console.log("Second asset UTXOs:", inputAssetsSecond);

    // Check if you don't have the assets
    if (inputAssetsFirst.length === 0) {
      throw new Error(
        `You do not have assets for ${firstContract[0]}:${firstContract[1]}`
      );
    }

    if (inputAssetsSecond.length === 0) {
      throw new Error(
        `You do not have assets for ${secondContract[0]}:${secondContract[1]}`
      );
    }

    // Calculate total assets
    const totalHoldFirstAsset = inputAssetsFirst.reduce(
      (sum, item) => sum + parseInt(item.assetAmount),
      0
    );
    const totalHoldSecondAsset = inputAssetsSecond.reduce(
      (sum, item) => sum + parseInt(item.assetAmount),
      0
    );

    console.log(
      `Total hold ${firstContract[0]}:${firstContract[1]}: ${totalHoldFirstAsset}`
    );
    console.log(
      `Total hold ${secondContract[0]}:${secondContract[1]}: ${totalHoldSecondAsset}`
    );

    // Set how much you want to transfer for AMM liquidity
    const firstContractAmountForLiquidity = +depositAmount;
    const secondContractAmountForLiquidity = +depositAmount;

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

    const backendTx: OpReturnMessage = {
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

    console.log("Backend transaction object:", backendTx);

    // Fetch non-Glittr UTXOs for fee calculation
    const utxos = await electrumFetchNonGlittrUtxos(client, paymentAddress);

    // Prepare inputs and outputs for the transaction
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
      { script: txBuilder.compile(backendTx), value: 0 }, // Output #0 should always be OP_RETURN
      { address: paymentAddress, value: 546 },
    ];

    // Add fee to transaction
    const { inputs, outputs } = await addFeeToTx(
      NETWORK,
      paymentAddress,
      utxos,
      nonFeeInputs,
      nonFeeOutputs
    );

    console.log("Transaction fee calculated:", {
      inputs: inputs.length,
      outputs: outputs.length,
    });

    console.log("Creating raw transaction with client...");
    const tokenPsbt = await client.createRawTx({
      address: paymentAddress,
      inputs,
      outputs,
      publicKey: paymentPublicKey,
    });
    console.log("PSBT created:", tokenPsbt);

    console.log("Signing PSBT...");
    const depositLiquidityResult = await signPsbt(
      tokenPsbt.toHex(),
      false,
      false
    );
    console.log("PSBT signing result:", depositLiquidityResult);

    if (!depositLiquidityResult?.signedPsbtHex) {
      throw new Error("Failed to sign transaction");
    }

    const finalizedPsbt = Psbt.fromHex(depositLiquidityResult.signedPsbtHex);
    finalizedPsbt.finalizeAllInputs();
    const txHex = finalizedPsbt.extractTransaction(true).toHex();
    console.log("Broadcasting transaction...");
    const txid = await client.broadcastTx(txHex);
    console.log("Transaction broadcasted with ID:", txid);

    console.log("Waiting for message confirmation...");
    let blockTx = "";
    while (true) {
      try {
        const message = await client.getGlittrMessageByTxId(txid);
        console.log("Message received:", message);
        blockTx = message.block_tx;
        break;
      } catch (error) {
        console.log(error);
        console.log("Waiting for message confirmation...");
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry every 5 seconds
      }
    }

    console.log("Liquidity deposit completed successfully");
    toast.success("Liquidity deposit completed successfully", toastStyles);

    if (onSuccess) onSuccess(txid, blockTx);
  } catch (error) {
    console.error("Error depositing liquidity:", error);
    toast.error(
      "Error depositing liquidity: " + (error as Error).message,
      toastStyles
    );

    if (onError) onError(error as Error);
  } finally {
    if (onComplete) onComplete();
  }
};
