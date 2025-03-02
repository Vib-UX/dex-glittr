'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const Navbar = () => {
    const pathname = usePathname();
    return (
        <header className="w-full shadow-2xl z-50 flex justify-between items-center px-6 py-4 border-b border-[#333333]/50 backdrop-blur-sm bg-[#1e1c1f] fixed top-0">
            <div className="text-2xl font-bold text-[#9a1dbf] relative">
                <span className="tracking-wider">RUNES DEX</span>
                <span className="absolute -top-1 -right-4 w-2 h-2 bg-[#8b5cf6] rounded-full animate-pulse"></span>
            </div>

            <nav className="hidden md:flex items-center space-x-1 bg-[#131320] rounded-full border border-[#333333]/50 p-1">
                {['SWAP', 'CREATE POOL', 'TOKENS'].map((item, index) => {
                    const path =
                        item === 'SWAP'
                            ? '/swap'
                            : item === 'CREATE POOL'
                            ? '/create-pool'
                            : '/tokens';
                    const isActive = pathname === path; // Reactively check current route

                    return (
                        <Link
                            href={path}
                            key={index}
                            className={`px-6 py-2 rounded-full text-sm transition-all duration-300 ${
                                isActive
                                    ? 'bg-[#8b5cf6] text-white font-bold shadow-lg shadow-[#8b5cf6]/20'
                                    : 'hover:bg-[#1f1f30]'
                            }`}
                        >
                            {item}
                        </Link>
                    );
                })}
            </nav>

            <button className="px-6 py-3 bg-[#131320] border border-[#333333]/70 rounded-full text-white font-bold tracking-wide hover:border-[#8b5cf6]/70 hover:shadow-lg hover:shadow-[#8b5cf6]/10 transition-all duration-300">
                CONNECT WALLET
            </button>
        </header>
    );
};

export default Navbar;
