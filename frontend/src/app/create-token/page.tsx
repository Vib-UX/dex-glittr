'use client';
import { txBuilder } from '@glittr-sdk/sdk';
import { useState } from 'react';
import { FaGlobe, FaTelegram, FaTwitter } from 'react-icons/fa';
import { client, NETWORK } from '../Provider';
import { useLaserEyes } from '@glittr-sdk/lasereyes';
import { Psbt } from 'bitcoinjs-lib';
import toast from 'react-hot-toast';
import useGlobalStore from '@/store';
export default function CreateToken() {
    const { paymentAddress, connected, signPsbt, paymentPublicKey } =
        useLaserEyes();
    const [tokenName, setTokenName] = useState('');
    const [supply, setSupply] = useState('');
    const { tokens } = useGlobalStore();
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
        try {
            if (!account) {
                return;
            }
            const tokenTx = txBuilder.contractInstantiate({
                ticker: tokenName,
                divisibility: 0,
                live_time: 0,
                supply_cap: supply || '100000',
                mint_mechanism: {
                    free_mint: {
                        amount_per_mint: '10',
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
                throw new Error('Failed to sign YES transaction');
            }

            const finalizedPsbt = Psbt.fromHex(tokenResult.signedPsbtHex);
            finalizedPsbt.finalizeAllInputs();
            const txHex = finalizedPsbt.extractTransaction(true).toHex();
            const txid = await client.broadcastTx(txHex);
            console.log('contract created:', txid);
            toast.success('Token created successfully');
            useGlobalStore.getState().setTokens({
                id: tokens.length + 1,
                icon: '🔥',
                name: tokenName,
                tokenId: String(tokens.length + 1),
                minted: '0',
                divisibility: 0,
                maxSupply: '100,000',
                timestamp: new Date().toISOString(),
                link: `https://explorer.glittr.fi/tx/${txid}`,
            });
        } catch (e) {
            toast.error('Failed to create token');
            console.log(e);
        }
    };
    return (
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
                    <h1 className="ml-4 text-3xl font-bold tracking-wider text-[#ffe1ff]">
                        CREATE TOKEN
                    </h1>
                </div>

                <div className="bg-[#0f0f1a]/70 backdrop-blur-sm rounded-2xl border border-[#333333]/50 shadow-xl shadow-[#000]/40 p-1 mb-8 overflow-hidden">
                    <div
                        className="p-4 pt-5 pb-5 rounded-t-xl overflow-hidden relative"
                        style={{
                            background:
                                'linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(30,30,50,0.6) 100%)',
                        }}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8b5cf6]/80 to-transparent"></div>
                        <p className="text-white/90">
                            Once you create a token, you can monitor your total
                            pool share percentage, enabling you to earn returns
                            proportional to your share of the pool.
                        </p>
                    </div>

                    {/* First Token Input */}
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
                </div>

                {/* Create Pool Button */}
                <button
                    disabled={!tokenName}
                    onClick={handleCreateToken}
                    className="w-full py-4 mt-6 cursor-pointer rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] text-white font-bold text-lg tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-[#8b5cf6]/20 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 w-1/3 h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-[400%] transition-transform duration-1000"></div>
                    CREATE TOKEN
                </button>
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
                    © 2025 RUNES DEX. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
