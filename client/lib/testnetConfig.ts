/**
 * Testnet Configuration for Blue Carbon Token
 * 
 * This file contains all the necessary configuration for deploying
 * and using the Blue Carbon Token on various testnets.
 */

export interface TestnetConfig {
  name: string;
  chainId: string;
  rpcUrl: string;
  blockExplorer: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  faucets: string[];
  gasPrice?: string;
  gasLimit?: string;
}

export const TESTNET_CONFIGS: Record<string, TestnetConfig> = {
  sepolia: {
    name: "Sepolia Test Network",
    chainId: "11155111",
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://sepolia.etherscan.io",
    currency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    faucets: [
      "https://sepoliafaucet.com/",
      "https://faucets.chain.link/sepolia",
      "https://sepoliafaucet.com/"
    ],
    gasPrice: "20000000000", // 20 gwei
    gasLimit: "300000"
  },
  
  mumbai: {
    name: "Mumbai Testnet",
    chainId: "80001",
    rpcUrl: "https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://mumbai.polygonscan.com",
    currency: {
      name: "Polygon",
      symbol: "MATIC",
      decimals: 18,
    },
    faucets: [
      "https://faucet.polygon.technology/",
      "https://mumbaifaucet.com/"
    ],
    gasPrice: "30000000000", // 30 gwei
    gasLimit: "200000"
  },
  
  bscTestnet: {
    name: "BSC Testnet",
    chainId: "97",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    blockExplorer: "https://testnet.bscscan.com",
    currency: {
      name: "Binance Coin",
      symbol: "BNB",
      decimals: 18,
    },
    faucets: [
      "https://testnet.bnbchain.org/faucet-smart"
    ],
    gasPrice: "10000000000", // 10 gwei
    gasLimit: "200000"
  },
  
  avalancheFuji: {
    name: "Avalanche Fuji Testnet",
    chainId: "43113",
    rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
    blockExplorer: "https://testnet.snowtrace.io",
    currency: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
    },
    faucets: [
      "https://faucet.avax.network/"
    ],
    gasPrice: "25000000000", // 25 gwei
    gasLimit: "200000"
  }
};

/**
 * Get testnet configuration by chain ID
 */
export function getTestnetConfig(chainId: string): TestnetConfig | null {
  return TESTNET_CONFIGS[chainId] || null;
}

/**
 * Get all available testnet configurations
 */
export function getAllTestnetConfigs(): TestnetConfig[] {
  return Object.values(TESTNET_CONFIGS);
}

/**
 * Check if a chain ID is a supported testnet
 */
export function isSupportedTestnet(chainId: string): boolean {
  return chainId in TESTNET_CONFIGS;
}

/**
 * Get MetaMask network configuration for a testnet
 */
export function getMetaMaskNetworkConfig(chainId: string) {
  const config = getTestnetConfig(chainId);
  if (!config) return null;
  
  return {
    chainId: `0x${parseInt(config.chainId).toString(16)}`,
    chainName: config.name,
    rpcUrls: [config.rpcUrl],
    blockExplorerUrls: [config.blockExplorer],
    nativeCurrency: config.currency,
  };
}

/**
 * Blue Carbon Token Contract Addresses
 * 
 * These will be populated after deployment
 */
export const BLUE_CARBON_CONTRACTS: Record<string, string> = {
  // Add your deployed contract addresses here
  // sepolia: "0x...",
  // mumbai: "0x...",
  // bscTestnet: "0x...",
  // avalancheFuji: "0x...",
};

/**
 * Get contract address for a specific testnet
 */
export function getContractAddress(chainId: string): string | null {
  return BLUE_CARBON_CONTRACTS[chainId] || null;
}

/**
 * Set contract address for a specific testnet
 */
export function setContractAddress(chainId: string, address: string): void {
  BLUE_CARBON_CONTRACTS[chainId] = address;
}

/**
 * Environment variables for testnet deployment
 */
export const TESTNET_ENV_VARS = {
  // RPC URLs
  SEPOLIA_RPC_URL: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
  MUMBAI_RPC_URL: "https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY",
  BSC_TESTNET_RPC_URL: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  AVALANCHE_FUJI_RPC_URL: "https://api.avax-test.network/ext/bc/C/rpc",
  
  // API Keys (optional)
  ETHERSCAN_API_KEY: "YOUR_ETHERSCAN_API_KEY",
  POLYGONSCAN_API_KEY: "YOUR_POLYGONSCAN_API_KEY",
  BSCSCAN_API_KEY: "YOUR_BSCSCAN_API_KEY",
  SNOWTRACE_API_KEY: "YOUR_SNOWTRACE_API_KEY",
  
  // Private Key (NEVER commit this!)
  PRIVATE_KEY: "YOUR_TESTNET_WALLET_PRIVATE_KEY",
};

/**
 * Free RPC alternatives (no API key required)
 */
export const FREE_RPC_URLS = {
  sepolia: [
    "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    "https://rpc.sepolia.org",
    "https://sepolia.gateway.tenderly.co",
  ],
  mumbai: [
    "https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY",
    "https://rpc-mumbai.maticvigil.com",
    "https://matic-mumbai.chainstacklabs.com",
  ],
  bscTestnet: [
    "https://data-seed-prebsc-1-s1.binance.org:8545/",
    "https://data-seed-prebsc-2-s1.binance.org:8545/",
  ],
  avalancheFuji: [
    "https://api.avax-test.network/ext/bc/C/rpc",
    "https://rpc.ankr.com/avalanche_fuji",
  ],
};

/**
 * Gas price recommendations for different testnets
 */
export const GAS_PRICE_RECOMMENDATIONS = {
  sepolia: {
    slow: "1000000000",    // 1 gwei
    standard: "20000000000", // 20 gwei
    fast: "50000000000",   // 50 gwei
  },
  mumbai: {
    slow: "1000000000",    // 1 gwei
    standard: "30000000000", // 30 gwei
    fast: "100000000000",  // 100 gwei
  },
  bscTestnet: {
    slow: "5000000000",    // 5 gwei
    standard: "10000000000", // 10 gwei
    fast: "20000000000",   // 20 gwei
  },
  avalancheFuji: {
    slow: "25000000000",   // 25 gwei
    standard: "25000000000", // 25 gwei
    fast: "50000000000",   // 50 gwei
  },
};

/**
 * Deployment checklist for testnets
 */
export const DEPLOYMENT_CHECKLIST = [
  "✅ Install dependencies (npm install)",
  "✅ Create .env file with private key",
  "✅ Get testnet tokens from faucet",
  "✅ Configure RPC URLs",
  "✅ Deploy contract (npm run deploy:sepolia)",
  "✅ Verify contract on block explorer",
  "✅ Update frontend configuration",
  "✅ Test minting functionality",
  "✅ Test transfers",
  "✅ Test burning",
];

/**
 * Common deployment commands
 */
export const DEPLOYMENT_COMMANDS = {
  compile: "npm run compile",
  test: "npm test",
  deploy: {
    sepolia: "npm run deploy:sepolia",
    mumbai: "npm run deploy:mumbai",
    bsc: "npm run deploy:bsc",
    fuji: "npm run deploy:fuji",
  },
  verify: {
    sepolia: "npm run verify:sepolia",
    mumbai: "npm run verify:mumbai",
    bsc: "npm run verify:bsc",
    fuji: "npm run verify:fuji",
  },
};
