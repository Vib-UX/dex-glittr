'use client';
import Link from 'next/link';
import { useState } from 'react';
import { FaGlobe, FaTelegram, FaTwitter } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';

export default function Home() {
    const [firstTokenAmount, setFirstTokenAmount] = useState('0.00');
    const [secondTokenAmount, setSecondTokenAmount] = useState('0.00');
    const [firstTokenSelected] = useState(null);

    return (
        <div className="min-h-screen bg-[#1e1c1f] text-white">
            {/* Header */}
            <header className="flex justify-between items-center px-6 py-4 border-b border-[#333333]">
                <div className="text-2xl font-bold text-[#9a1dbf]">
                    RUNES DEX
                </div>

                <nav className="hidden md:flex items-center space-x-2 bg-[#212121] p-1 rounded-lg">
                    {['SWAP', 'POOLS', 'TOKENS'].map((item, index) => (
                        <Link
                            href="/tokens"
                            key={index}
                            className={`px-6 py-2 rounded-lg text-sm ${
                                item === 'POOLS'
                                    ? 'bg-white text-[#1a1a1a] font-bold'
                                    : 'hover:bg-[#2a2a2a]'
                            }`}
                        >
                            {item}
                        </Link>
                    ))}
                </nav>

                <button className="px-6 py-3 bg-[#212121] border border-[#333333] rounded-lg text-white font-bold hover:bg-[#2a2a2a]">
                    CONNECT WALLET
                </button>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 py-10">
                <div className="flex items-center mb-6">
                    <h1 className="ml-4 text-3xl font-bold text-[#ffe1ff]">
                        CREATE POOL
                    </h1>
                </div>

                <div className="bg-[#212121] rounded-2xl border border-[#333333] shadow-xl p-6 mb-8">
                    <div className="p-4 mb-6 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 rounded-xl text-white">
                        <p>
                            Once you create a pool, you can monitor your total
                            pool share percentage, enabling you to earn returns
                            proportional to your share of the pool.
                        </p>
                    </div>

                    {/* First Token Input */}
                    <div className="bg-[#1a1a1a] rounded-xl p-4 mb-4 border border-[#333333]">
                        <div className="flex justify-between items-center">
                            <input
                                type="text"
                                value={firstTokenAmount}
                                onChange={(e) =>
                                    setFirstTokenAmount(e.target.value)
                                }
                                className="w-2/3 bg-transparent text-3xl font-medium focus:outline-none"
                            />
                            <button className="flex items-center px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] rounded-lg">
                                {firstTokenSelected ? (
                                    <div className="flex items-center">
                                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center mr-2">
                                            ₿
                                        </div>
                                        <span>Bitcoin</span>
                                    </div>
                                ) : (
                                    <span>Select token</span>
                                )}
                            </button>
                        </div>
                        <div className="flex justify-end text-gray-400 text-sm mt-2">
                            <span>0</span>
                        </div>
                    </div>

                    {/* Add Token Button */}
                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-[#8b5cf6] flex items-center justify-center shadow-lg">
                            <FiPlus className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    {/* Second Token Input */}
                    <div className="bg-[#1a1a1a] rounded-xl p-4 mt-4 border border-[#333333]">
                        <div className="flex justify-between items-center">
                            <input
                                type="text"
                                value={secondTokenAmount}
                                onChange={(e) =>
                                    setSecondTokenAmount(e.target.value)
                                }
                                className="w-2/3 bg-transparent text-3xl font-medium focus:outline-none"
                            />
                            <button className="flex items-center px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] rounded-lg">
                                <span>Select token</span>
                            </button>
                        </div>
                        <div className="flex justify-end text-gray-400 text-sm mt-2">
                            <span>0</span>
                        </div>
                    </div>
                </div>

                {/* Create Pool Button */}
                <button className="w-full py-4 mt-6 rounded-xl bg-[#8b5cf6] text-white font-bold text-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                    CREATE POOL
                </button>
            </main>

            {/* Footer */}
            <footer className="mt-10 pb-8 text-center text-gray-400">
                <div className="flex justify-center space-x-6 mb-4">
                    <a
                        href="#"
                        className="p-2 bg-[#212121] rounded-full hover:bg-[#2a2a2a]"
                    >
                        <FaTwitter className="w-5 h-5" />
                    </a>
                    <a
                        href="#"
                        className="p-2 bg-[#212121] rounded-full hover:bg-[#2a2a2a]"
                    >
                        <FaTelegram className="w-5 h-5" />
                    </a>
                    <a
                        href="#"
                        className="p-2 bg-[#212121] rounded-full hover:bg-[#2a2a2a]"
                    >
                        <FaGlobe className="w-5 h-5" />
                    </a>
                </div>
                <p className="text-sm">
                    © 2025 RUNES DEX. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
