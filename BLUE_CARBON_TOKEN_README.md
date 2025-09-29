# 🌊 Blue Carbon Token - Complete Testnet System

A comprehensive ERC-20 token system for Blue Carbon Credits that works **100% FREE** on testnets without requiring any real money.

## 🎯 What You Get

✅ **Complete ERC-20 Token Contract** - Blue Carbon Credit Token (BCCT)  
✅ **Testnet Deployment** - Works on Sepolia, Mumbai, BSC, Avalanche  
✅ **Free Testnet Tokens** - No real money required  
✅ **Admin Dashboard** - Mint, transfer, and manage tokens  
✅ **User Interface** - Complete token management system  
✅ **Carbon Credit Tracking** - Project metadata and verification  
✅ **Burn Functionality** - Carbon offset verification  

## 🚀 Quick Start (5 Minutes)

### 1. Get Free Testnet Tokens

**Ethereum Sepolia:**
- [Sepolia Faucet](https://sepoliafaucet.com/) - 0.1 ETH
- [Chainlink Faucet](https://faucets.chain.link/sepolia) - 0.1 ETH

**Polygon Mumbai:**
- [Mumbai Faucet](https://faucet.polygon.technology/) - 0.1 MATIC
- [Alchemy Mumbai](https://mumbaifaucet.com/) - 0.1 MATIC

**BSC Testnet:**
- [BSC Faucet](https://testnet.bnbchain.org/faucet-smart) - 0.1 BNB

**Avalanche Fuji:**
- [Avalanche Faucet](https://faucet.avax.network/) - 0.1 AVAX

### 2. Deploy Your Token

```bash
# Clone and setup
git clone <your-repo>
cd carbonnn

# Install dependencies
npm install

# Run automated setup
node scripts/setup-testnet.js
```

### 3. Start Using

```bash
# Start the application
npm run dev

# Open http://localhost:8080
# Connect wallet to testnet
# Start minting Blue Carbon tokens!
```

## 🏗️ Architecture

### Smart Contract Features

```solidity
contract BlueCarbonToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    // Core Features
    function mintCarbonCredit(address to, uint256 amount, string projectId, string verificationHash)
    function burnCarbonCredit(uint256 amount, string reason)
    function mint(address to, uint256 amount)
    
    // Admin Controls
    function addMinter(address minter)
    function setTransfersEnabled(bool enabled)
    function pause() / unpause()
    
    // Carbon Credit Tracking
    struct CarbonCredit {
        uint256 amount;
        string projectId;
        string verificationHash;
        uint256 timestamp;
        bool verified;
    }
}
```

### Frontend Components

- **Admin Dashboard** - Mint tokens, manage users
- **Token Manager** - Transfer, burn, view balance
- **Testnet Faucet** - Get free testnet tokens
- **Carbon Credit Tracker** - Project verification system

## 🌐 Supported Testnets

| Network | Chain ID | Faucet | Cost | Speed |
|---------|----------|--------|------|-------|
| **Sepolia** | 11155111 | Free | Free | Fast |
| **Mumbai** | 80001 | Free | Free | Very Fast |
| **BSC Testnet** | 97 | Free | Free | Fast |
| **Avalanche Fuji** | 43113 | Free | Free | Fast |

## 📁 Project Structure

```
carbonnn/
├── contracts/
│   └── BlueCarbonToken.sol          # Main ERC-20 contract
├── scripts/
│   ├── deploy-testnet.js            # Deployment script
│   └── setup-testnet.js            # Automated setup
├── client/
│   ├── components/
│   │   ├── BlueCarbonTokenManager.tsx
│   │   ├── TestnetFaucet.tsx
│   │   └── MintingInterface.tsx
│   ├── pages/
│   │   ├── Admin.tsx
│   │   ├── SendTokens.tsx
│   │   └── Dashboard.tsx
│   └── lib/
│       ├── testnetConfig.ts
│       └── contractUtils.ts
├── hardhat.config.js                # Hardhat configuration
├── package-contracts.json           # Smart contract dependencies
└── TESTNET_SETUP.md                # Detailed setup guide
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
# Private key (NEVER use main wallet!)
PRIVATE_KEY=your_testnet_wallet_private_key

# RPC URLs (Free options)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_KEY

# Optional API keys
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key
```

### MetaMask Setup

Add testnet networks:

**Sepolia:**
- Network Name: Sepolia Test Network
- RPC URL: https://sepolia.infura.io/v3/YOUR_KEY
- Chain ID: 11155111
- Currency: ETH

**Mumbai:**
- Network Name: Mumbai Testnet
- RPC URL: https://polygon-mumbai.infura.io/v3/YOUR_KEY
- Chain ID: 80001
- Currency: MATIC

## 🎮 Usage Guide

### For Admins

1. **Deploy Contract**
   ```bash
   npm run deploy:sepolia
   ```

2. **Mint Tokens**
   - Go to Admin Dashboard
   - Click "Send Tokens"
   - Enter recipient address and amount
   - Add carbon project metadata

3. **Manage System**
   - Pause/unpause transfers
   - Add/remove minters
   - Blacklist addresses
   - Verify carbon projects

### For Users

1. **Get Testnet Tokens**
   - Use Testnet Faucet component
   - Get free ETH/MATIC/BNB/AVAX
   - No real money required!

2. **Use Blue Carbon Tokens**
   - View balance and carbon credits
   - Transfer tokens to others
   - Burn tokens for carbon offset
   - Track project verifications

## 🧪 Testing

### Local Testing

```bash
# Start local blockchain
npx hardhat node

# Deploy to local network
npm run deploy:local

# Test functionality
npm test
```

### Testnet Testing

1. Deploy to testnet
2. Get testnet tokens from faucet
3. Test all functions:
   - Minting
   - Transfers
   - Burning
   - Admin controls

## 💰 Cost Breakdown

| Operation | Sepolia | Mumbai | BSC | Fuji |
|-----------|---------|--------|-----|------|
| **Deploy** | ~0.01 ETH | ~0.1 MATIC | ~0.01 BNB | ~0.1 AVAX |
| **Mint** | ~0.001 ETH | ~0.01 MATIC | ~0.001 BNB | ~0.01 AVAX |
| **Transfer** | ~0.0005 ETH | ~0.005 MATIC | ~0.0005 BNB | ~0.005 AVAX |

**Total Cost: $0.00** (All testnet tokens are free!)

## 🔒 Security Features

- **Pausable** - Emergency stop functionality
- **Access Control** - Only authorized minters
- **Blacklist** - Block malicious addresses
- **Reentrancy Protection** - Prevent attacks
- **Input Validation** - Comprehensive checks

## 🌱 Carbon Credit Features

- **Project Tracking** - Unique project IDs
- **Verification Hashes** - Cryptographic verification
- **Burn for Offset** - Carbon offset verification
- **Metadata Storage** - Complete audit trail
- **Verification Status** - Track project approval

## 🆘 Troubleshooting

### Common Issues

1. **"Insufficient funds"**
   - Get more testnet tokens from faucet
   - Check gas price settings

2. **"Network not found"**
   - Add testnet to MetaMask
   - Check RPC URL configuration

3. **"Contract not found"**
   - Verify deployment was successful
   - Check contract address

4. **"Transaction failed"**
   - Check gas limit settings
   - Ensure sufficient testnet tokens

### Getting Help

- Check transaction on block explorer
- Verify contract deployment
- Check network configuration
- Ensure sufficient testnet tokens

## 🎉 Success!

You now have:

✅ **Free ERC-20 token** on testnet  
✅ **Complete admin system**  
✅ **User interface**  
✅ **Carbon credit tracking**  
✅ **No real money spent**  
✅ **Full functionality**  

## 📞 Support

- **Documentation**: Check TESTNET_SETUP.md
- **Issues**: Create GitHub issue
- **Community**: Join our Discord
- **Updates**: Follow our Twitter

## 🚀 Next Steps

1. **Deploy to Mainnet** (when ready)
2. **Add more features** (batch operations, etc.)
3. **Integrate with real carbon projects**
4. **Build mobile app**
5. **Add more testnets**

---

**🎯 Your Blue Carbon Token system is ready to use - completely FREE on testnets!**
