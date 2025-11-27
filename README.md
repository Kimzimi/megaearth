# 🌍 MegaEarth - Nuclear Click War 💣

A blockchain-powered global clicking battle game built on MegaETH Testnet.

## Features

- **Choose Your Country**: Select your nation and fight for global dominance
- **Nuclear Strikes**: Launch rapid-fire nuclear missiles at rival countries
- **Blockchain Verified**: All strikes are recorded on MegaETH blockchain
- **Real-time Leaderboard**: See top countries and players
- **Batch Transactions**: Click rapidly, confirm on blockchain when ready

## Tech Stack

- **Smart Contract**: Solidity 0.8.18
- **Blockchain**: MegaETH Timothy Testnet (Chain ID: 6343)
- **Frontend**: Vanilla JavaScript + Ethers.js v5.7.2
- **Deployment**: Vercel

## Contract Address

`0xAcE11cd4190C558524d409FBd16e7D8d650FD983` on MegaETH Timothy Testnet v2

## How to Play

1. Connect your MetaMask wallet
2. Add MegaETH Timothy Testnet to MetaMask (auto-prompted)
3. Get test ETH from [MegaETH Faucet](https://docs.megaeth.com/faucet)
4. Select your country
5. Choose a target country
6. Click "CLICK TO STRIKE!" rapidly to queue strikes
7. Click "CONFIRM & SEND TO BLOCKCHAIN" to record strikes on-chain

## Local Development

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run local server
python3 -m http.server 8000 --directory public
```

Open http://localhost:8000/megaearth.html

## Links

- **Live Game**: https://megaearth.vercel.app
- **Contract Explorer**: https://megaeth-testnet-v2.blockscout.com/address/0xAcE11cd4190C558524d409FBd16e7D8d650FD983
- **MegaETH Docs**: https://docs.megaeth.com/
- **Faucet**: https://docs.megaeth.com/faucet

## License

MIT
