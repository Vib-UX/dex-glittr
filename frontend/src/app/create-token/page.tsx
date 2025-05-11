"use client";
import { toastStyles } from "@/components/helpers";
import TokenModal from "@/components/tokenModal";
import useGlobalStore from "@/store";
import { useLaserEyes } from "@glittr-sdk/lasereyes";
import { txBuilder } from "@glittr-sdk/sdk";
import { Psbt } from "bitcoinjs-lib";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaGlobe, FaTelegram, FaTwitter } from "react-icons/fa";
import { client, NETWORK } from "../Provider";

type ContractInfo = {
  ticker: string;
  contractId: string;
  supply: string;
  amountPerMint: string;
};
export default function CreateToken() {
  const { paymentAddress, connected, signPsbt, paymentPublicKey } =
    useLaserEyes();
  const [tokenName, setTokenName] = useState("");
  const [tokenLoader, setTokenLoader] = useState(false);
  const [assetLink, setAssetLink] = useState("");
  const [assetLinkContract, setAssetLinkContract] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mintSupply, setMintSupply] = useState("");
  const [supply, setSupply] = useState("");
  const { tokens } = useGlobalStore();
  const [mintingState, setMintingState] = useState(false);
  const [expLink, setExpLink] = useState("");
  const account =
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
  const handleCreateToken = async () => {
    setTokenLoader(true);
    try {
      if (!account) {
        return;
      }
      const tokenTx = txBuilder.contractInstantiate({
        ticker: tokenName,
        divisibility: 18,
        live_time: 0,
        supply_cap: supply || "100000",
        mint_mechanism: {
          free_mint: {
            amount_per_mint: mintSupply,
            supply_cap: supply,
          },
        },
      });

      const tokenPsbt = await client.createTx({
        address: account.p2wpkh().address,
        tx: tokenTx,
        outputs: [],
      });

      const tokenResult = await signPsbt(tokenPsbt.toHex(), false, false);
      if (!tokenResult?.signedPsbtHex) {
        throw new Error("Failed to sign transaction");
      }

      const finalizedPsbt = Psbt.fromHex(tokenResult.signedPsbtHex);
      finalizedPsbt.finalizeAllInputs();
      const txHex = finalizedPsbt.extractTransaction(true).toHex();
      const txid = await client.broadcastTx(txHex);
      setAssetLinkContract(txid);
      toast.success("Token created successfully", toastStyles);
      useGlobalStore.getState().setTokens({
        id: tokens.length + 1,
        icon: "🔥",
        name: tokenName,
        tokenId: String(tokens.length + 1),
        minted: "0",
        divisibility: 0,
        maxSupply: "100,000",
        timestamp: new Date().toISOString(),
        link: `https://explorer.glittr.fi/tx/${txid}`,
      });
      setTokenLoader(false);
      handleMinting();
    } catch (e) {
      setTokenLoader(false);
      toast.error("Failed to create token", toastStyles);
      console.log(e);
    }
  };
  const run = async () => {
    const res = await fetch(
      `${"https://devnet-core-api.glittr.fi"}/helper/assets`
    );
    const listContractRaw = await res.json();
    const contracts = await Promise.all(
      Object.keys(listContractRaw.result)
        .filter((contractId: string) => {
          const contractInfo = listContractRaw.result[contractId];

          if (contractInfo.type) {
            return contractInfo.type.free_mint == true;
          } else {
            return false;
          }
        })
        .map(async (contractId: string) => {
          const contractInfo = listContractRaw.result[contractId];
          const result = await (
            await fetch(
              `${"https://devnet-core-api.glittr.fi"}/blocktx/${
                contractId.split(":")[0]
              }/${contractId.split(":")[1]}`
            )
          ).json();
          return {
            ticker: contractInfo.ticker ?? "",
            contractId: contractId,
            supply: `${contractInfo.total_supply}/${contractInfo.supply_cap}`,
            amountPerMint:
              result.message.message.contract_creation.contract_type.moa
                .mint_mechanism.free_mint.amount_per_mint,
          };
        })
    );
    const filteredContracts = contracts.filter(
      (elem) => elem.ticker.toLowerCase() === tokenName.toLowerCase()
    );
    setAssetLink(filteredContracts[0].contractId);

    return filteredContracts;
  };

  const handleMinting = async () => {
    setMintingState(true);
    setTimeout(async () => {
      const con = await run();
      await mint(con[0]);
    }, 30000);
  };

  const mint = async (contract: ContractInfo) => {
    try {
      if (!contract.contractId) return;
      const [blockContractId, txContractId] = contract.contractId
        .split(":")
        .map(Number);

      // Construct a Glittr asset mint message
      const tx = txBuilder.contractCall({
        contract: [blockContractId, txContractId],
        call_type: {
          mint: { pointer: 0 },
        },
      });
      console.log("tx", tx);

      // This is a Glittr sdk helper function
      // to construct PSBT with embedded Glittr message in the OP_RETURN
      const psbt = await client.createTx({
        address: paymentAddress,
        tx,
        outputs: [{ address: paymentAddress, value: 546 }],
        publicKey: paymentPublicKey,
      });

      // Sign the PSBT
      const result = await signPsbt(psbt.toHex());

      if (result && result?.signedPsbtHex) {
        const newPsbt = Psbt.fromHex(result?.signedPsbtHex);
        newPsbt.finalizeAllInputs();
        const newHex = newPsbt.extractTransaction(true).toHex();

        // This is a Glittr sdk helper function
        // to broadcast bitcoin transaction
        const id = await client.broadcastTx(newHex);
        setExpLink(id);
        toast.success("Tokens minted successfully", toastStyles);
        setIsOpen(true);
        setMintingState(false);
      }
    } catch (error) {
      console.error(error);
      setMintingState(false);
    }
  };
  return (
    <>
      {isOpen && (
        <TokenModal
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          link={expLink}
          assetLinkContract={assetLinkContract}
          assetLink={assetLink}
        />
      )}
      <div className="min-h-screen bg-[#1e1c1f] text-white font-mono relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-40 h-40 border-l-2 border-t-2 border-[#8b5cf6]/20 opacity-30"></div>
          <div className="absolute bottom-0 right-0 w-60 h-60 border-r-2 border-b-2 border-[#8b5cf6]/20 opacity-30"></div>
          <div className="absolute top-1/4 -left-20 w-40 h-[200%] bg-[#8b5cf6]/5 rotate-45"></div>
          <div className="absolute bottom-1/3 -right-20 w-40 h-[200%] bg-[#8b5cf6]/5 rotate-45"></div>
        </div>

        <main className="relative z-10 max-w-2xl mx-auto px-4 py-32">
          <div className="flex items-center mb-8">
            <h1 className="ml-4 text-3xl font-bold tracking-wider text-[#ffe1ff]">
              CREATE TOKEN
            </h1>
          </div>
          <div></div>

          <div className="bg-[#0f0f1a]/70 backdrop-blur-sm rounded-2xl border border-[#333333]/50 shadow-xl shadow-[#000]/40 p-1 mb-8 overflow-hidden">
            <div
              className="p-4 pt-5 pb-5 rounded-t-xl overflow-hidden relative"
              style={{
                background:
                  "linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(30,30,50,0.6) 100%)",
              }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8b5cf6]/80 to-transparent"></div>
              <p className="text-white/90">
                Once you create a token, you can monitor your total pool share
                percentage, enabling you to earn returns proportional to your
                share of the pool.
              </p>
            </div>

            <div className="m-5 mb-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
              <input
                type="text"
                placeholder="Enter token name*"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-2/3 bg-transparent text-xl font-medium focus:outline-none"
              />
            </div>
            <div className="m-5 mb-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
              <input
                type="text"
                placeholder="Supply cap"
                value={supply}
                onChange={(e) => setSupply(e.target.value)}
                className="w-2/3 bg-transparent text-xl font-medium focus:outline-none"
              />
            </div>
            <div className="m-5 mb-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
              <input
                type="number"
                placeholder="Amount per mint*"
                value={mintSupply}
                onChange={(e) => setMintSupply(e.target.value)}
                className="w-2/3 bg-transparent text-xl font-medium focus:outline-none"
              />
            </div>
          </div>

          <button
            disabled={!tokenName || mintingState || tokenLoader}
            onClick={handleCreateToken}
            className="w-full py-4 mt-6 cursor-pointer rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] text-white font-bold text-lg tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-[#8b5cf6]/20 relative overflow-hidden group"
          >
            <div className="absolute inset-0 w-1/3 h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-[400%] transition-transform duration-1000"></div>
            {mintingState ? (
              <div className="flex items-center gap-x-2 justify-center">
                <div>MINTING TOKEN, PLEASE WAIT</div>
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
            ) : tokenLoader ? (
              <div className="flex items-center gap-x-2 justify-center">
                <div>CREATING TOKEN, PLEASE WAIT</div>
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
              "CREATE TOKEN AND MINT"
            )}
          </button>
        </main>

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
