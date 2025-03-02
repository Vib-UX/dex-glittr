# Glittr AMM


## Features

- **Asset Creation**: TokenA and TokenB assets are created as prediction market outcomes.
- **Minting**: Users can mint these assets.
- **Automated Market Maker (AMM)**: A market-making contract is deployed for swaps.
- **Liquidity Provision**: Users can provide liquidity to the AMM.
- **Swapping**: Users can swap between TokenA and TokenB.
- **Market Resolution**: An oracle determines the winning outcome.
- **Collateralized Minting & Swaps**: Users can deposit collateral to mint outcome tokens.

## Requirements

- Node.js (v16 or later)
- NPM or Yarn
- A valid WIF (Wallet Import Format) private key
- API key for Glittr SDK

## Installation

1. Clone this repository:
   ```sh
   git clone <repo-url>
   cd <repo-directory>
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

## Configuration

Set up the environment variables in `.env`:

```sh
NETWORK=regtest
API_KEY=your-api-key
WIF=your-wallet-private-key
```

## Usage

### Running the Prediction Market

To start the script and run the full prediction market process, execute:

```sh
node index.js
```

### Breakdown of Functions

- **Creating Assets:**

  ```js
  createOutcomeAsset("TokenA");
  createOutcomeAsset("TokenB");
  ```

- **Minting Assets:**

  ```js
  mintAsset(TokenAAsset);
  mintAsset(TokenBAsset);
  ```

- **Deploying the AMM Contract:**

  ```js
  createAMMContract(TokenAAsset, TokenBAsset, "AMM-market");
  ```

- **Depositing Liquidity:**

  ```js
  depositLiquidity(ammContract, TokenAAsset, TokenBAsset, 100);
  ```

- **Performing a Swap:**
  ```js
  performSwap(ammContract, TokenAAsset, 100, 10);
  ```

## Troubleshooting

- Ensure your WIF private key is correct and corresponds to an address with sufficient balance.
- API key should be valid for interacting with the Glittr API.
- If transactions are delayed, verify network connectivity and blockchain confirmations.

## License

This project is licensed under the MIT License.
