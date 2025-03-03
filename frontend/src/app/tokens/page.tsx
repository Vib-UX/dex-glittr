'use client';

import useGlobalStore from '@/store';

const TokensTable = () => {
    const { tokens } = useGlobalStore();

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
                                <th className="px-6 py-3">Divisibility</th>
                                <th className="px-6 py-3">Max Supply</th>
                                <th className="px-6 py-3">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tokens.map((token, index) => (
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TokensTable;
