'use client';
import React, { useState } from 'react';

const CryptoPoolInterface = () => {
    const [firstTokenAmount, setFirstTokenAmount] = useState('0.00');
    const [secondTokenAmount, setSecondTokenAmount] = useState('0.00');
    const [firstToken] = useState('Bitcoin');
    const [secondToken, setSecondToken] = useState('Select token');
    const [poolFee, setPoolFee] = useState(0.3);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    const handleAddToken = () => {
        if (secondToken === 'Select token') {
            setSecondToken('ETH');
        } else {
            // Add another token field logic would go here
        }
    };

    const calculateAPY = () => {
        // Simple mock calculation
        return (Math.random() * 15 + 5).toFixed(2);
    };

    return (
        <div className="min-h-screen bg-[#1e1c1f] text-white font-mono relative overflow-hidden">
            {' '}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-40 h-40 border-l-2 border-t-2 border-[#8b5cf6]/20 opacity-30"></div>
                <div className="absolute bottom-0 right-0 w-60 h-60 border-r-2 border-b-2 border-[#8b5cf6]/20 opacity-30"></div>
                <div className="absolute top-1/4 -left-20 w-40 h-[200%] bg-[#8b5cf6]/5 rotate-45"></div>
                <div className="absolute bottom-1/3 -right-20 w-40 h-[200%] bg-[#8b5cf6]/5 rotate-45"></div>
            </div>
            <div className="w-full max-w-md mx-auto my-32">
                {/* Main card */}
                <div className="bg-[#0f0f1a]/70 backdrop-blur-sm rounded-2xl border border-[#333333]/50 shadow-xl shadow-[#000]/40 p-1 mb-8 overflow-hidden">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-2xl font-bold text-center">SWAP</h2>
                    </div>

                    <div className="p-6">
                        {/* Info box */}
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

                        {/* First token input */}
                        <div
                            className="border border-gray-700 rounded-lg p-4 my-4"
                            style={{
                                background:
                                    'linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(30,30,50,0.6) 100%)',
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <input
                                    type="text"
                                    value={firstTokenAmount}
                                    onChange={(e) =>
                                        setFirstTokenAmount(e.target.value)
                                    }
                                    className="mb-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner"
                                    placeholder="0.00"
                                />
                                <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-[#131320] hover:bg-[#1f1f30] border border-[#333333]/50 transition-all duration-300">
                                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs">
                                            ₿
                                        </div>
                                        <span>{firstToken}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right text-xs text-gray-400 mt-2">
                                Balance: 0
                            </div>
                        </div>

                        {/* Add token button */}
                        <div className="flex justify-center -my-2 mb-4 relative z-10">
                            <button
                                onClick={handleAddToken}
                                className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Second token input */}
                        <div
                            className=" border border-gray-700 rounded-lg p-4 mb-6"
                            style={{
                                background:
                                    'linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(30,30,50,0.6) 100%)',
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <input
                                    type="text"
                                    value={secondTokenAmount}
                                    onChange={(e) =>
                                        setSecondTokenAmount(e.target.value)
                                    }
                                    className="mb-3 bg-[#0a0a10] rounded-xl p-4 border border-[#1f1f30] shadow-inner"
                                    placeholder="0.00"
                                />
                                {/* <div className="flex items-center space-x-2">
                                    <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-700">
                                        {secondToken !== 'Select token' && (
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs">
                                                Ξ
                                            </div>
                                        )}
                                        <span>{secondToken}</span>
                                    </button>
                                </div> */}
                                <div className="flex items-center space-x-2 p-3 rounded-lg bg-[#131320] hover:bg-[#1f1f30] border border-[#333333]/50 transition-all duration-300">
                                    {secondToken !== 'Select token' && (
                                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs">
                                            ₿
                                        </div>
                                    )}
                                    <span>{secondToken}</span>
                                </div>
                            </div>
                            <div className="text-right text-xs text-gray-400 mt-2">
                                Balance: 0
                            </div>
                        </div>

                        {/* Pool statistics - Unique element */}
                        <div
                            className="rounded-lg p-4 mb-6"
                            style={{
                                background:
                                    'linear-gradient(90deg, rgba(139,92,246,0.1) 0%, rgba(30,30,50,0.6) 100%)',
                            }}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm">Pool Statistics</span>
                                <span className="text-sm text-purple-400">
                                    Estimated
                                </span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Initial APY</span>
                                    <span className="text-green-400">
                                        {calculateAPY()}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Pool Fee Rate</span>
                                    <div className="flex items-center">
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1"
                                            step="0.1"
                                            value={poolFee}
                                            onChange={(e) =>
                                                setPoolFee(
                                                    parseFloat(e.target.value)
                                                )
                                            }
                                            className="w-16 mr-2"
                                        />
                                        <span>{poolFee}%</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <span>Your Pool Share</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        </div>

                        {/* Advanced settings - Unique element */}
                        <div className="mb-6">
                            <button
                                onClick={() =>
                                    setIsAdvancedOpen(!isAdvancedOpen)
                                }
                                className="flex items-center justify-between w-full text-sm text-gray-400 hover:text-white"
                            >
                                <span>Advanced Settings</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`h-4 w-4 transition-transform ${
                                        isAdvancedOpen
                                            ? 'transform rotate-180'
                                            : ''
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {isAdvancedOpen && (
                                <div className="bg-gray-700 rounded-lg p-4 mt-2 text-sm">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span>Slippage Tolerance</span>
                                            <div className="flex space-x-2">
                                                <button className="px-2 py-1 rounded bg-gray-600">
                                                    0.5%
                                                </button>
                                                <button className="px-2 py-1 rounded bg-purple-600">
                                                    1%
                                                </button>
                                                <button className="px-2 py-1 rounded bg-gray-600">
                                                    2%
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Deadline</span>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    value="20"
                                                    className="w-12 bg-gray-600 rounded p-1 text-center"
                                                />
                                                <span>minutes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Create Pool Button */}
                        <button className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold tracking-wider shadow-lg transition-colors">
                            SWAP
                        </button>
                    </div>
                </div>

                {/* Footer - Unique element */}
                <div className="mt-6 flex justify-between text-sm text-gray-500">
                    <span className="flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        Network Active
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CryptoPoolInterface;
