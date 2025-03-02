'use client';
import { useState } from 'react';
import { FaGlobe, FaTelegram, FaTwitter } from 'react-icons/fa';
import { FiPlus } from 'react-icons/fi';

export default function CreatePool() {
    const [firstTokenAmount, setFirstTokenAmount] = useState('0.00');
    const [secondTokenAmount, setSecondTokenAmount] = useState('0.00');
    const [firstTokenSelected] = useState(true);

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
                        CREATE POOL
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
                            Once you create a pool, you can monitor your total
                            pool share percentage, enabling you to earn returns
                            proportional to your share of the pool.
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
                            <button className="flex items-center px-4 py-2 bg-[#131320] hover:bg-[#1f1f30] rounded-lg border border-[#333333]/50 transition-all duration-300">
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
                                value={secondTokenAmount}
                                onChange={(e) =>
                                    setSecondTokenAmount(e.target.value)
                                }
                                className="w-2/3 bg-transparent text-3xl font-medium focus:outline-none"
                            />
                            <button className="flex items-center px-4 py-2 bg-[#131320] hover:bg-[#1f1f30] rounded-lg border border-[#333333]/50 transition-all duration-300">
                                <span>Select token</span>
                            </button>
                        </div>
                        <div className="flex justify-end text-gray-400 text-sm mt-2">
                            <span>0</span>
                        </div>
                    </div>
                </div>

                {/* Create Pool Button */}
                <button className="w-full py-4 mt-6 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d4bb1] text-white font-bold text-lg tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-[#8b5cf6]/20 relative overflow-hidden group">
                    <div className="absolute inset-0 w-1/3 h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-[400%] transition-transform duration-1000"></div>
                    CREATE POOL
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
