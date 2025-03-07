import { create } from 'zustand';

interface Token {
    id: number;
    icon: string;
    name: string;
    tokenId: string;
    minted: string;
    divisibility: number;
    maxSupply: string;
    timestamp: string;
    link: string;
}

interface GlobalStore {
    tokens: Token[];
    setTokens: (newToken: Token) => void;
}

const useGlobalStore = create<GlobalStore>()((set) => ({
    tokens: [
        {
            id: 1,
            icon: '🔲',
            name: 'FATHER OF ALL',
            tokenId: '1',
            minted: '37,074,241',
            divisibility: 0,
            maxSupply: '100,000',
            timestamp: '03.03.2025',
            link: 'https://explorer.glittr.fi/tx/019f4d1e0183e11b18f86d77adc0cc731979f51eba828ed90b051dd96178b6a0',
        },
        {
            id: 2,
            icon: '🐺',
            name: 'WOLFERS',
            tokenId: '2',
            minted: '42,000,000',
            divisibility: 10,
            maxSupply: '200,000',
            timestamp: '03.03.2025',
            link: 'https://explorer.glittr.fi/tx/691c71e8f5539861994024a3a5b18b4de8c03b12a6d5510fc2fa42bdd32c8596',
        },
        {
            id: 3,
            icon: '⟠',
            name: 'Glittr ELITERS',
            tokenId: '3',
            minted: '50,000',
            divisibility: 6,
            maxSupply: '21,000,000',
            timestamp: '03.03.2025',
            link: 'https://explorer.glittr.fi/tx/7ddd86b8f9c57622fd199b84bcd680dcbdd7a043d3d10181da2b1c22d0f2cb22',
        },
        {
            id: 4,
            icon: '🐇',
            name: 'TO MOON',
            tokenId: '4',
            minted: '250,000,000',
            divisibility: 8,
            maxSupply: '300,000',
            timestamp: '03.03.2025',
            link: 'https://explorer.glittr.fi/tx/8b62bcde773a7c5cacd3566f7d1f42e172977d2a92c00b766d6afcabce2a2f37',
        },
        {
            id: 5,
            icon: 'Ⓩ',
            name: 'ZILLIONS',
            tokenId: '5',
            minted: '1,000,000,000',
            divisibility: 18,
            maxSupply: '600,000',
            timestamp: '03.03.2025',
            link: 'https://explorer.glittr.fi/tx/c0acfc78b2cda927e0d5674ce91879f2fc5a6a6f83332ce5ce1ba4239a0daa0d',
        },
    ],
    setTokens: (newToken) =>
        set((state) => ({
            tokens: [...state.tokens, newToken],
        })),
}));

export default useGlobalStore;
