import React from 'react';
import { GlittrSDK } from '@glittr-sdk/sdk';
import {
    GLITTR_DEVNET,
    LaserEyesProvider,
    TESTNET4,
} from '@glittr-sdk/lasereyes';
const Provider = ({ children }: { children: React.ReactNode }) => {
    const NETWORK = 'regtest';

    new GlittrSDK({
        network: NETWORK,
        electrumApi: 'https://devnet-electrum.glittr.fi',
        glittrApi: 'https://devnet-core-api.glittr.fi',
        apiKey: process.env.API_KEY || '',
    });

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
            {children}
        </LaserEyesProvider>
    );
};

export default Provider;
