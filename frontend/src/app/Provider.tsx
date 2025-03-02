import React from 'react';
import { GlittrSDK } from '@glittr-sdk/sdk';
const Provider = ({ children }: { children: React.ReactNode }) => {
    const NETWORK = 'regtest';

    const client = new GlittrSDK({
        network: NETWORK,
        electrumApi: 'https://devnet-electrum.glittr.fi',
        glittrApi: 'https://devnet-core-api.glittr.fi',
        apiKey: '',
    });
    console.log(client);
    return <div>{children}</div>;
};

export default Provider;
