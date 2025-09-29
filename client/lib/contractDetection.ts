/**
 * Enhanced Contract Detection Utilities
 * Provides robust contract detection with multiple function selector support
 */

export interface ContractFunction {
  name: string;
  selector: string;
  signature: string;
}

export interface ContractDetectionResult {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  functions: ContractFunction[];
  isERC20: boolean;
  hasMintFunction: boolean;
  mintFunction?: ContractFunction;
}

// Common ERC20 function selectors with multiple variations
export const ERC20_FUNCTIONS = {
  // Standard ERC20
  totalSupply: ['0x18160ddd'],
  balanceOf: ['0x70a08231'],
  transfer: ['0xa9059cbb'],
  transferFrom: ['0x23b872dd'],
  approve: ['0x095ea7b3'],
  allowance: ['0xdd62ed3e'],
  
  // ERC20 Metadata
  name: ['0x06fdde03'],
  symbol: ['0x95d89b41'],
  decimals: ['0x313ce567'],
  
  // Common minting function variations
  mint: [
    '0x40c10f19', // mint(address,uint256)
    '0x4e1273f4', // mintTo(address,uint256)
    '0x6a627842', // mintWithMetadata(address,uint256,string)
    '0xa0712d68', // mint(address,uint256) - alternative
    '0x1249c58b', // mint(address,uint256) - another variation
  ],
  
  // Events
  Transfer: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
  Mint: ['0x0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d4121396885'],
} as const;

/**
 * Detect contract functions by testing common selectors
 */
export async function detectContractFunctions(contractAddress: string): Promise<ContractFunction[]> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  const functions: ContractFunction[] = [];
  
  // Test each function selector
  for (const [functionName, selectors] of Object.entries(ERC20_FUNCTIONS)) {
    for (const selector of selectors) {
      try {
        // Try to call the function (this will fail for non-existent functions)
        await window.ethereum.request({
          method: 'eth_call',
          params: [{ 
            to: contractAddress, 
            data: selector + '0'.repeat(64) // Pad with zeros for testing
          }, 
          'latest'
        ]
        });
        
        // If we get here, the function exists
        functions.push({
          name: functionName,
          selector,
          signature: getFunctionSignature(functionName, selector)
        });
        
        // Only add the first working selector for each function
        break;
      } catch (error) {
        // Function doesn't exist or failed, continue to next selector
        continue;
      }
    }
  }
  
  return functions;
}

/**
 * Get function signature from name and selector
 */
function getFunctionSignature(name: string, selector: string): string {
  const signatures: Record<string, string> = {
    '0x18160ddd': 'totalSupply()',
    '0x70a08231': 'balanceOf(address)',
    '0xa9059cbb': 'transfer(address,uint256)',
    '0x23b872dd': 'transferFrom(address,address,uint256)',
    '0x095ea7b3': 'approve(address,uint256)',
    '0xdd62ed3e': 'allowance(address,address)',
    '0x06fdde03': 'name()',
    '0x95d89b41': 'symbol()',
    '0x313ce567': 'decimals()',
    '0x40c10f19': 'mint(address,uint256)',
    '0x4e1273f4': 'mintTo(address,uint256)',
    '0x6a627842': 'mintWithMetadata(address,uint256,string)',
  };
  
  return signatures[selector] || `${name}(${selector})`;
}

/**
 * Enhanced contract detection with function discovery
 */
export async function detectContractEnhanced(contractAddress: string): Promise<ContractDetectionResult> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  if (!isValidAddress(contractAddress)) {
    throw new Error('Invalid contract address');
  }

  try {
    // Get basic contract info
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      callContractFunction(contractAddress, ERC20_FUNCTIONS.name[0]),
      callContractFunction(contractAddress, ERC20_FUNCTIONS.symbol[0]),
      callContractFunction(contractAddress, ERC20_FUNCTIONS.decimals[0]),
      callContractFunction(contractAddress, ERC20_FUNCTIONS.totalSupply[0]),
    ]);

    // Detect available functions
    const functions = await detectContractFunctions(contractAddress);
    
    // Check if it's a standard ERC20
    const isERC20 = functions.some(f => f.name === 'totalSupply') &&
                   functions.some(f => f.name === 'balanceOf') &&
                   functions.some(f => f.name === 'transfer');
    
    // Find mint function
    const mintFunction = functions.find(f => f.name === 'mint');
    const hasMintFunction = !!mintFunction;

    const decimalsNum = parseInt(decimals, 16);
    
    return {
      name: decodeString(name),
      symbol: decodeString(symbol),
      decimals: decimalsNum,
      totalSupply: formatAmount(BigInt(totalSupply), decimalsNum),
      functions,
      isERC20,
      hasMintFunction,
      mintFunction,
    };
  } catch (error) {
    throw new Error(`Contract detection failed: ${parseContractError(error)}`);
  }
}

/**
 * Call a contract function and return the result
 */
async function callContractFunction(contractAddress: string, selector: string): Promise<string> {
  const result = await window.ethereum.request({
    method: 'eth_call',
    params: [{ to: contractAddress, data: selector }, 'latest'],
  });
  
  return result;
}

/**
 * Decode string from hex response
 */
function decodeString(hex: string): string {
  if (!hex || hex === '0x') return '';
  
  try {
    const hexString = hex.slice(2);
    let result = '';
    
    for (let i = 0; i < hexString.length; i += 2) {
      const byte = parseInt(hexString.substr(i, 2), 16);
      if (byte === 0) break;
      result += String.fromCharCode(byte);
    }
    
    return result;
  } catch (error) {
    console.warn('Failed to decode hex string:', hex, error);
    return '';
  }
}

/**
 * Format amount from contract response
 */
function formatAmount(amount: bigint, decimals: number): string {
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
 * Validate Ethereum address
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Parse contract error
 */
function parseContractError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'Unknown error occurred';
}




