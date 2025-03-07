'use client';

import { GLITTR, useLaserEyes } from '@glittr-sdk/lasereyes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { toastStyles } from './helpers';
import dexIcon from '../../public/assets/icon.png';
import Image from 'next/image';
const Navbar = () => {
    const pathname = usePathname();
    const { connect, connected, paymentAddress, disconnect } = useLaserEyes();
    const [balance, setBalance] = useState({ btc: 0, sats: 0 });
    const fetchBalance = async () => {
        if (!connected) return;

        try {
            const response = await fetch(
                `${'https://devnet-electrum.glittr.fi'}/address/${paymentAddress}`
            );
            const data = await response.json();

            const funded = data.chain_stats.funded_txo_sum;
            const spent = data.chain_stats.spent_txo_sum;
            const balanceSats = funded - spent;
            const balanceBtc = balanceSats / 100000000;

            setBalance({
                btc: balanceBtc,
                sats: balanceSats,
            });
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    useEffect(() => {
        if (paymentAddress && connected) {
            fetchBalance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentAddress]);
    return (
        <header className="w-full shadow-2xl z-50 flex justify-between items-center px-6 py-4 border-b border-[#333333]/50 backdrop-blur-sm bg-[#1e1c1f] fixed top-0">
            <div className="text-2xl font-bold text-[#9a1dbf] relative flex items-center gap-2">
                <Image
                    src={dexIcon}
                    alt="icon"
                    className="size-14 rounded-xl"
                />
                <span className="tracking-wider">Glittr DEX</span>
                <span className="absolute -top-1 -right-4 w-2 h-2 bg-[#8b5cf6] rounded-full animate-pulse"></span>
            </div>

            <nav className="hidden md:flex ml-32 items-center space-x-1 bg-[#131320] rounded-full border border-[#333333]/50 p-1">
                {['CREATE POOL', 'CREATE TOKENS', 'TOKENS', 'SWAP'].map(
                    (item, index) => {
                        const path =
                            item === 'CREATE POOL'
                                ? '/'
                                : item === 'CREATE TOKENS'
                                ? '/create-token'
                                : item === 'TOKENS'
                                ? '/tokens'
                                : '';
                        const isActive = pathname === path; // Reactively check current route

                        return (
                            <Link
                                href={path}
                                key={index}
                                className={`flex items-center justify-center gap-x-2 px-6 py-2 rounded-full text-sm transition-all duration-300 ${
                                    isActive
                                        ? 'bg-[#8b5cf6] text-white font-bold shadow-lg shadow-[#8b5cf6]/20'
                                        : 'hover:bg-[#1f1f30]'
                                }`}
                            >
                                {item}
                                {path === '' && (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="size-4"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                                        />
                                    </svg>
                                )}
                            </Link>
                        );
                    }
                )}
            </nav>

            {connected ? (
                <div className="flex items-center gap-x-6">
                    <button className="btn-glow flex items-center gap-1 py-1.5 px-4 bg-[#0A0A0A] rounded-lg">
                        <span>{`${balance.btc.toFixed(4)} BTC`}</span>
                    </button>
                    <button
                        onClick={() => {
                            toast.success(
                                'Address copied to clipboard',
                                toastStyles
                            );
                            navigator.clipboard.writeText(paymentAddress);
                        }}
                        className="btn-glow flex items-center gap-1 py-1.5 px-4 bg-[#0A0A0A] rounded-lg cursor-pointer "
                    >
                        <span className="font-mono">
                            {paymentAddress.slice(0, 6)}...
                            {paymentAddress.slice(-4)}
                        </span>
                    </button>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-6 cursor-pointer"
                        onClick={disconnect}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9"
                        />
                    </svg>
                </div>
            ) : (
                <button
                    onClick={() => connect(GLITTR)}
                    className="px-6 py-3 bg-[#131320] cursor-pointer border border-[#333333]/70 rounded-full text-white font-bold tracking-wide hover:border-[#8b5cf6]/70 hover:shadow-lg hover:shadow-[#8b5cf6]/10 transition-all duration-300"
                >
                    CONNECT WALLET
                </button>
            )}
        </header>
    );
};

export default Navbar;
