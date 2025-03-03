import React from 'react';
import { GlittrSDK } from '@glittr-sdk/sdk';
import {
    GLITTR_DEVNET,
    LaserEyesProvider,
    TESTNET4,
} from '@glittr-sdk/lasereyes';
import { Toaster } from 'react-hot-toast';
export const NETWORK = 'regtest';
export const client = new GlittrSDK({
    network: NETWORK,
    electrumApi: 'https://devnet-electrum.glittr.fi',
    glittrApi: 'https://devnet-core-api.glittr.fi',
    apiKey: 'ccc80ba0-e813-41ed-8a62-1ea0560688e7',
});
const Provider = ({ children }: { children: React.ReactNode }) => {
    return (
        <LaserEyesProvider
            config={{
                network:
                    NETWORK == 'regtest'
                        ? GLITTR_DEVNET
                        : NETWORK == 'testnet'
                        ? TESTNET4
                        : NETWORK,
            }}
        >
            <Toaster position="top-center" reverseOrder={false} />
            {children}
        </LaserEyesProvider>
    );
};

export default Provider;
