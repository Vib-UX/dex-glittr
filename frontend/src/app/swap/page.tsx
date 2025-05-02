"use client";
import React, { useEffect, useState, useRef } from "react";
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
import { BlockTxTuple, OpReturnMessage, txBuilder } from "@glittr-sdk/sdk";
import { Psbt } from "bitcoinjs-lib";

import toast from "react-hot-toast";
import MyModal from "@/components/modal";
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

export default function Swap(): React.ReactElement {
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
  const [isOpen, setIsOpen] = useState(false);
  const [blockTuble, setBlockTuble] = useState("");
  const [depositLink, setDepositLink] = useState<string>("");
  const [showFromDropdown, setShowFromDropdown] = useState<boolean>(false);
  const [showToDropdown, setShowToDropdown] = useState<boolean>(false);
  const fromDropdownRef = useRef<HTMLDivElement>(null);
  const toDropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [amContract, setAmContract] = useState<string>("");
  const { paymentAddress, connected, signPsbt, paymentPublicKey } =
    useLaserEyes();
  const [fromTokenBalance, setFromTokenBalance] = useState<string>("0");
  const [toTokenBalance, setToTokenBalance] = useState<string>("0");

  // Properly typed account object
  type Account = {
    p2wpkh: () => { address: string };
    network: typeof NETWORK;
    p2pkh: () => { address: string };
    p2tr: () => { address: string };
    publicKey: string;
  } | null;

  const account: Account =
    connected && paymentPublicKey && paymentAddress
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        fromDropdownRef.current &&
        !fromDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFromDropdown(false);
      }
      if (
        toDropdownRef.current &&
        !toDropdownRef.current.contains(event.target as Node)
      ) {
        setShowToDropdown(false);
      }
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
  }, [searchParams, pools]);

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

        // Filter for AMM pools (contracts that start with "AMM-")
        const pools = Object.keys(typedResponse.result)
          .filter((contractId: string) => {
            const contractInfo = typedResponse.result[contractId];
            console.log("Processing contract:", contractId, contractInfo);
            return contractInfo.ticker?.startsWith("AMM-") === true;
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
    if (!account || !fromTokenSelected || !toTokenSelected) {
      console.log("Missing required data:", {
        account,
        fromTokenSelected,
        toTokenSelected,
      });
      toast.error(
        "Please connect your wallet and select both tokens",
        toastStyles
      );
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement swap logic here
      console.log("Starting swap with:", {
        fromToken: fromTokenSelected,
        toToken: toTokenSelected,
        amount: fromTokenAmount,
      });

      // Example swap transaction structure
      const backendTx: OpReturnMessage = {
        contract_call: {
          contract: [0, 0], // TODO: Get actual contract ID
          call_type: {
            swap: {
              pointer: 1,
            },
          },
        },
        transfer: {
          transfers: [
            {
              asset: [0, 0], // TODO: Get actual asset ID
              output: 1,
              amount: fromTokenAmount,
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
      setDepositLink(txid);

      console.log("Waiting for message confirmation...");
      let confirmedBlockTx = "";
      while (true) {
        try {
          const message = await client.getGlittrMessageByTxId(txid);
          console.log("Message received:", message);
          console.log("Block TX value:", message.block_tx);
          confirmedBlockTx = message.block_tx;
          setBlockDepositeLink(message.block_tx);
          break;
        } catch (error) {
          console.log(error);
          console.log("Waiting for message confirmation...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }

      setIsOpen(true);
      setLoading(false);
      toast.success("Swap completed successfully", toastStyles);
    } catch (error) {
      setLoading(false);
      console.error("Error performing swap:", error);
      toast.error(
        "Error performing swap: " + (error as Error).message,
        toastStyles
      );
    }
  };

  const handlePoolSelect = (pool: ContractInfo): void => {
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

  return (
    <>
      {isOpen && (
        <MyModal
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          link={amContract}
          blockTuble={blockTuble}
          depositLink={depositLink}
          blockDepositeLink={blockDepositeLink}
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
          <div className="flex items-center mb-8">
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
              SWAP
            </h1>
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
                    Swap {selectedPool?.linkedAssets?.asset1.ticker} for{" "}
                    {selectedPool?.linkedAssets?.asset2.ticker} in the{" "}
                    {selectedPool?.ticker} pool.
                  </p>
                </div>

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
              </div>

              {/* Swap Button */}
              {loading ? (
                <div className="flex mt-12 items-center justify-center cursor-pointer bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] hover:shadow-lg hover:shadow-[#8b5cf6]/20 w-full py-4 rounded-xl text-white font-bold text-lg tracking-wider transition-all duration-300 overflow-hidden group">
                  <div className="pr-2">SWAPPING, PLEASE WAIT</div>
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
                  onClick={handleSwap}
                  disabled={!fromTokenSelected || !toTokenSelected}
                  className={`cursor-pointer w-full py-4 mt-6 rounded-xl text-white font-bold text-lg tracking-wider transition-all duration-300 overflow-hidden group ${
                    fromTokenSelected && toTokenSelected
                      ? "bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] hover:shadow-lg hover:shadow-[#8b5cf6]/20"
                      : "bg-gray-600 cursor-not-allowed"
                  }`}
                >
                  SWAP
                </button>
              )}

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
