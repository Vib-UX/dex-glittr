"use client";
import React, { useEffect, useState, Suspense } from "react";
import {
  FaGlobe,
  FaTelegram,
  FaTwitter,
  FaChevronDown,
  FaArrowLeft,
} from "react-icons/fa";
import { FiArrowDown } from "react-icons/fi";
import { useRouter, useSearchParams } from "next/navigation";

import { useLaserEyes } from "@glittr-sdk/lasereyes";
import {
  OpReturnMessage,
  txBuilder,
  electrumFetchNonGlittrUtxos,
  BitcoinUTXO,
  Output,
  addFeeToTx,
} from "@glittr-sdk/sdk";
import { Psbt } from "bitcoinjs-lib";

import toast from "react-hot-toast";
import MyModal from "@/components/modal";
import SwapModal from "@/components/swapModal";
import { toastStyles } from "@/components/helpers";
import { ContractInfo } from "../tokens/page";
import { client, NETWORK } from "../Provider";

interface ContractRawInfo {
  ticker?: string;
  total_supply: string;
  supply_cap: string;
  type?: {
    free_mint?: boolean;
    collateralized?: {
      assets: Array<{
        contract_id: string;
        divisibility: number;
        ticker: string;
      }>;
    };
  };
}

interface ApiResponse {
  result: {
    [key: string]: ContractRawInfo;
  };
}

// Add utility functions
const contractTupleToString = (contract: [number, number]) => {
  return contract[0] + ":" + contract[1];
};

const calculateOutAmount = async (
  contract: [number, number],
  contractInput: [number, number],
  amount: number
): Promise<number> => {
  console.log("calculateOutAmount called with:", {
    contract,
    contractInput,
    amount,
  });

  try {
    const contractState = await client.getContractState(
      contract[0],
      contract[1]
    );
    console.log("Contract state retrieved:", {
      contractId: `${contract[0]}:${contract[1]}`,
      hasCollateralized: !!contractState.collateralized,
      collateralizedAmounts: contractState.collateralized?.amounts || {},
      fullState: contractState,
    });

    if (
      !contractState.collateralized ||
      !contractState.collateralized.amounts
    ) {
      throw new Error("Invalid contract state: missing collateralized amounts");
    }

    const inputContractString = contractTupleToString(contractInput);
    const availableContracts = Object.keys(
      contractState.collateralized.amounts
    );

    console.log("Available contracts in pool:", {
      availableContracts,
      inputContractString,
      amounts: contractState.collateralized.amounts,
    });

    if (!availableContracts.includes(inputContractString)) {
      throw new Error(
        `Input contract ${inputContractString} not found in pool`
      );
    }

    const outputContract = availableContracts.find(
      (item: string) => item !== inputContractString
    );

    if (!outputContract) {
      throw new Error("Could not find output contract in pool");
    }

    console.log("Output contract found:", {
      outputContract,
      allContracts: availableContracts,
    });

    const inputTotalSupply = parseInt(
      contractState.collateralized.amounts[inputContractString]
    );
    const outputTotalSupply = parseInt(
      contractState.collateralized.amounts[outputContract]
    );

    console.log("Supply values:", {
      inputTotalSupply,
      outputTotalSupply,
      inputContractString,
      outputContract,
      rawInputSupply: contractState.collateralized.amounts[inputContractString],
      rawOutputSupply: contractState.collateralized.amounts[outputContract],
    });

    // Check if pool has been initialized with liquidity
    if (inputTotalSupply === 0 || outputTotalSupply === 0) {
      console.error("Pool has no liquidity:", {
        inputTotalSupply,
        outputTotalSupply,
        inputContractString,
        outputContract,
      });
      throw new Error(
        "This pool has no liquidity. Please add liquidity first."
      );
    }

    if (isNaN(inputTotalSupply) || isNaN(outputTotalSupply)) {
      throw new Error("Invalid supply values: NaN detected");
    }

    if (inputTotalSupply < 0 || outputTotalSupply < 0) {
      throw new Error(
        `Invalid supply values: input=${inputTotalSupply}, output=${outputTotalSupply}`
      );
    }

    // Calculate price impact
    const priceImpact = (amount / inputTotalSupply) * 100;
    console.log("Price impact calculation:", {
      amount,
      inputTotalSupply,
      priceImpact: `${priceImpact.toFixed(2)}%`,
    });

    // Warn if price impact is too high
    if (priceImpact > 10) {
      console.warn("High price impact detected:", {
        priceImpact: `${priceImpact.toFixed(2)}%`,
        amount,
        inputTotalSupply,
      });
    }

    const outputAmount = Math.floor(
      outputTotalSupply -
        (inputTotalSupply * outputTotalSupply) / (inputTotalSupply + amount)
    );

    console.log("Calculation details:", {
      formula:
        "outputTotalSupply - (inputTotalSupply * outputTotalSupply) / (inputTotalSupply + amount)",
      values: {
        outputTotalSupply,
        inputTotalSupply,
        amount,
        result: outputAmount,
        intermediate: {
          product: inputTotalSupply * outputTotalSupply,
          sum: inputTotalSupply + amount,
          division:
            (inputTotalSupply * outputTotalSupply) /
            (inputTotalSupply + amount),
        },
      },
    });

    if (outputAmount <= 0) {
      console.error("Invalid output amount calculated:", {
        inputTotalSupply,
        outputTotalSupply,
        amount,
        outputAmount,
        intermediate: {
          product: inputTotalSupply * outputTotalSupply,
          sum: inputTotalSupply + amount,
          division:
            (inputTotalSupply * outputTotalSupply) /
            (inputTotalSupply + amount),
        },
      });
      // throw new Error(
      //   `Invalid output amount: ${outputAmount}. This might be due to insufficient liquidity or too large of a swap amount.`
      // );
    }

    return outputAmount;
  } catch (error) {
    console.error("Error in calculateOutAmount:", {
      error,
      contract,
      contractInput,
      amount,
    });
    throw error;
  }
};

function SwapContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pools, setPools] = useState<ContractInfo[] | null>(null);
  const [fromTokenAmount, setFromTokenAmount] = useState<string>("0.00");
  const [toTokenAmount, setToTokenAmount] = useState<string>("0.00");
  const [fromTokenSelected, setFromTokenSelected] =
    useState<ContractInfo | null>(null);
  const [toTokenSelected, setToTokenSelected] = useState<ContractInfo | null>(
    null
  );
  const [selectedPool, setSelectedPool] = useState<ContractInfo | null>(null);
  const [showPoolSelection, setShowPoolSelection] = useState<boolean>(true);
  const [blockDepositeLink, setBlockDepositeLink] = useState<string>("");
  const [swapTxLink, setSwapTxLink] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isConfirmingSwap, setIsConfirmingSwap] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [fromTokenBalance, setFromTokenBalance] = useState<string>("0");
  const [toTokenBalance, setToTokenBalance] = useState<string>("0");
  const { paymentAddress, connected, signPsbt, paymentPublicKey } =
    useLaserEyes();
  const [slippage, setSlippage] = useState<number>(10); // Changed to 10% default slippage
  const [calculatedOutput, setCalculatedOutput] = useState<number>(0);
  const [minOutputAmount, setMinOutputAmount] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isDepositMode, setIsDepositMode] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>("0.00");
  const [depositLoading, setDepositLoading] = useState<boolean>(false);

  // Properly typed account object
  type Account = {
    p2wpkh: () => { address: string };
    network: typeof NETWORK;
    p2pkh: () => { address: string };
    p2tr: () => { address: string };
    publicKey: string;
  } | null;

  // Using useMemo to prevent the account initialization from causing rerenders
  const account = React.useMemo<Account>(() => {
    return connected && paymentPublicKey && paymentAddress
      ? {
          p2wpkh: () => ({
            address: paymentAddress,
          }),
          network: NETWORK,
          p2pkh: () => ({
            address: paymentAddress,
          }),
          p2tr: () => ({
            address: paymentAddress,
          }),
          publicKey: paymentPublicKey,
        }
      : null;
  }, [connected, paymentPublicKey, paymentAddress]);

  // Define handlePoolSelect with useCallback before using it in useEffect
  const handlePoolSelect = React.useCallback(
    (pool: ContractInfo): void => {
      console.log("Selected pool:", pool);
      setSelectedPool(pool);
      setShowPoolSelection(false);

      // Pre-select the tokens based on the pool's assets
      if (pool.linkedAssets) {
        setFromTokenSelected({
          ticker: pool.linkedAssets.asset1.ticker,
          contractId: pool.linkedAssets.asset1.contractId,
          supply: "0",
          amountPerMint: "0",
        });
        setToTokenSelected({
          ticker: pool.linkedAssets.asset2.ticker,
          contractId: pool.linkedAssets.asset2.contractId,
          supply: "0",
          amountPerMint: "0",
        });
      }

      // Update URL with the pool ticker as a query parameter
      router.push(`/swap?ticker=${encodeURIComponent(pool.ticker)}`);
    },
    [router]
  );

  useEffect(() => {
    function handleClickOutside(): void {
      // Remove click outside handler since we no longer have dropdowns
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Check if we have a pool ticker in the URL
    const ticker = searchParams.get("ticker");
    if (ticker) {
      const pool = pools?.find((p) => p.ticker === ticker);
      if (pool) {
        handlePoolSelect(pool);
      }
    }
  }, [searchParams, pools, handlePoolSelect]);

  useEffect(() => {
    // Fetch and process the list of AMM pools
    const fetchPools = async (): Promise<void> => {
      try {
        console.log("Fetching AMM pools from API...");
        const res = await fetch(
          `${"https://devnet-core-api.glittr.fi"}/helper/assets`
        );
        const listContractRaw = await res.json();
        console.log("Raw contract data:", listContractRaw);

        const typedResponse = listContractRaw as ApiResponse;
        console.log("Typed response:", typedResponse);

        // Filter for AMM pools (contracts that start with "AMM-" or end with "-AMM")
        const pools = Object.keys(typedResponse.result)
          .filter((contractId: string) => {
            const contractInfo = typedResponse.result[contractId];
            console.log("Processing contract:", contractId, contractInfo);

            // Check if the contract has a ticker
            if (!contractInfo.ticker) {
              console.log("Skipping contract without ticker:", contractId);
              return false;
            }

            const isAmmPool =
              contractInfo.ticker.startsWith("AMM-") ||
              contractInfo.ticker.endsWith("-AMM");

            console.log("AMM pool check:", {
              ticker: contractInfo.ticker,
              isAmmPool,
              startsWithAMM: contractInfo.ticker.startsWith("AMM-"),
              endsWithAMM: contractInfo.ticker.endsWith("-AMM"),
            });

            return isAmmPool;
          })
          .reverse() // Reverse the order to show latest first
          .map((contractId: string) => {
            const contractInfo = typedResponse.result[contractId];

            // Check if the contract has the required structure
            if (
              !contractInfo.type?.collateralized?.assets ||
              !Array.isArray(contractInfo.type.collateralized.assets) ||
              contractInfo.type.collateralized.assets.length < 2
            ) {
              console.log(
                "Skipping pool without valid collateralized assets:",
                contractId
              );
              return null;
            }

            // Extract linked assets from the AMM contract
            const linkedAssets = contractInfo.type.collateralized.assets;

            // Verify both assets have required properties
            if (
              !linkedAssets[0].ticker ||
              !linkedAssets[0].contract_id ||
              !linkedAssets[1].ticker ||
              !linkedAssets[1].contract_id
            ) {
              console.log("Skipping pool with invalid asset data:", contractId);
              return null;
            }

            return {
              ticker: contractInfo.ticker ?? "",
              contractId: contractId,
              supply: `${contractInfo.total_supply}/${contractInfo.supply_cap}`,
              amountPerMint: "0", // AMM pools don't have amount_per_mint
              linkedAssets: {
                asset1: {
                  ticker: linkedAssets[0].ticker,
                  contractId: linkedAssets[0].contract_id,
                },
                asset2: {
                  ticker: linkedAssets[1].ticker,
                  contractId: linkedAssets[1].contract_id,
                },
              },
            } as ContractInfo;
          })
          .filter((pool): pool is ContractInfo => pool !== null);

        console.log("Final processed pools:", pools);
        setPools(pools);
      } catch (error) {
        console.error("Error fetching pools:", error);
        toast.error(
          "Error fetching pools: " + (error as Error).message,
          toastStyles
        );
      }
    };

    fetchPools();
  }, []);

  const handleSwap = async (): Promise<void> => {
    if (!account || !fromTokenSelected || !toTokenSelected || !selectedPool) {
      console.log("Missing required data:", {
        account,
        fromTokenSelected,
        toTokenSelected,
        selectedPool,
      });
      toast.error(
        "Please connect your wallet and select both tokens",
        toastStyles
      );
      return;
    }

    setLoading(true);
    try {
      console.log("Starting swap with:", {
        fromToken: fromTokenSelected,
        toToken: toTokenSelected,
        amount: fromTokenAmount,
      });

      // Get the AMM contract ID
      const contractParts = selectedPool.contractId.split(":");
      const contract: [number, number] = [
        parseInt(contractParts[0]),
        parseInt(contractParts[1]),
      ];

      // Get the input token contract ID
      const fromTokenParts = fromTokenSelected.contractId.split(":");
      const fromTokenContract: [number, number] = [
        parseInt(fromTokenParts[0]),
        parseInt(fromTokenParts[1]),
      ];

      // Get the output token contract ID
      const toTokenParts = toTokenSelected.contractId.split(":");
      const toTokenContract: [number, number] = [
        parseInt(toTokenParts[0]),
        parseInt(toTokenParts[1]),
      ];

      console.log("Contract details:", {
        ammContract: contract,
        fromTokenContract,
        toTokenContract,
      });

      // Get input token UTXOs
      const inputAssets = await client.getAssetUtxos(
        paymentAddress,
        `${fromTokenContract[0]}:${fromTokenContract[1]}`
      );

      if (inputAssets.length === 0) {
        throw new Error(
          `You do not have any ${fromTokenSelected.ticker} tokens`
        );
      }

      // Calculate total input amount
      const totalInput = inputAssets.reduce(
        (sum, item) => sum + parseInt(item.assetAmount),
        0
      );

      // Calculate amount to use for swap
      const swapAmount = parseFloat(fromTokenAmount);
      if (swapAmount > totalInput) {
        throw new Error(`Insufficient ${fromTokenSelected.ticker} balance`);
      }

      // Calculate change amount
      const changeAmount = totalInput - swapAmount;
      console.log("totalInput", totalInput);
      console.log("swapAmount", swapAmount);

      console.log("changeAmount", changeAmount);
      console.log("Min output amount:", minOutputAmount);

      // Create the swap transaction
      const swapTx: OpReturnMessage = {
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
              asset: fromTokenContract,
              output: 2,
              amount: changeAmount.toString(), // Change output
            },
          ],
        },
      };

      console.log("Swap transaction object:", swapTx);

      // Fetch non-Glittr UTXOs for fee calculation
      const utxos = await electrumFetchNonGlittrUtxos(client, paymentAddress);

      // Prepare inputs and outputs for the transaction
      const nonFeeInputs: BitcoinUTXO[] = inputAssets;
      const nonFeeOutputs: Output[] = [
        { script: txBuilder.compile(swapTx), value: 0 }, // OP_RETURN output
        { address: paymentAddress, value: 546 }, // Change output for input token
        { address: paymentAddress, value: 546 }, // Change output for output token
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
      const tokenResult = await signPsbt(tokenPsbt.toHex(), false, false);
      console.log("PSBT signing result:", tokenResult);

      if (!tokenResult?.signedPsbtHex) {
        throw new Error("Failed to sign transaction");
      }

      const finalizedPsbt = Psbt.fromHex(tokenResult.signedPsbtHex);
      finalizedPsbt.finalizeAllInputs();
      const txHex = finalizedPsbt.extractTransaction(true).toHex();
      console.log("Broadcasting transaction...");
      const txid = await client.broadcastTx(txHex);
      console.log("Transaction broadcasted with ID:", txid);
      setSwapTxLink(txid);

      // Show the confirming state in the modal
      setIsConfirmingSwap(true);
      setIsSwapModalOpen(true);

      console.log("Waiting for message confirmation...");
      while (true) {
        try {
          const message = await client.getGlittrMessageByTxId(txid);
          console.log("Message received:", message);
          // Update the confirming state once confirmed
          setIsConfirmingSwap(false);
          break;
        } catch (error) {
          console.log(error);
          console.log("Waiting for message confirmation...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      setLoading(false);
      toast.success("Swap completed successfully", toastStyles);
    } catch (error) {
      setLoading(false);
      setIsConfirmingSwap(false);
      console.error("Error performing swap:", error);
      toast.error(
        "Error performing swap: " + (error as Error).message,
        toastStyles
      );
    }
  };

  // Add effect to fetch balances when tokens are selected
  useEffect(() => {
    const fetchBalances = async (): Promise<void> => {
      if (!account || !fromTokenSelected || !toTokenSelected) return;

      try {
        // Fetch balances for both tokens
        const fromTokenUtxos = await client.getAssetUtxos(
          paymentAddress,
          `${parseInt(fromTokenSelected.contractId.slice(0, 7))}:${1}`
        );
        const toTokenUtxos = await client.getAssetUtxos(
          paymentAddress,
          `${parseInt(toTokenSelected.contractId.slice(0, 7))}:${1}`
        );

        // Calculate total balances
        const fromTokenTotal = fromTokenUtxos.reduce(
          (sum, item) => sum + parseInt(item.assetAmount),
          0
        );
        const toTokenTotal = toTokenUtxos.reduce(
          (sum, item) => sum + parseInt(item.assetAmount),
          0
        );

        setFromTokenBalance(fromTokenTotal.toString());
        setToTokenBalance(toTokenTotal.toString());
      } catch (error) {
        console.error("Error fetching token balances:", error);
        toast.error(
          "Error fetching token balances: " + (error as Error).message,
          toastStyles
        );
      }
    };

    fetchBalances();
  }, [account, fromTokenSelected, toTokenSelected, paymentAddress]);

  // Add effect to calculate output amount when input changes
  useEffect(() => {
    const calculateOutput = async () => {
      if (
        !selectedPool ||
        !fromTokenSelected ||
        !fromTokenAmount ||
        parseFloat(fromTokenAmount) <= 0
      ) {
        console.log("Skipping calculation - missing required data:", {
          selectedPool,
          fromTokenSelected,
          fromTokenAmount,
        });
        setCalculatedOutput(0);
        setMinOutputAmount(0);
        return;
      }

      setIsCalculating(true);
      try {
        console.log("Starting output calculation with:", {
          pool: selectedPool.ticker,
          fromToken: fromTokenSelected.ticker,
          amount: fromTokenAmount,
          slippage: `${slippage}%`,
        });

        const contractParts = selectedPool.contractId.split(":");
        const fromTokenParts = fromTokenSelected.contractId.split(":");

        const contract: [number, number] = [
          parseInt(contractParts[0]),
          parseInt(contractParts[1]),
        ];
        const fromToken: [number, number] = [
          parseInt(fromTokenParts[0]),
          parseInt(fromTokenParts[1]),
        ];

        console.log("Contract details:", {
          poolContract: contract,
          fromTokenContract: fromToken,
        });

        const outAmount = await calculateOutAmount(
          contract,
          fromToken,
          parseFloat(fromTokenAmount)
        );

        console.log("Calculation results:", {
          outputAmount: outAmount,
          slippage: `${slippage}%`,
          minOutput: Math.floor(outAmount - (outAmount * slippage) / 100),
        });

        setCalculatedOutput(outAmount);
        const minOutput = Math.floor(outAmount - (outAmount * slippage) / 100);
        setMinOutputAmount(minOutput);
        setToTokenAmount(outAmount.toString());
      } catch {
        // Silent catch - errors are already logged in calculateOutAmount
      } finally {
        setIsCalculating(false);
      }
    };

    calculateOutput();
  }, [fromTokenAmount, selectedPool, fromTokenSelected, slippage]);

  const handleBackToPools = (): void => {
    setShowPoolSelection(true);
    setSelectedPool(null);
    setFromTokenSelected(null);
    setToTokenSelected(null);
    router.push("/swap");
  };

  const handleSwapDirection = (): void => {
    if (fromTokenSelected && toTokenSelected) {
      const tempToken = fromTokenSelected;
      setFromTokenSelected(toTokenSelected);
      setToTokenSelected(tempToken);
      // Also swap the amounts and balances
      const tempAmount = fromTokenAmount;
      const tempBalance = fromTokenBalance;
      setFromTokenAmount(toTokenAmount);
      setToTokenAmount(tempAmount);
      setFromTokenBalance(toTokenBalance);
      setToTokenBalance(tempBalance);
    }
  };

  // Add deposit liquidity function
  const handleDepositLiquidity = async (): Promise<void> => {
    if (!account || !fromTokenSelected || !toTokenSelected || !selectedPool) {
      console.log("Missing required data for liquidity deposit:", {
        account,
        fromTokenSelected,
        toTokenSelected,
        selectedPool,
      });
      return;
    }
    try {
      console.log("Starting liquidity deposit to AMM...");
      const contractParts = selectedPool.contractId.split(":");
      const contract: [number, number] = [
        parseInt(contractParts[0]),
        parseInt(contractParts[1]),
      ];
      console.log("AMM Contract:", contract);

      // Get contract pair information from the AMM contract
      console.log("Fetching AMM contract info...");
      const contractInfo = await client.getGlittrMessage(
        contract[0],
        contract[1]
      );
      console.log("AMM Contract Info:", contractInfo);

      const firstContract: [number, number] = [
        parseInt(fromTokenSelected.contractId.slice(0, 7)),
        1,
      ];

      const secondContract: [number, number] = [
        parseInt(toTokenSelected.contractId.slice(0, 7)),
        1,
      ];

      console.log(`First contract: ${firstContract[0]}:${firstContract[1]}`);
      console.log(`Second contract: ${secondContract[0]}:${secondContract[1]}`);

      // Get your address' UTXO that contains the Assets
      console.log("Fetching asset UTXOs...");
      const inputAssetsFirst = await client.getAssetUtxos(
        paymentAddress,
        `${parseInt(fromTokenSelected.contractId.slice(0, 7))}:${1}`
      );
      const inputAssetsSecond = await client.getAssetUtxos(
        paymentAddress,
        `${parseInt(toTokenSelected.contractId.slice(0, 7))}:${1}`
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

      const txResp = txBuilder.customMessage(backendTx);
      console.log("Transaction response:", txResp);

      console.log("Creating transaction with client...");
      const tokenPsbt = await client.createTx({
        address: paymentAddress,
        tx: txResp,
        outputs: [],
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
      setBlockDepositeLink(txid);

      console.log("Waiting for message confirmation...");
      while (true) {
        try {
          const message = await client.getGlittrMessageByTxId(txid);
          console.log("Message received:", message);
          setBlockDepositeLink(message.block_tx);
          break;
        } catch (error) {
          console.log(error);
          console.log("Waiting for message confirmation...");
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry every 5 seconds
        }
      }
      setIsOpen(true);
      setDepositLoading(false);
      console.log("Liquidity deposit completed successfully");
      toast.success("Liquidity deposit completed successfully", toastStyles);
    } catch (error) {
      setDepositLoading(false);
      console.error("Error depositing liquidity:", error);
      toast.error(
        "Error depositing liquidity: " + (error as Error).message,
        toastStyles
      );
    }
  };

  return (
    <>
      {isOpen && (
        <MyModal
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          link={blockDepositeLink}
          blockTuble={blockDepositeLink}
          depositLink={blockDepositeLink}
          blockDepositeLink={blockDepositeLink}
        />
      )}
      {isSwapModalOpen && (
        <SwapModal
          isOpen={isSwapModalOpen}
          setIsOpen={setIsSwapModalOpen}
          txLink={swapTxLink}
          fromToken={fromTokenSelected?.ticker}
          toToken={toTokenSelected?.ticker}
          isConfirming={isConfirmingSwap}
        />
      )}
      <div className="min-h-screen bg-[#1e1c1f] text-white font-mono relative overflow-hidden">
        {/* Futuristic background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-40 h-40 border-l-2 border-t-2 border-[#8b5cf6]/20 opacity-30"></div>
          <div className="absolute bottom-0 right-0 w-60 h-60 border-r-2 border-b-2 border-[#8b5cf6]/20 opacity-30"></div>
          <div className="absolute top-1/4 -left-20 w-40 h-[200%] bg-[#8b5cf6]/5 rotate-45"></div>
          <div className="absolute bottom-1/3 -right-20 w-40 h-[200%] bg-[#8b5cf6]/5 rotate-45"></div>
        </div>

        {/* Main Content */}
        <main className="relative z-10 max-w-2xl mx-auto px-4 py-32">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              {!showPoolSelection && (
                <button
                  onClick={handleBackToPools}
                  className="flex items-center text-gray-400 hover:text-white transition-colors mr-4"
                >
                  <FaArrowLeft className="w-4 h-4 mr-2" />
                  Select Different Market
                </button>
              )}
              <h1 className="text-3xl font-bold tracking-wider text-[#ffe1ff]">
                {isDepositMode ? "DEPOSIT LIQUIDITY" : "SWAP"}
              </h1>
            </div>
            {!showPoolSelection && (
              <div className="flex items-center space-x-2 bg-[#131320] p-1 rounded-lg border border-[#333333]/50">
                <button
                  onClick={() => setIsDepositMode(false)}
                  className={`px-4 py-2 rounded-md transition-all duration-300 ${
                    !isDepositMode
                      ? "bg-[#8b5cf6] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Swap
                </button>
                <button
                  onClick={() => setIsDepositMode(true)}
                  className={`px-4 py-2 rounded-md transition-all duration-300 ${
                    isDepositMode
                      ? "bg-[#8b5cf6] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Deposit
                </button>
              </div>
            )}
          </div>

          {showPoolSelection ? (
            // Pool Selection View
            <div className="bg-[#0f0f1a]/70 backdrop-blur-sm rounded-2xl border border-[#333333]/50 shadow-xl shadow-[#000]/40 p-1 mb-8">
              <div
                className="p-4 pt-5 pb-5 rounded-t-xl overflow-hidden relative"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(30,30,50,0.6) 100%)",
                }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8b5cf6]/80 to-transparent"></div>
                <p className="text-white/90">
                  Select a liquidity pool to start swapping tokens. Each pool
                  represents a trading pair with its own liquidity.
                </p>
              </div>

              <div className="p-4">
                <div className="grid gap-4">
                  {pools?.map((pool) => (
                    <div
                      key={pool.contractId}
                      onClick={() => handlePoolSelect(pool)}
                      className="bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner cursor-pointer hover:bg-[#131320] transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center mr-3">
                            {pool.ticker.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-lg">
                              {pool.ticker}
                            </div>
                            <div className="text-sm text-gray-400">
                              {pool.linkedAssets ? (
                                <span>
                                  {pool.linkedAssets.asset1.ticker} /{" "}
                                  {pool.linkedAssets.asset2.ticker}
                                </span>
                              ) : (
                                "Loading assets..."
                              )}
                            </div>
                          </div>
                        </div>
                        <FaChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-[#0f0f1a]/70 backdrop-blur-sm rounded-2xl border border-[#333333]/50 shadow-xl shadow-[#000]/40 p-1 mb-8">
                <div
                  className="p-4 pt-5 pb-5 rounded-t-xl overflow-hidden relative"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(30,30,50,0.6) 100%)",
                  }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8b5cf6]/80 to-transparent"></div>
                  <p className="text-white/90">
                    {isDepositMode
                      ? `Deposit liquidity for ${selectedPool?.linkedAssets?.asset1.ticker} and ${selectedPool?.linkedAssets?.asset2.ticker} in the ${selectedPool?.ticker} pool.`
                      : `Swap ${selectedPool?.linkedAssets?.asset1.ticker} for ${selectedPool?.linkedAssets?.asset2.ticker} in the ${selectedPool?.ticker} pool.`}
                  </p>
                </div>

                {!isDepositMode && (
                  <>
                    {/* From Token Input */}
                    <div className="m-5 mb-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={fromTokenAmount}
                          onChange={(e) => setFromTokenAmount(e.target.value)}
                          className="w-2/3 bg-transparent text-3xl font-medium focus:outline-none"
                        />
                        <div className="flex items-center px-4 py-2 bg-[#131320] rounded-lg border border-[#333333]/50">
                          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center mr-2">
                            {fromTokenSelected?.ticker.charAt(0)}
                          </div>
                          <span>{fromTokenSelected?.ticker}</span>
                        </div>
                      </div>
                      <div className="flex justify-end text-gray-400 text-sm mt-2">
                        <span>Balance: {fromTokenBalance}</span>
                      </div>
                    </div>

                    {/* Swap Direction Button */}
                    <div className="flex justify-center -my-2 relative z-10">
                      <button
                        onClick={handleSwapDirection}
                        className="w-14 h-14 rounded-full bg-[#131320] border-4 border-[#0f0f1a] flex items-center justify-center shadow-lg hover:bg-[#1f1f30] transition-all duration-300"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] flex items-center justify-center">
                          <FiArrowDown className="w-6 h-6 text-white" />
                        </div>
                      </button>
                    </div>

                    {/* To Token Input */}
                    <div className="m-5 mt-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={toTokenAmount}
                          onChange={(e) => setToTokenAmount(e.target.value)}
                          className="w-2/3 bg-transparent text-3xl font-medium focus:outline-none"
                        />
                        <div className="flex items-center px-4 py-2 bg-[#131320] rounded-lg border border-[#333333]/50">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mr-2">
                            {toTokenSelected?.ticker.charAt(0)}
                          </div>
                          <span>{toTokenSelected?.ticker}</span>
                        </div>
                      </div>
                      <div className="flex justify-end text-gray-400 text-sm mt-2">
                        <span>Balance: {toTokenBalance}</span>
                      </div>
                    </div>

                    {/* Update Slippage Settings */}
                    <div className="m-5 mt-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">
                          Slippage Tolerance
                        </span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={slippage}
                            onChange={(e) =>
                              setSlippage(parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 bg-[#131320] text-white rounded border border-[#333333]/50"
                            min="0.1"
                            max="100"
                            step="0.1"
                          />
                          <span className="text-gray-400">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Add Swap Info */}
                    {isCalculating ? (
                      <div className="m-5 mt-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
                        <div className="flex items-center justify-center text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#8b5cf6] mr-2"></div>
                          Calculating...
                        </div>
                      </div>
                    ) : (
                      <div className="m-5 mt-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              Expected Output
                            </span>
                            <span className="text-white">
                              {calculatedOutput} {toTokenSelected?.ticker}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">
                              Minimum Received
                            </span>
                            <span className="text-white">
                              {minOutputAmount} {toTokenSelected?.ticker}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Price Impact</span>
                            <span className="text-white">
                              {(
                                (parseFloat(fromTokenAmount) /
                                  calculatedOutput) *
                                100
                              ).toFixed(2)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isDepositMode ? (
                  <>
                    {/* Deposit Mode UI */}
                    <div className="m-5 mt-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Deposit Amount</span>
                        <input
                          type="text"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-32 px-3 py-1 bg-[#131320] text-white rounded border border-[#333333]/50"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        Enter the amount of tokens you want to deposit for both
                        assets
                      </p>
                    </div>

                    {/* Deposit Button */}
                    {depositLoading ? (
                      <div className="flex mt-12 items-center justify-center cursor-pointer bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] hover:shadow-lg hover:shadow-[#8b5cf6]/20 w-full py-4 rounded-xl text-white font-bold text-lg tracking-wider transition-all duration-300 overflow-hidden group">
                        <div className="pr-2">DEPOSITING, PLEASE WAIT</div>
                        <div role="status">
                          <svg
                            aria-hidden="true"
                            className="size-6 text-gray-200 animate-spin fill-blue-600"
                            viewBox="0 0 100 101"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                              fill="currentColor"
                            />
                            <path
                              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                              fill="currentFill"
                            />
                          </svg>
                          <span className="sr-only">Loading...</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleDepositLiquidity}
                        disabled={!fromTokenSelected || !toTokenSelected}
                        className={`cursor-pointer w-full py-4 mt-6 rounded-xl text-white font-bold text-lg tracking-wider transition-all duration-300 overflow-hidden group ${
                          fromTokenSelected && toTokenSelected
                            ? "bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] hover:shadow-lg hover:shadow-[#8b5cf6]/20"
                            : "bg-gray-600 cursor-not-allowed"
                        }`}
                      >
                        DEPOSIT LIQUIDITY
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Swap Button */}
                    {loading ? (
                      <button
                        disabled
                        className="w-full py-4 mt-6 rounded-xl text-white font-bold text-lg tracking-wider bg-gradient-to-r from-[#8b5cf6]/80 to-[#6d4bb1]/80 flex items-center justify-center gap-3"
                      >
                        <span>SWAPPING...</span>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      </button>
                    ) : (
                      <button
                        onClick={handleSwap}
                        disabled={
                          !fromTokenSelected ||
                          !toTokenSelected ||
                          parseFloat(fromTokenAmount) <= 0
                        }
                        className={`cursor-pointer w-full py-4 mt-6 rounded-xl text-white font-bold text-lg tracking-wider transition-all duration-300 overflow-hidden group ${
                          fromTokenSelected &&
                          toTokenSelected &&
                          parseFloat(fromTokenAmount) > 0
                            ? "bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] hover:shadow-lg hover:shadow-[#8b5cf6]/20"
                            : "bg-gray-600 cursor-not-allowed"
                        }`}
                      >
                        SWAP
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Swap Status */}
              <div className="mt-4 text-center text-sm text-gray-400">
                {(!fromTokenSelected || !toTokenSelected) && (
                  <p>Please select both tokens to swap</p>
                )}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 mt-10 pb-8 text-center text-gray-400">
          <div className="flex justify-center space-x-6 mb-4">
            <a
              href="#"
              className="p-2 bg-[#131320] rounded-full hover:bg-[#1f1f30] border border-[#333333]/50 hover:border-[#8b5cf6]/50 transition-all duration-300"
            >
              <FaTwitter className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-2 bg-[#131320] rounded-full hover:bg-[#1f1f30] border border-[#333333]/50 hover:border-[#8b5cf6]/50 transition-all duration-300"
            >
              <FaTelegram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-2 bg-[#131320] rounded-full hover:bg-[#1f1f30] border border-[#333333]/50 hover:border-[#8b5cf6]/50 transition-all duration-300"
            >
              <FaGlobe className="w-5 h-5" />
            </a>
          </div>
          <p className="text-sm tracking-wider opacity-70">
            © 2025 Glittr DEX. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}

export default function Swap(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#1e1c1f] text-white font-mono flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8b5cf6] mx-auto mb-4"></div>
            <p className="text-[#ffe1ff]">Loading...</p>
          </div>
        </div>
      }
    >
      <SwapContent />
    </Suspense>
  );
}
