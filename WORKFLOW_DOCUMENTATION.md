# 🔄 Blue Carbon Token System - Complete Workflow

## 📋 System Overview

The current codebase implements a **Carbon Credit Verification and Token Management System** with the following key components:

### 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Blockchain    │
│   (React SPA)   │◄──►│   (Express)     │◄──►│   (Smart        │
│                 │    │                 │    │    Contracts)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 User Workflows

### 1. **Regular User Workflow** (Dashboard)

```
User Journey:
1. Connect Wallet → 2. Upload Report → 3. Submit for Verification → 4. Track Status
```

#### **Step 1: Wallet Connection**
- **Entry Point**: `client/pages/Index.tsx` (Landing page)
- **Action**: User clicks "Connect Wallet & Start"
- **Hook**: `useWallet()` manages MetaMask connection
- **Redirect**: After connection → `/dashboard`

#### **Step 2: Report Upload**
- **Page**: `client/pages/Dashboard.tsx`
- **Process**:
  ```typescript
  // User selects PDF file
  const [file, setFile] = useState<File | null>(null);
  
  // Upload to IPFS (Pinata)
  const b64 = await bytesToBase64(file);
  const { cid } = await Api.uploadReport(file.name, b64);
  
  // Create verification ticket
  await Api.createTicket({
    walletAddress: account,
    reportCid: cid,
    reportName: file.name,
    analysis: { estimatedTokens: 0, confidence: 0, summary: "Pending admin verification" }
  });
  ```

#### **Step 3: Track Verification Status**
- **Display**: List of submitted tickets with status
- **Statuses**: `pending` → `approved` → `rejected`
- **Features**: View IPFS links, transaction hashes

### 2. **Admin Workflow** (Admin Dashboard)

```
Admin Journey:
1. Login → 2. Review Tickets → 3. Mint Tokens → 4. Approve/Reject
```

#### **Step 1: Admin Authentication**
- **Page**: `client/pages/Admin.tsx`
- **Process**: Username/password login
- **Session**: `useAdminSession()` hook manages admin sessions
- **API**: `POST /api/admin/login`

#### **Step 2: Ticket Management**
- **Features**:
  - Search and filter tickets
  - Sort by date, status, name
  - View ticket details and IPFS reports
  - Bulk operations

#### **Step 3: Token Minting**
- **Interface**: `MintingInterface` component
- **Process**:
  ```typescript
  // Admin clicks "Mint & Approve" on a ticket
  const handleMint = async () => {
    const result = await mint(recipientAddress, contractConfig, {
      to: recipientAddress,
      amount,
      description
    });
    
    // Update ticket status with transaction hash
    await Api.updateTicket(ticketId, { action: "approve", txHash: result.hash });
  };
  ```

#### **Step 4: Direct Token Sending**
- **Page**: `client/pages/SendTokens.tsx`
- **Purpose**: Send tokens directly without ticket approval
- **Features**: Enter recipient, amount, description

### 3. **Smart Contract Integration**

#### **Token Contract** (`contracts/BlueCarbonToken.sol`)
```solidity
contract BlueCarbonToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    // Core Functions
    function mintCarbonCredit(address to, uint256 amount, string projectId, string verificationHash)
    function burnCarbonCredit(uint256 amount, string reason)
    function mint(address to, uint256 amount)
    
    // Admin Controls
    function addMinter(address minter)
    function setTransfersEnabled(bool enabled)
    function pause() / unpause()
}
```

#### **Minting Process**
1. **Gas Estimation**: Calculate transaction costs
2. **Transaction Encoding**: Encode function calls
3. **MetaMask Interaction**: Send transaction
4. **Confirmation Waiting**: Wait for blockchain confirmation
5. **Status Update**: Update ticket with transaction hash

## 🔄 Data Flow

### **Frontend → Backend → Database**

```
1. User Upload → 2. IPFS Storage → 3. Database Ticket → 4. Admin Review → 5. Token Mint → 6. Status Update
```

#### **API Endpoints**

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/tickets` | GET | List tickets | User/Admin |
| `/api/tickets` | POST | Create ticket | User |
| `/api/tickets/:id` | PATCH | Update ticket | Admin |
| `/api/admin/login` | POST | Admin login | None |
| `/api/admin/validate` | GET | Validate session | Admin |
| `/api/upload-report` | POST | Upload to IPFS | None |
| `/api/analyze-report` | POST | AI analysis | None |

#### **Database Schema** (`server/data/tickets.json`)

```typescript
interface Ticket {
  id: string;
  walletAddress: string;
  reportCid: string;        // IPFS hash
  reportName: string;
  analysis: {
    estimatedTokens: number;
    confidence: number;
    summary: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  txHash?: string;          // Blockchain transaction
}
```

## 🎮 Component Architecture

### **Page Components**

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| `Index.tsx` | Landing page | Wallet connection, feature showcase |
| `Dashboard.tsx` | User dashboard | File upload, ticket tracking |
| `Admin.tsx` | Admin dashboard | Ticket management, minting interface |
| `SendTokens.tsx` | Direct sending | Admin-to-user token transfers |
| `NotFound.tsx` | 404 page | Error handling |

### **Shared Components**

| Component | Purpose | Location |
|-----------|---------|----------|
| `MintingInterface` | Token minting UI | `client/components/` |
| `TestnetFaucet` | Free token faucets | `client/components/` |
| `BlueCarbonTokenManager` | Token management | `client/components/` |
| `SiteHeader` | Navigation | `client/components/layout/` |
| `SiteFooter` | Footer | `client/components/layout/` |

### **Custom Hooks**

| Hook | Purpose | Key Functions |
|------|---------|---------------|
| `useWallet` | Wallet connection | `connect()`, `disconnect()`, `account` |
| `useMinting` | Token operations | `mint()`, `burn()`, `transfer()` |
| `useAdminSession` | Admin auth | `login()`, `logout()`, `session` |
| `useContractConfig` | Contract settings | `address`, `updateConfig()` |

## 🔧 Configuration System

### **Environment Variables**

```env
# Wallet
PRIVATE_KEY=your_testnet_private_key

# RPC URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
MUMBAI_RPC_URL=https://polygon-mumbai.infura.io/v3/YOUR_KEY

# API Keys
ETHERSCAN_API_KEY=your_etherscan_key
POLYGONSCAN_API_KEY=your_polygonscan_key

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
```

### **Testnet Configuration**

```typescript
// client/lib/testnetConfig.ts
export const TESTNET_CONFIGS = {
  sepolia: {
    chainId: "11155111",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
    blockExplorer: "https://sepolia.etherscan.io",
    currency: { name: "Ethereum", symbol: "ETH", decimals: 18 }
  },
  mumbai: {
    chainId: "80001", 
    rpcUrl: "https://polygon-mumbai.infura.io/v3/YOUR_KEY",
    blockExplorer: "https://mumbai.polygonscan.com",
    currency: { name: "Polygon", symbol: "MATIC", decimals: 18 }
  }
};
```

## 🚀 Deployment Workflow

### **Development**

```bash
# Start development server
pnpm dev

# Frontend: http://localhost:8080
# Backend: Integrated with Vite dev server
```

### **Smart Contract Deployment**

```bash
# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:sepolia
npm run deploy:mumbai
npm run deploy:bsc
npm run deploy:fuji

# Verify contracts
npm run verify:sepolia
```

### **Production Deployment**

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 🔐 Security Features

### **Authentication & Authorization**

- **User Authentication**: MetaMask wallet connection
- **Admin Authentication**: Username/password with session tokens
- **Session Management**: Automatic expiration and refresh
- **API Protection**: Admin-only endpoints with token validation

### **Smart Contract Security**

- **Access Control**: Only authorized minters can mint tokens
- **Pausable**: Emergency stop functionality
- **Reentrancy Protection**: Prevent reentrancy attacks
- **Input Validation**: Comprehensive parameter validation
- **Blacklist Support**: Block malicious addresses

### **Data Security**

- **IPFS Storage**: Decentralized file storage
- **Encrypted Sessions**: Secure admin session management
- **Input Sanitization**: Prevent injection attacks
- **Rate Limiting**: API rate limiting protection

## 📊 State Management

### **Frontend State**

```typescript
// User Dashboard State
const [file, setFile] = useState<File | null>(null);
const [tickets, setTickets] = useState<Ticket[]>([]);
const [uploading, setUploading] = useState(false);

// Admin Dashboard State
const [tickets, setTickets] = useState<Ticket[]>([]);
const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
const [showMintingInterface, setShowMintingInterface] = useState(false);

// Wallet State
const { account, connect, disconnect, isConnected } = useWallet();
```

### **Backend State**

```typescript
// In-memory storage
const adminSessions = new Map<string, number>();
let ticketsCache: Ticket[] | null = null;

// File-based storage
const TICKETS_FILE = path.join(DATA_DIR, "tickets.json");
```

## 🎯 Key Features

### **For Users**
- ✅ **Wallet Connection** - MetaMask integration
- ✅ **Report Upload** - PDF upload to IPFS
- ✅ **Status Tracking** - Real-time ticket status
- ✅ **Token Management** - View balance, transfer, burn
- ✅ **Testnet Faucets** - Get free testnet tokens

### **For Admins**
- ✅ **Ticket Management** - Review, approve, reject
- ✅ **Token Minting** - Mint tokens to users
- ✅ **Direct Sending** - Send tokens without approval
- ✅ **System Controls** - Pause, blacklist, etc.
- ✅ **Analytics** - Track system usage

### **For Developers**
- ✅ **Testnet Deployment** - Free deployment on multiple networks
- ✅ **Smart Contract Integration** - Full ERC-20 functionality
- ✅ **API Documentation** - Comprehensive API endpoints
- ✅ **Error Handling** - Robust error management
- ✅ **Testing Support** - Local and testnet testing

## 🔄 Complete User Journey

```
1. User visits landing page
2. Connects MetaMask wallet
3. Redirected to dashboard
4. Uploads carbon credit report (PDF)
5. Report stored on IPFS
6. Ticket created in database
7. Admin receives notification
8. Admin reviews report
9. Admin mints tokens to user
10. Ticket status updated to "approved"
11. User sees tokens in wallet
12. User can transfer/burn tokens
```

## 🎉 Success Metrics

- **User Adoption**: Wallet connections, report uploads
- **Admin Efficiency**: Ticket processing time
- **Token Activity**: Minting, transfers, burns
- **System Reliability**: Uptime, error rates
- **Blockchain Integration**: Transaction success rates

---

**This system provides a complete end-to-end solution for carbon credit verification and token management, with full testnet support and no real money required!**
