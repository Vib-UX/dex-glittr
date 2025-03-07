import {
  GlittrSDK,
  Output,
  OpReturnMessage,
  BlockTxTuple,
  electrumFetchNonGlittrUtxos,
  BitcoinUTXO,
  txBuilder,
  addFeeToTx,
} from "@glittr-sdk/sdk";

const NETWORK = "regtest";
const client = new GlittrSDK({
  network: NETWORK,
  apiKey: "8284e714-41d1-425c-a2fe-ea1659d1b269",
  glittrApi: "https://devnet-core-api.glittr.fi", // devnet
  electrumApi: "https://devnet-electrum.glittr.fi", // devnet
});

const sumArray = (arr: any[]) =>
  arr.reduce((total, current) => total + current, 0);

const depositLiquidity = async (blockId: string, account: any) => {
  if (!account) {
    throw new Error("No account found for signing.");
  }

  const contract: BlockTxTuple = [parseInt(blockId.slice(0, 7)), 1];

  // Get contract pair information from the AMM contract
  const contractInfo = await client.getGlittrMessage(contract[0], contract[1]);
  const firstContract: BlockTxTuple =
    contractInfo.message.message.contract_creation.contract_type.mba
      .mint_mechanism.collateralized.input_assets[0].glittr_asset;
  const secondContract: BlockTxTuple =
    contractInfo.message.message.contract_creation.contract_type.mba
      .mint_mechanism.collateralized.input_assets[1].glittr_asset;
  const address = account.p2tr().address;

  // Fetch UTXOs containing assets
  const inputAssetsFirst = await client.getAssetUtxos(
    address,
    `${firstContract[0]}:${firstContract[1]}`
  );
  const inputAssetsSecond = await client.getAssetUtxos(
    address,
    `${secondContract[0]}:${secondContract[1]}`
  );

  //   // Calculate total holdings
  //   const totalHoldFirstAsset = sumArray(
  //     inputAssetsFirst.map((item) => parseInt(item.assetAmount))
  //   );
  //   const totalHoldSecondAsset = sumArray(
  //     inputAssetsSecond.map((item) => parseInt(item.assetAmount))
  //   );

  //   console.log(`Total held ${firstContract}: ${totalHoldFirstAsset}`);
  //   console.log(`Total held ${secondContract}: ${totalHoldSecondAsset}`);

  // Define the amount to deposit into liquidity
  const firstContractAmountForLiquidity = 100; // Change this value
  const secondContractAmountForLiquidity = 100; // Change this value

  //   if (firstContractAmountForLiquidity > totalHoldFirstAsset) {
  //     throw new Error(`Insufficient ${firstContract} balance.`);
  //   }

  //   if (secondContractAmountForLiquidity > totalHoldSecondAsset) {
  //     throw new Error(`Insufficient ${secondContract} balance.`);
  //   }

  // Create contract call and transfer transactions
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
          amount: (100).toString(),
        },
        {
          asset: secondContract,
          output: 1,
          amount: (100).toString(),
        },
      ],
    },
  };

  // Fetch UTXOs for fee
  const utxos = await electrumFetchNonGlittrUtxos(client, address);

  // Prepare transaction inputs and outputs
  const nonFeeInputs: BitcoinUTXO[] = [
    ...inputAssetsFirst,
    ...inputAssetsSecond,
  ];
  const nonFeeOutputs: Output[] = [
    { script: txBuilder.compile(tx), value: 0 }, // OP_RETURN
    { address: address, value: 546 },
  ];

  // Add fee to transaction
  const { inputs, outputs } = await addFeeToTx(
    NETWORK,
    address,
    utxos,
    nonFeeInputs,
    nonFeeOutputs
  );

  // Create and sign transaction client-side
  const rawTx = await client.createRawTx({
    account: account.p2tr(),
    inputs,
    outputs,
  });

  const signedTx = await account.signPsbt(rawTx);

  if (!signedTx?.signedPsbtHex) {
    throw new Error("Transaction signing failed.");
  }

  const txid = await client.broadcastTx(signedTx.signedPsbtHex);
  console.log(`TXID: ${txid}`);

  // Wait for transaction confirmation
  console.log("[+] Waiting to be mined...");
  while (true) {
    try {
      const message = await client.getGlittrMessageByTxId(txid);
      console.log("Mined! Response:", JSON.stringify(message));
      break;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry every 5 seconds
    }
  }
};

export default depositLiquidity;
