/**
 * Smart Contract Utilities for Carbon Credit Token Minting
 * Provides robust contract interaction functions with comprehensive error handling
 * Enhanced with retry logic, caching, and improved error recovery
 */

export interface ContractConfig {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId?: number;
}

export interface MintParams {
  to: string;
  amount: string; // Human readable amount (e.g., "100.5")
  description?: string;
  metadata?: Record<string, any>;
}

export interface TransactionResult {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  effectiveGasPrice?: string;
  error?: string;
  receipt?: any;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string; // in ETH
  estimatedCostUSD?: string; // in USD
  priorityFee?: string; // in Gwei
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ContractInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  balance?: string;
  owner?: string;
  isPaused?: boolean;
  mintingEnabled?: boolean;
}

// Common ERC20 function selectors
export const ERC20_SELECTORS = {
  // ERC20 Standard
  totalSupply: '0x18160ddd',
  balanceOf: '0x70a08231',
  transfer: '0xa9059cbb',
  transferFrom: '0x23b872dd',
  approve: '0x095ea7b3',
  allowance: '0xdd62ed3e',
  
  // ERC20 Metadata
  name: '0x06fdde03',
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  
  // Blue Carbon Token specific functions
  mint: '0x40c10f19', // mint(address,uint256)
  mintCarbonCredit: '0x12345678', // mintCarbonCredit(address,uint256,string,string)
  burnCarbonCredit: '0x87654321', // burnCarbonCredit(uint256,string)
  addMinter: '0x8da5cb5b', // addMinter(address)
  removeMinter: '0x8da5cb5c', // removeMinter(address)
  setTransfersEnabled: '0x8da5cb5d', // setTransfersEnabled(bool)
  pause: '0x8456cb59', // pause()
  unpause: '0x3f4ba83a', // unpause()
  
  // Events
  Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  CarbonCreditMinted: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  CarbonCreditBurned: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
} as const;

// Common error codes and messages
export const CONTRACT_ERRORS = {
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INSUFFICIENT_ALLOWANCE: 'Insufficient allowance',
  TRANSFER_FAILED: 'Transfer failed',
  MINT_FAILED: 'Mint failed',
  UNAUTHORIZED: 'Unauthorized',
  INVALID_ADDRESS: 'Invalid address',
  INVALID_AMOUNT: 'Invalid amount',
  CONTRACT_PAUSED: 'Contract is paused',
  MAX_SUPPLY_EXCEEDED: 'Maximum supply exceeded',
  MINTING_DISABLED: 'Minting is disabled',
  NETWORK_ERROR: 'Network error',
  TIMEOUT: 'Transaction timeout',
  USER_REJECTED: 'User rejected transaction',
  INSUFFICIENT_FUNDS: 'Insufficient funds for gas',
  GAS_LIMIT_EXCEEDED: 'Gas limit exceeded',
  NONCE_TOO_LOW: 'Nonce too low',
  EXECUTION_REVERTED: 'Transaction execution reverted',
  UNKNOWN_ERROR: 'Unknown error occurred',
} as const;

// Default retry configuration
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Cache for contract info to avoid repeated calls
const contractInfoCache = new Map<string, { data: ContractInfo; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting for API calls
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

/**
 * Pad hex string to 32 bytes (64 hex characters)
 */
export function pad32(hex: string): string {
  return hex.replace(/^0x/, '').padStart(64, '0');
}

/**
 * Convert BigInt to hex string
 */
export function toHexAmount(amount: bigint): string {
  return '0x' + amount.toString(16);
}

/**
 * Convert human-readable amount to contract amount (considering decimals)
 * Enhanced with better precision handling and validation
 */
export function parseAmount(amount: string, decimals: number): bigint {
  if (!amount || typeof amount !== 'string') {
    throw new Error(CONTRACT_ERRORS.INVALID_AMOUNT);
  }

  const trimmed = amount.trim();
  if (trimmed === '') {
    throw new Error(CONTRACT_ERRORS.INVALID_AMOUNT);
  }

  // Check for valid number format
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(CONTRACT_ERRORS.INVALID_AMOUNT);
  }

  const num = parseFloat(trimmed);
  if (!isFinite(num) || num < 0) {
    throw new Error(CONTRACT_ERRORS.INVALID_AMOUNT);
  }

  // Check for overflow
  if (num > Number.MAX_SAFE_INTEGER) {
    throw new Error('Amount too large');
  }

  const multiplier = 10n ** BigInt(decimals);
  
  // Handle decimal places more precisely
  const [integerPart, decimalPart] = trimmed.split('.');
  const integerBigInt = BigInt(integerPart);
  
  if (decimalPart) {
    const decimalDigits = decimalPart.length;
    const maxDecimalDigits = Math.min(decimals, 18); // Solidity max decimals
    
    if (decimalDigits > maxDecimalDigits) {
      throw new Error(`Too many decimal places. Maximum: ${maxDecimalDigits}`);
    }
    
    const decimalBigInt = BigInt(decimalPart.padEnd(maxDecimalDigits, '0'));
    const decimalMultiplier = 10n ** BigInt(maxDecimalDigits);
    
    return integerBigInt * multiplier + (decimalBigInt * multiplier) / decimalMultiplier;
  }
  
  return integerBigInt * multiplier;
}

/**
 * Convert contract amount to human-readable amount
 */
export function formatAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integerPart = amount / divisor;
  const decimalPart = amount % divisor;
  
  if (decimalPart === 0n) {
    return integerPart.toString();
  }
  
  const decimalStr = decimalPart.toString().padStart(decimals, '0');
  const trimmedDecimal = decimalStr.replace(/0+$/, '');
  
  if (trimmedDecimal === '') {
    return integerPart.toString();
  }
  
  return `${integerPart}.${trimmedDecimal}`;
}

/**
 * Encode mint function call data
 */
export function encodeMintData(to: string, amount: bigint, functionSelector: string = ERC20_SELECTORS.mint): string {
  const paddedTo = pad32(to.toLowerCase().replace(/^0x/, ''));
  const paddedAmount = pad32(toHexAmount(amount));
  return functionSelector + paddedTo + paddedAmount;
}

/**
 * Encode mintWithMetadata function call data
 */
export function encodeMintWithMetadataData(to: string, amount: bigint, metadata: string): string {
  // This is a simplified version - actual implementation depends on contract ABI
  const paddedTo = pad32(to.toLowerCase().replace(/^0x/, ''));
  const paddedAmount = pad32(toHexAmount(amount));
  // Note: String encoding would require more complex ABI encoding
  return ERC20_SELECTORS.mintWithMetadata + paddedTo + paddedAmount;
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Rate limiting helper
 */
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  limit.count++;
  return true;
}

/**
 * Retry helper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxRetries) {
        throw lastError;
      }
      
      // Don't retry on user rejection or validation errors
      if (error instanceof Error && 
          (error.message.includes('User rejected') || 
           error.message.includes('Invalid') ||
           error.message.includes('Unauthorized'))) {
        throw lastError;
      }
      
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Validate contract configuration with enhanced checks
 */
export function validateContractConfig(config: Partial<ContractConfig>): ContractConfig {
  if (!config.address || !isValidAddress(config.address)) {
    throw new Error('Invalid contract address');
  }
  
  if (config.decimals === undefined || config.decimals < 0 || config.decimals > 18) {
    throw new Error('Invalid decimals (must be 0-18)');
  }
  
  if (!config.symbol || config.symbol.trim().length === 0) {
    throw new Error('Symbol is required');
  }
  
  if (!config.name || config.name.trim().length === 0) {
    throw new Error('Name is required');
  }
  
  // Validate gas limit
  const gasLimit = config.gasLimit || '200000';
  const gasLimitNum = parseInt(gasLimit, 10);
  if (isNaN(gasLimitNum) || gasLimitNum < 21000 || gasLimitNum > 30000000) {
    throw new Error('Invalid gas limit (must be 21000-30000000)');
  }
  
  // Validate chain ID if provided
  if (config.chainId !== undefined && (config.chainId < 1 || config.chainId > 0x7fffffff)) {
    throw new Error('Invalid chain ID');
  }
  
  return {
    address: config.address.toLowerCase(),
    decimals: config.decimals,
    symbol: config.symbol.trim(),
    name: config.name.trim(),
    gasLimit,
    gasPrice: config.gasPrice,
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas,
    chainId: config.chainId,
  };
}

/**
 * Estimate gas for minting transaction
 */
export async function estimateMintGas(
  from: string,
  contractAddress: string,
  to: string,
  amount: bigint,
  functionSelector: string = ERC20_SELECTORS.mint
): Promise<GasEstimate> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  const rateLimitKey = `gas_estimate_${contractAddress}`;
  if (!checkRateLimit(rateLimitKey)) {
    throw new Error('Rate limit exceeded. Please wait before trying again.');
  }

  return withRetry(async () => {
    try {
      const data = encodeMintData(to, amount, functionSelector);
      
      // Estimate gas limit with buffer
      const gasLimit = await window.ethereum.request({
        method: 'eth_estimateGas',
        params: [{
          from,
          to: contractAddress,
          data,
          value: '0x0',
        }],
      });
      
      // Add 20% buffer to gas limit
      const gasLimitBigInt = BigInt(gasLimit);
      const bufferedGasLimit = (gasLimitBigInt * 120n) / 100n;
      
      // Get current gas price and fee data
      const [gasPrice, feeData] = await Promise.all([
        window.ethereum.request({ method: 'eth_gasPrice' }),
        window.ethereum.request({ method: 'eth_feeHistory', params: ['0x4', 'latest', [25, 50, 75]] })
      ]);
      
      // Calculate priority fee from recent blocks
      let priorityFee = '0x0';
      if (feeData?.reward && feeData.reward.length > 0) {
        const recentRewards = feeData.reward.slice(-4); // Last 4 blocks
        const avgReward = recentRewards.reduce((acc, block) => {
          const blockAvg = block.reduce((sum, fee) => sum + parseInt(fee, 16), 0) / block.length;
          return acc + blockAvg;
        }, 0) / recentRewards.length;
        priorityFee = '0x' + Math.floor(avgReward).toString(16);
      }
      
      // Calculate costs
      const gasPriceWei = BigInt(gasPrice);
      const estimatedCostWei = gasPriceWei * bufferedGasLimit;
      const estimatedCostEth = Number(estimatedCostWei) / 1e18;
      
      // Try to get USD price (optional)
      let estimatedCostUSD: string | undefined;
      try {
        const ethPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        if (ethPriceResponse.ok) {
          const ethPrice = await ethPriceResponse.json();
          const usdCost = estimatedCostEth * ethPrice.ethereum.usd;
          estimatedCostUSD = usdCost.toFixed(2);
        }
      } catch {
        // Ignore USD price fetch errors
      }
      
      return {
        gasLimit: '0x' + bufferedGasLimit.toString(16),
        gasPrice: gasPrice,
        maxFeePerGas: gasPrice, // For EIP-1559 compatibility
        maxPriorityFeePerGas: priorityFee,
        estimatedCost: estimatedCostEth.toFixed(6),
        estimatedCostUSD,
        priorityFee: (parseInt(priorityFee, 16) / 1e9).toFixed(2) + ' Gwei',
      };
    } catch (error: any) {
      throw new Error(`Gas estimation failed: ${parseContractError(error)}`);
    }
  });
}

/**
 * Parse contract error from transaction receipt or error message
 */
export function parseContractError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    // Common MetaMask errors
    if (message.includes('user rejected')) {
      return 'Transaction rejected by user';
    }
    if (message.includes('insufficient funds')) {
      return 'Insufficient ETH for gas fees';
    }
    if (message.includes('gas required exceeds allowance')) {
      return 'Gas limit too low, try increasing gas limit';
    }
    if (message.includes('execution reverted')) {
      return 'Transaction failed - contract execution reverted';
    }
    if (message.includes('nonce too low')) {
      return 'Transaction nonce too low, please try again';
    }
    
    return error.message;
  }
  
  return 'Unknown error occurred';
}

/**
 * Wait for transaction confirmation with timeout
 */
export async function waitForTransactionConfirmation(
  txHash: string,
  timeoutMs: number = 300000 // 5 minutes
): Promise<TransactionResult> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }
  
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkTransaction = async () => {
      try {
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        
        if (receipt) {
          const status = receipt.status === '0x1' ? 'confirmed' : 'failed';
          resolve({
            hash: txHash,
            status,
            blockNumber: parseInt(receipt.blockNumber, 16),
            gasUsed: receipt.gasUsed,
            error: status === 'failed' ? 'Transaction failed' : undefined,
          });
          return;
        }
        
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          resolve({
            hash: txHash,
            status: 'failed',
            error: 'Transaction confirmation timeout',
          });
          return;
        }
        
        // Check again in 2 seconds
        setTimeout(checkTransaction, 2000);
      } catch (error) {
        reject(new Error(`Failed to check transaction: ${parseContractError(error)}`));
      }
    };
    
    checkTransaction();
  });
}

/**
 * Get contract information with caching and enhanced error handling
 */
export async function getContractInfo(contractAddress: string): Promise<ContractInfo> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  if (!isValidAddress(contractAddress)) {
    throw new Error('Invalid contract address');
  }

  const normalizedAddress = contractAddress.toLowerCase();
  
  // Check cache first
  const cached = contractInfoCache.get(normalizedAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const rateLimitKey = `contract_info_${normalizedAddress}`;
  if (!checkRateLimit(rateLimitKey)) {
    throw new Error('Rate limit exceeded. Please wait before trying again.');
  }

  return withRetry(async () => {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        window.ethereum.request({
          method: 'eth_call',
          params: [{ to: normalizedAddress, data: ERC20_SELECTORS.name }, 'latest'],
        }),
        window.ethereum.request({
          method: 'eth_call',
          params: [{ to: normalizedAddress, data: ERC20_SELECTORS.symbol }, 'latest'],
        }),
        window.ethereum.request({
          method: 'eth_call',
          params: [{ to: normalizedAddress, data: ERC20_SELECTORS.decimals }, 'latest'],
        }),
        window.ethereum.request({
          method: 'eth_call',
          params: [{ to: normalizedAddress, data: ERC20_SELECTORS.totalSupply }, 'latest'],
        }),
      ]);
      
      const decimalsNum = parseInt(decimals, 16);
      const result: ContractInfo = {
        name: decodeString(name),
        symbol: decodeString(symbol),
        decimals: decimalsNum,
        totalSupply: formatAmount(BigInt(totalSupply), decimalsNum),
      };

      // Cache the result
      contractInfoCache.set(normalizedAddress, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to get contract info: ${parseContractError(error)}`);
    }
  });
}

/**
 * Decode string from hex response with enhanced error handling
 */
function decodeString(hex: string): string {
  if (!hex || hex === '0x') return '';
  
  try {
    // Remove 0x prefix and convert to string
    const hexString = hex.slice(2);
    let result = '';
    
    for (let i = 0; i < hexString.length; i += 2) {
      const byte = parseInt(hexString.substr(i, 2), 16);
      if (byte === 0) break; // Stop at null terminator
      result += String.fromCharCode(byte);
    }
    
    return result;
  } catch (error) {
    console.warn('Failed to decode hex string:', hex, error);
    return '';
  }
}

/**
 * Clear contract info cache
 */
export function clearContractInfoCache(address?: string): void {
  if (address) {
    contractInfoCache.delete(address.toLowerCase());
  } else {
    contractInfoCache.clear();
  }
}

/**
 * Get cached contract info if available
 */
export function getCachedContractInfo(address: string): ContractInfo | null {
  const cached = contractInfoCache.get(address.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * Check if MetaMask is available and connected
 */
export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/**
 * Get current network chain ID
 */
export async function getCurrentChainId(): Promise<number> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }
  
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } catch (error) {
    throw new Error(`Failed to get chain ID: ${parseContractError(error)}`);
  }
}

/**
 * Switch to a specific network
 */
export async function switchNetwork(chainId: number): Promise<void> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    // If the chain doesn't exist, try to add it
    if (error.code === 4902) {
      throw new Error(`Network with chain ID ${chainId} not found. Please add it to MetaMask.`);
    }
    throw new Error(`Failed to switch network: ${parseContractError(error)}`);
  }
}

/**
 * Get account balance in ETH
 */
export async function getAccountBalance(address: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }
  
  try {
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    
    return formatAmount(BigInt(balance), 18);
  } catch (error) {
    throw new Error(`Failed to get balance: ${parseContractError(error)}`);
  }
}

/**
 * Validate transaction before sending with comprehensive checks
 */
export function validateTransaction(
  from: string,
  to: string,
  value: string,
  gasLimit: string,
  gasPrice?: string
): void {
  if (!isValidAddress(from)) {
    throw new Error('Invalid sender address');
  }
  
  if (!isValidAddress(to)) {
    throw new Error('Invalid recipient address');
  }
  
  if (!value || value === '0x') {
    throw new Error('Invalid value');
  }
  
  const gasLimitNum = parseInt(gasLimit, 16);
  if (isNaN(gasLimitNum) || gasLimitNum < 21000) {
    throw new Error('Invalid gas limit (minimum 21000)');
  }
  
  if (gasLimitNum > 30000000) {
    throw new Error('Gas limit too high (maximum 30000000)');
  }
  
  if (gasPrice) {
    const gasPriceNum = parseInt(gasPrice, 16);
    if (isNaN(gasPriceNum) || gasPriceNum <= 0) {
      throw new Error('Invalid gas price');
    }
    
    // Check for reasonable gas price (not too high)
    if (gasPriceNum > 1000 * 1e9) { // 1000 Gwei
      throw new Error('Gas price too high (maximum 1000 Gwei)');
    }
  }
  
  // Additional validations
  if (from.toLowerCase() === to.toLowerCase()) {
    throw new Error('Sender and recipient cannot be the same address');
  }
}
