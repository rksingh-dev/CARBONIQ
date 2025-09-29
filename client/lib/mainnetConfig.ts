/**
 * Mainnet Configuration for Blue Carbon Token
 * 
 * This file contains all the necessary configuration for deploying
 * and using the Blue Carbon Token on Ethereum Mainnet.
 */

export interface MainnetConfig {
  name: string;
  chainId: string;
  rpcUrl: string;
  blockExplorer: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  gasPrice?: string;
  gasLimit?: string;
}

export const MAINNET_CONFIG: MainnetConfig = {
  name: "Ethereum Mainnet",
  chainId: "1",
  rpcUrl: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
  blockExplorer: "https://etherscan.io",
  currency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  gasPrice: "20000000000", // 20 gwei
  gasLimit: "21000",
};

/**
 * Get mainnet configuration
 */
export function getMainnetConfig(): MainnetConfig {
  return MAINNET_CONFIG;
}

/**
 * Get MetaMask network configuration for mainnet
 */
export function getMetaMaskMainnetConfig() {
  return {
    chainId: `0x${parseInt(MAINNET_CONFIG.chainId).toString(16)}`,
    chainName: MAINNET_CONFIG.name,
    nativeCurrency: MAINNET_CONFIG.currency,
    rpcUrls: [MAINNET_CONFIG.rpcUrl],
    blockExplorerUrls: [MAINNET_CONFIG.blockExplorer],
  };
}

/**
 * Check if a chain ID is Ethereum Mainnet
 */
export function isMainnet(chainId: string): boolean {
  return chainId === '0x1' || chainId === '1';
}

/**
 * Contract addresses for mainnet deployment
 */
export const MAINNET_CONTRACTS: Record<string, string> = {
  // Add deployed contract addresses here
  // "1": "0x...", // Blue Carbon Token contract address
};

/**
 * Get contract address for mainnet
 */
export function getMainnetContractAddress(): string | null {
  return MAINNET_CONTRACTS["1"] || null;
}

/**
 * Set contract address for mainnet
 */
export function setMainnetContractAddress(address: string): void {
  MAINNET_CONTRACTS["1"] = address;
}

/**
 * Gas price recommendations for mainnet
 */
export const MAINNET_GAS_PRICES = {
  slow: "15000000000",    // 15 gwei
  standard: "20000000000", // 20 gwei
  fast: "30000000000",    // 30 gwei
  instant: "50000000000", // 50 gwei
};

/**
 * Get recommended gas price for mainnet
 */
export function getRecommendedGasPrice(speed: 'slow' | 'standard' | 'fast' | 'instant' = 'standard'): string {
  return MAINNET_GAS_PRICES[speed];
}

/**
 * Environment variables for mainnet deployment
 */
export const MAINNET_ENV_VARS = {
  INFURA_KEY: process.env.REACT_APP_INFURA_KEY || '',
  ALCHEMY_KEY: process.env.REACT_APP_ALCHEMY_KEY || '',
  ETHERSCAN_API_KEY: process.env.REACT_APP_ETHERSCAN_API_KEY || '',
  PRIVATE_KEY: process.env.REACT_APP_PRIVATE_KEY || '',
  MNEMONIC: process.env.REACT_APP_MNEMONIC || '',
};

/**
 * Deployment checklist for mainnet
 */
export const MAINNET_DEPLOYMENT_CHECKLIST = [
  "✅ Set up mainnet RPC endpoint (Infura/Alchemy)",
  "✅ Configure gas prices for mainnet",
  "✅ Deploy Blue Carbon Token contract",
  "✅ Verify contract on Etherscan",
  "✅ Set up monitoring and alerts",
  "✅ Test all functionality on mainnet",
  "✅ Set up admin wallet with sufficient ETH",
  "✅ Configure production environment variables",
];
