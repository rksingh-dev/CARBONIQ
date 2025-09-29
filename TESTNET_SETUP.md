# 🌊 Blue Carbon Token - Testnet Setup Guide

This guide will help you deploy and test the Blue Carbon Token on various testnets **FOR FREE** without spending any real money.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install smart contract dependencies
npm install --save-dev @nomicfoundation/hardhat-toolbox @openzeppelin/contracts hardhat
npm install dotenv

# Or copy the package-contracts.json to package.json
cp package-contracts.json package.json
npm install
```

### 2. Get Free Testnet ETH

#### Ethereum Testnets (Sepolia, Goerli)
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Goerli Faucet**: https://goerlifaucet.com/
- **Alchemy Faucet**: https://sepoliafaucet.com/
- **Chainlink Faucet**: https://faucets.chain.link/sepolia

#### Polygon Mumbai
- **Mumbai Faucet**: https://faucet.polygon.technology/
- **Alchemy Mumbai**: https://mumbaifaucet.com/

#### BSC Testnet
- **BSC Faucet**: https://testnet.bnbchain.org/faucet-smart

#### Avalanche Fuji
- **Avalanche Faucet**: https://faucet.avax.network/

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Private key (NEVER use your main wallet private key!)
PRIVATE_KEY=your_testnet_wallet_private_key_here

# RPC URLs (Free options)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY

# API Keys (Optional - for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key

# Gas settings
REPORT_GAS=true
```

### 4. Deploy to Testnet

```bash
# Compile contracts
npm run compile

# Deploy to Sepolia (Ethereum testnet)
npm run deploy:sepolia

# Deploy to Mumbai (Polygon testnet)
npm run deploy:mumbai

# Deploy to BSC Testnet
npm run deploy:bsc

# Deploy to Avalanche Fuji
npm run deploy:fuji
```

## 🌐 Supported Testnets

| Network | Chain ID | Faucet | Cost | Speed |
|---------|----------|--------|------|-------|
| **Sepolia** | 11155111 | Free | Free | Fast |
| **Mumbai** | 80001 | Free | Free | Very Fast |
| **BSC Testnet** | 97 | Free | Free | Fast |
| **Avalanche Fuji** | 43113 | Free | Free | Fast |

## 🔧 Configuration

### Frontend Integration

After deployment, update your frontend configuration:

```typescript
// client/lib/contractConfig.ts
export const CONTRACT_CONFIGS = {
  sepolia: {
    address: "0x...", // Your deployed contract address
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
    blockExplorer: "https://sepolia.etherscan.io"
  },
  mumbai: {
    address: "0x...", // Your deployed contract address
    chainId: 80001,
    name: "Mumbai",
    rpcUrl: "https://polygon-mumbai.infura.io/v3/YOUR_KEY",
    blockExplorer: "https://mumbai.polygonscan.com"
  }
};
```

### MetaMask Configuration

Add testnet networks to MetaMask:

#### Sepolia (Ethereum)
- Network Name: Sepolia Test Network
- RPC URL: https://sepolia.infura.io/v3/YOUR_KEY
- Chain ID: 11155111
- Currency Symbol: ETH
- Block Explorer: https://sepolia.etherscan.io

#### Mumbai (Polygon)
- Network Name: Mumbai Testnet
- RPC URL: https://polygon-mumbai.infura.io/v3/YOUR_KEY
- Chain ID: 80001
- Currency Symbol: MATIC
- Block Explorer: https://mumbai.polygonscan.com

## 🎯 Features

### Blue Carbon Token Features

✅ **ERC-20 Compliant** - Standard token functionality
✅ **Mintable** - Admin can mint new tokens
✅ **Burnable** - Users can burn tokens for carbon offset
✅ **Pausable** - Emergency stop functionality
✅ **Carbon Credit Tracking** - Metadata for carbon projects
✅ **Transfer Restrictions** - Compliance features
✅ **Blacklist Support** - Security features

### Smart Contract Functions

```solidity
// Mint tokens with carbon credit metadata
mintCarbonCredit(address to, uint256 amount, string projectId, string verificationHash)

// Regular minting
mint(address to, uint256 amount)

// Burn tokens for carbon offset
burnCarbonCredit(uint256 amount, string reason)

// Admin functions
addMinter(address minter)
removeMinter(address minter)
setTransfersEnabled(bool enabled)
pause() / unpause()
```

## 🧪 Testing

### Local Testing

```bash
# Start local blockchain
npm run node

# Deploy to local network
npm run deploy:local

# Run tests
npm test
```

### Testnet Testing

1. Deploy to testnet
2. Get testnet tokens from faucet
3. Test minting functionality
4. Test transfers
5. Test burning

## 📊 Gas Costs (Estimated)

| Function | Sepolia | Mumbai | BSC | Fuji |
|----------|---------|--------|-----|------|
| Deploy | ~0.01 ETH | ~0.1 MATIC | ~0.01 BNB | ~0.1 AVAX |
| Mint | ~0.001 ETH | ~0.01 MATIC | ~0.001 BNB | ~0.01 AVAX |
| Transfer | ~0.0005 ETH | ~0.005 MATIC | ~0.0005 BNB | ~0.005 AVAX |

## 🔒 Security Notes

- **NEVER** use your main wallet private key
- Create a separate testnet wallet
- Testnet tokens have no real value
- Always verify contract addresses
- Use reputable faucets only

## 🆘 Troubleshooting

### Common Issues

1. **"Insufficient funds"** - Get more testnet tokens from faucet
2. **"Network not found"** - Add testnet to MetaMask
3. **"Transaction failed"** - Check gas settings
4. **"Contract not verified"** - Run verification command

### Getting Help

- Check transaction on block explorer
- Verify contract deployment
- Check network configuration
- Ensure sufficient testnet tokens

## 🎉 Success!

Once deployed, you'll have:

✅ **Free ERC-20 token** on testnet
✅ **No real money spent**
✅ **Full functionality** for testing
✅ **Carbon credit tracking**
✅ **Admin controls**
✅ **User interface integration**

Your Blue Carbon Token is now ready for testing and development!
