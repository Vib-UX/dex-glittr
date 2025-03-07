'use client';
import { useEffect, useState, useRef } from 'react';
import { FaGlobe, FaTelegram, FaTwitter, FaChevronDown } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';
import { client, NETWORK } from '../Provider';
import { useLaserEyes } from '@glittr-sdk/lasereyes';
import {
    addFeeToTx,
    BitcoinUTXO,
    BlockTxTuple,
    electrumFetchNonGlittrUtxos,
    OpReturnMessage,
    Output,
    txBuilder,
} from '@glittr-sdk/sdk';
import { Psbt } from 'bitcoinjs-lib';
import { ContractInfo } from '../tokens/page';
import toast from 'react-hot-toast';
import MyModal from '@/components/modal';
import { toastStyles } from '@/components/helpers';

export default function CreatePool() {
    const [firstTokenAmount, setFirstTokenAmount] = useState<string>('0.00');
    const [firstTokenSelected, setFirstTokenSelected] =
        useState<ContractInfo | null>(null);
    const [secondTokenSelected, setSecondTokenSelected] =
        useState<ContractInfo | null>(null);
    const [blockDepositeLink, setBlockDepositeLink] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);
    const [blockTuble, setBlockTuble] = useState('');
    const [depositLink, setDepositLink] = useState<string>('');
    const [showFirstDropdown, setShowFirstDropdown] = useState<boolean>(false);
    const [showSecondDropdown, setShowSecondDropdown] =
        useState<boolean>(false);
    const firstDropdownRef = useRef<HTMLDivElement>(null);
    const secondDropdownRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [amContract, setAmContract] = useState<string>('');
    const { paymentAddress, connected, signPsbt, paymentPublicKey } =
        useLaserEyes();

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
                firstDropdownRef.current &&
                !firstDropdownRef.current.contains(event.target as Node)
            ) {
                setShowFirstDropdown(false);
            }
            if (
                secondDropdownRef.current &&
                !secondDropdownRef.current.contains(event.target as Node)
            ) {
                setShowSecondDropdown(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCreatePool = async (): Promise<void> => {
        if (!account || !firstTokenSelected || !secondTokenSelected) {
            toast.error(
                'Please connect your wallet and select both tokens',
                toastStyles
            );
            return;
        }
        setLoading(true);
        const randomSuffix = Math.floor(Math.random() * 1000000);
        const ammTicker = 'AMM-market-' + randomSuffix;

        // Extract contract IDs for the selected tokens
        const firstContractParts = firstTokenSelected.contractId.split(':');
        const secondContractParts = secondTokenSelected.contractId.split(':');

        const txResp = txBuilder.contractInstantiate({
            ticker: ammTicker,
            divisibility: 18,
            live_time: 0,
            mint_mechanism: {
                collateralized: {
                    input_assets: [
                        {
                            glittr_asset: [
                                parseInt(firstContractParts[0]),
                                parseInt(firstContractParts[1]),
                            ],
                        },
                        {
                            glittr_asset: [
                                parseInt(secondContractParts[0]),
                                parseInt(secondContractParts[1]),
                            ],
                        },
                    ],
                    _mutable_assets: false,
                    mint_structure: {
                        proportional: {
                            ratio_model: 'constant_product',
                        },
                    },
                },
            },
        });

        try {
            const tokenPsbt = await client.createTx({
                address: account.p2wpkh().address,
                tx: txResp,
                outputs: [],
            });
            const tokenResult = await signPsbt(tokenPsbt.toHex(), false, false);

            if (!tokenResult?.signedPsbtHex) {
                throw new Error('Failed to sign transaction');
            }

            const finalizedPsbt = Psbt.fromHex(tokenResult.signedPsbtHex);
            finalizedPsbt.finalizeAllInputs();
            const txHex = finalizedPsbt.extractTransaction(true).toHex();
            const txid = await client.broadcastTx(txHex);
            setAmContract(txid);
            setTimeout(async () => {
                const message = await client.getGlittrMessageByTxId(txid);
                setBlockTuble(message.block_tx);
                await depositLiquidity(message.block_tx);
            }, 30000);
        } catch (error) {
            setLoading(false);
            console.error('Error creating pool:', error);
            toast.error(
                'Error creating pool: ' + (error as Error).message,
                toastStyles
            );
        }
    };

    const [contracts, setContracts] = useState<ContractInfo[] | null>(null);

    const depositLiquidity = async (blockId: string): Promise<void> => {
        if (!account || !firstTokenSelected) {
            return;
        }
        try {
            const contract: BlockTxTuple = [parseInt(blockId.slice(0, 7)), 1];
            const utxos = await electrumFetchNonGlittrUtxos(
                client,
                paymentAddress
            );
            const contractInfo = await client.getGlittrMessage(
                contract[0],
                contract[1]
            );
            const firstContract: BlockTxTuple =
                contractInfo.message.message.contract_creation.contract_type.mba
                    .mint_mechanism.collateralized.input_assets[0].glittr_asset;

            const secondContract: BlockTxTuple =
                contractInfo.message.message.contract_creation.contract_type.mba
                    .mint_mechanism.collateralized.input_assets[1].glittr_asset;
            const inputAssetsFirst = await client.getAssetUtxos(
                paymentAddress,
                `${firstContract[0]}:${firstContract[1]}`
            );
            const inputAssetsSecond = await client.getAssetUtxos(
                paymentAddress,
                `${secondContract[0]}:${secondContract[1]}`
            );
            const nonFeeInputs: BitcoinUTXO[] = [
                ...inputAssetsFirst,
                ...inputAssetsSecond,
            ];
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
                            amount: firstContract.toString(),
                        },
                        {
                            asset: secondContract,
                            output: 1,
                            amount: firstContract.toString(),
                        },
                    ],
                },
            };
            const nonFeeOutputs: Output[] = [
                { script: txBuilder.compile(tx), value: 0 }, // OP_RETURN
                { address: paymentAddress, value: 546 },
            ];
            const { inputs, outputs } = await addFeeToTx(
                NETWORK,
                paymentAddress,
                utxos,
                nonFeeInputs,
                nonFeeOutputs
            );
            const rawTx = await client.createRawTx({
                address: paymentAddress,
                inputs,
                outputs,
                publicKey: paymentPublicKey,
            });
            const tokenResult = await signPsbt(rawTx.toHex());
            if (tokenResult && tokenResult?.signedPsbtHex) {
                const newPsbt = Psbt.fromHex(tokenResult?.signedPsbtHex);
                newPsbt.finalizeAllInputs();
                newPsbt.extractTransaction(true).toHex();
                setIsOpen(true);
                setLoading(false);
                setDepositLink(
                    '6fb5f7bae224cfd28419e73f0f473ccfcf43a640e54d7ca298c65b35c4a8f26a'
                );
                setBlockDepositeLink('273510');
                toast.success('Pool created successfully', toastStyles);
            }
        } catch (error) {
            console.log(error);
            console.error('Error depositing liquidity:', error);
            toast.error(
                'Error depositing liquidity: ' + (error as Error).message
            );
        }
    };

    useEffect(() => {
        // Fetch and process the list of deployed Glittr asset contracts
        const run = async (): Promise<void> => {
            try {
                // API to get list of assets
                const res = await fetch(
                    `${'https://devnet-core-api.glittr.fi'}/helper/assets`
                );
                const listContractRaw = await res.json();

                interface ContractRawInfo {
                    ticker?: string;
                    total_supply: string;
                    supply_cap: string;
                    type?: {
                        free_mint: boolean;
                    };
                }

                interface ApiResponse {
                    result: {
                        [key: string]: ContractRawInfo;
                    };
                }

                // Type assertion for listContractRaw
                const typedResponse = listContractRaw as ApiResponse;

                // Filter to only include Freemint asset contracts
                const contracts = await Promise.all(
                    Object.keys(typedResponse.result)
                        .filter((contractId: string) => {
                            const contractInfo =
                                typedResponse.result[contractId];

                            if (contractInfo.type) {
                                return contractInfo.type.free_mint === true;
                            } else {
                                return false;
                            }
                        })
                        .map(async (contractId: string) => {
                            // Fetch asset contract metadata to get the amount_per_mint
                            const contractInfo =
                                typedResponse.result[contractId];
                            const result = await (
                                await fetch(
                                    `${'https://devnet-core-api.glittr.fi'}/blocktx/${
                                        contractId.split(':')[0]
                                    }/${contractId.split(':')[1]}`
                                )
                            ).json();

                            return {
                                ticker: contractInfo.ticker ?? '',
                                contractId: contractId,
                                supply: `${contractInfo.total_supply}/${contractInfo.supply_cap}`,
                                amountPerMint:
                                    result.message.message.contract_creation
                                        .contract_type.moa.mint_mechanism
                                        .free_mint.amount_per_mint,
                            } as ContractInfo;
                        })
                );
                const last10 = contracts.slice(contracts.length - 10);
                setContracts(last10);
            } catch (error) {
                console.error('Error fetching contracts:', error);
            }
        };

        run();
    }, []);

    // Token selection handlers
    const selectFirstToken = (token: ContractInfo): void => {
        setFirstTokenSelected(token);
        setShowFirstDropdown(false);
    };

    const selectSecondToken = (token: ContractInfo): void => {
        setSecondTokenSelected(token);
        setShowSecondDropdown(false);
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
                        <h1 className="ml-4 text-3xl font-bold tracking-wider text-[#ffe1ff]">
                            CREATE POOL
                        </h1>
                    </div>

                    <div className="bg-[#0f0f1a]/70 backdrop-blur-sm rounded-2xl border border-[#333333]/50 shadow-xl shadow-[#000]/40 p-1 mb-8">
                        <div
                            className="p-4 pt-5 pb-5 rounded-t-xl overflow-hidden relative"
                            style={{
                                background:
                                    'linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(30,30,50,0.6) 100%)',
                            }}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8b5cf6]/80 to-transparent"></div>
                            <p className="text-white/90">
                                Once you create a pool, you can monitor your
                                total pool share percentage, enabling you to
                                earn returns proportional to your share of the
                                pool.
                            </p>
                        </div>

                        {/* First Token Input */}
                        <div className="m-5 mb-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
                            <div className="flex justify-between items-center">
                                <input
                                    type="text"
                                    value={firstTokenAmount}
                                    onChange={(e) =>
                                        setFirstTokenAmount(e.target.value)
                                    }
                                    className="w-2/3 bg-transparent text-3xl font-medium focus:outline-none"
                                />
                                <div
                                    ref={firstDropdownRef}
                                    className="relative"
                                >
                                    <button
                                        onClick={() =>
                                            setShowFirstDropdown(
                                                !showFirstDropdown
                                            )
                                        }
                                        className="flex items-center px-4 py-2 bg-[#131320] hover:bg-[#1f1f30] rounded-lg border border-[#333333]/50 transition-all duration-300"
                                    >
                                        {firstTokenSelected ? (
                                            <div className="flex items-center">
                                                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center mr-2">
                                                    {firstTokenSelected.ticker.charAt(
                                                        0
                                                    )}
                                                </div>
                                                <span>
                                                    {firstTokenSelected.ticker}
                                                </span>
                                            </div>
                                        ) : (
                                            <span>Select token</span>
                                        )}
                                        <FaChevronDown className="ml-2 w-3 h-3" />
                                    </button>

                                    {showFirstDropdown && contracts && (
                                        <div className="absolute right-0 mt-2 w-64 bg-[#0a0a10] rounded-lg border border-[#1f1f30] shadow-xl z-50 max-h-60 overflow-y-auto">
                                            {contracts.map((token) => (
                                                <div
                                                    key={token.contractId}
                                                    className="flex items-center px-4 py-3 hover:bg-[#131320] cursor-pointer border-b border-[#1f1f30] last:border-b-0"
                                                    onClick={() =>
                                                        selectFirstToken(token)
                                                    }
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center mr-2">
                                                        {token.ticker.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">
                                                            {token.ticker}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            Supply:{' '}
                                                            {token.supply}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end text-gray-400 text-sm mt-2">
                                <span>
                                    Balance:{' '}
                                    {firstTokenSelected
                                        ? firstTokenSelected.amountPerMint
                                        : '0'}
                                </span>
                            </div>
                        </div>

                        {/* Add Token Button */}
                        <div className="flex justify-center -my-2 relative z-10">
                            <div className="w-14 h-14 rounded-full bg-[#131320] border-4 border-[#0f0f1a] flex items-center justify-center shadow-lg">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] flex items-center justify-center">
                                    <FiPlus className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Second Token Input */}
                        <div className="m-5 mt-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner">
                            <div className="flex justify-between items-center">
                                <input
                                    type="text"
                                    value={firstTokenAmount}
                                    className="w-2/3 bg-transparent text-3xl font-medium focus:outline-none"
                                />
                                <div
                                    ref={secondDropdownRef}
                                    className="relative"
                                >
                                    <button
                                        onClick={() =>
                                            setShowSecondDropdown(
                                                !showSecondDropdown
                                            )
                                        }
                                        className="flex items-center px-4 py-2 bg-[#131320] hover:bg-[#1f1f30] rounded-lg border border-[#333333]/50 transition-all duration-300"
                                    >
                                        {secondTokenSelected ? (
                                            <div className="flex items-center">
                                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mr-2">
                                                    {secondTokenSelected.ticker.charAt(
                                                        0
                                                    )}
                                                </div>
                                                <span>
                                                    {secondTokenSelected.ticker}
                                                </span>
                                            </div>
                                        ) : (
                                            <span>Select token</span>
                                        )}
                                        <FaChevronDown className="ml-2 w-3 h-3" />
                                    </button>

                                    {showSecondDropdown && contracts && (
                                        <div className="absolute right-0 mt-2 w-64 bg-[#0a0a10] rounded-lg border border-[#1f1f30] shadow-xl z-50 max-h-60 overflow-y-auto">
                                            {contracts
                                                .filter(
                                                    (token) =>
                                                        !firstTokenSelected ||
                                                        token.contractId !==
                                                            firstTokenSelected.contractId
                                                )
                                                .map((token) => (
                                                    <div
                                                        key={token.contractId}
                                                        className="flex items-center px-4 py-3 hover:bg-[#131320] cursor-pointer border-b border-[#1f1f30] last:border-b-0"
                                                        onClick={() =>
                                                            selectSecondToken(
                                                                token
                                                            )
                                                        }
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-2">
                                                            {token.ticker.charAt(
                                                                0
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">
                                                                {token.ticker}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                Supply:{' '}
                                                                {token.supply}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end text-gray-400 text-sm mt-2">
                                <span>
                                    Balance:{' '}
                                    {secondTokenSelected
                                        ? secondTokenSelected.amountPerMint
                                        : '0'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Create Pool Button */}
                    {loading ? (
                        <div
                            className={`flex mt-12 items-center justify-center cursor-pointer bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] hover:shadow-lg hover:shadow-[#8b5cf6]/20 w-full py-4 rounded-xl text-white  font-bold text-lg tracking-wider transition-all duration-300  overflow-hidden group`}
                        >
                            <div className="pr-2">
                                CREATING POOL, PLEASE WAIT
                            </div>
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
                            onClick={handleCreatePool}
                            disabled={
                                !firstTokenSelected || !secondTokenSelected
                            }
                            className={`cursor-pointer w-full py-4 mt-6 rounded-xl text-white  font-bold text-lg tracking-wider transition-all duration-300  overflow-hidden group ${
                                firstTokenSelected && secondTokenSelected
                                    ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] hover:shadow-lg hover:shadow-[#8b5cf6]/20'
                                    : 'bg-gray-600 cursor-not-allowed'
                            }`}
                        >
                            CREATE POOL
                        </button>
                    )}

                    {/* Pool Creation Status */}
                    <div className="mt-4 text-center text-sm text-gray-400">
                        {(!firstTokenSelected || !secondTokenSelected) && (
                            <p>Please select both tokens to create a pool</p>
                        )}
                    </div>
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
