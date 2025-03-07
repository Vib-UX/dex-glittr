'use client';

import { useEffect, useState } from 'react';
type ContractInfo = {
    ticker: string;
    contractId: string;
    supply: string;
    amountPerMint: string;
};
const TokensTable = () => {
    const [contracts, setContracts] = useState<ContractInfo[] | null>(null);

    useEffect(() => {
        // Fetch and process the list of deployed Glittr asset contracts
        const run = async () => {
            // API to get list of assets
            const res = await fetch(
                `${'https://devnet-core-api.glittr.fi'}/helper/assets`
            );
            const listContractRaw = await res.json();

            // Filter to only include Freemint asset contracts
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
                        // Fetch asset contract metadata to get the amount_per_mint
                        const contractInfo = listContractRaw.result[contractId];
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
                                    .contract_type.moa.mint_mechanism.free_mint
                                    .amount_per_mint,
                        };
                    })
            );
            const last10 = contracts.slice(contracts.length - 10);
            setContracts(last10);
        };

        run();
    }, []);
    return (
        <div className="min-h-screen bg-[#1e1c1f] text-white">
            {/* Diagonal pattern background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="w-full h-full relative">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-12 h-12 transform rotate-45 border-t border-r border-gray-800"
                            style={{
                                top: `${i * 30}px`,
                                left: `${i * 30}px`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Main content */}
            <div className="relative z-20 container mx-auto px-12 py-32">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold tracking-wider">
                        TOKENS
                    </h1>
                </div>

                <div className="relative overflow-x-auto rounded-lg border border-gray-800">
                    <table className="w-full text-left">
                        <thead className="text-gray-400 text-sm border-b border-gray-800">
                            <tr>
                                <th className="px-6 py-3 w-16">#</th>
                                <th className="px-6 py-3">Token Name</th>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Minted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* {tokens.map((token, index) => (
                                <tr
                                    onClick={() => window.open(token.link)}
                                    key={token.id}
                                    className={`border-b border-gray-800 hover:bg-gray-900 transition-colors cursor-pointer ${
                                        index % 2 !== 0
                                            ? 'bg-[#131320] bg-opacity-30'
                                            : ''
                                    }`}
                                >
                                    <td className="px-6 py-4">{token.id}</td>
                                    <td className="px-6 py-4 flex items-center space-x-2">
                                        <span className="text-lg">
                                            {token.icon}
                                        </span>
                                        <span>{token.name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {token.tokenId}
                                    </td>
                                    <td className="px-6 py-4">
                                        {token.minted}
                                    </td>
                                    <td className="px-6 py-4">
                                        {token.divisibility}
                                    </td>
                                    <td className="px-6 py-4">
                                        {token.maxSupply}
                                    </td>
                                    <td className="px-6 py-4">
                                        {token.timestamp}
                                    </td>
                                </tr>
                            ))} */}
                            {contracts &&
                                contracts.map((contract, index) => (
                                    <tr
                                        key={index}
                                        className={`border-b border-gray-800 hover:bg-gray-900 transition-colors cursor-pointer ${
                                            index % 2 !== 0
                                                ? 'bg-[#131320] bg-opacity-30'
                                                : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4">
                                            ID: {contract.contractId}
                                        </td>
                                        <td className="px-6 py-4">
                                            {contract.ticker}
                                        </td>
                                        <td className="px-6 py-4">
                                            {contract.supply}
                                        </td>
                                        <td className="px-6 py-4">
                                            {Number(
                                                contract.amountPerMint
                                            ).toLocaleString()}{' '}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TokensTable;
