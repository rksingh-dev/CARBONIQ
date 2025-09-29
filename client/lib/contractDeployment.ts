/**
 * Contract Deployment Utilities
 * Handles deploying new smart contracts and getting their addresses
 */

export interface DeploymentConfig {
  contractBytecode: string;
  constructorArgs?: any[];
  gasLimit?: string;
  gasPrice?: string;
}

export interface DeploymentResult {
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}

/**
 * Deploy a new smart contract and return its address
 */
export async function deployContract(
  config: DeploymentConfig
): Promise<DeploymentResult> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  try {
    // Get the deployer's address
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    const deployerAddress = accounts[0];

    // Encode constructor arguments if provided
    let data = config.contractBytecode;
    if (config.constructorArgs && config.constructorArgs.length > 0) {
      // Note: This is simplified - you'd need proper ABI encoding for complex args
      data += config.constructorArgs.map(arg => 
        arg.toString(16).padStart(64, '0')
      ).join('');
    }

    // Estimate gas for deployment
    const gasEstimate = await window.ethereum.request({
      method: 'eth_estimateGas',
      params: [{
        from: deployerAddress,
        data,
      }],
    });

    // Deploy the contract
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: deployerAddress,
        data,
        gas: gasEstimate,
        gasPrice: config.gasPrice || await getCurrentGasPrice(),
      }],
    });

    // Wait for confirmation
    const receipt = await waitForTransactionConfirmation(txHash);
    
    if (receipt.status === 'failed') {
      throw new Error('Contract deployment failed');
    }

    // Extract contract address from receipt
    const contractAddress = receipt.receipt?.contractAddress;
    if (!contractAddress) {
      throw new Error('Contract address not found in receipt');
    }

    return {
      contractAddress,
      transactionHash: txHash,
      blockNumber: receipt.blockNumber!,
      gasUsed: receipt.gasUsed!,
    };

  } catch (error: any) {
    throw new Error(`Deployment failed: ${error.message}`);
  }
}

/**
 * Get current gas price
 */
async function getCurrentGasPrice(): Promise<string> {
  return await window.ethereum.request({ method: 'eth_gasPrice' });
}

/**
 * Wait for transaction confirmation
 */
async function waitForTransactionConfirmation(
  txHash: string,
  timeoutMs: number = 300000
): Promise<any> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkTransaction = async () => {
      try {
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });
        
        if (receipt) {
          resolve({
            status: receipt.status === '0x1' ? 'confirmed' : 'failed',
            blockNumber: parseInt(receipt.blockNumber, 16),
            gasUsed: receipt.gasUsed,
            receipt,
          });
          return;
        }
        
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Transaction confirmation timeout'));
          return;
        }
        
        setTimeout(checkTransaction, 2000);
      } catch (error) {
        reject(error);
      }
    };
    
    checkTransaction();
  });
}

/**
 * Example: Deploy a simple ERC20 token
 */
export async function deployERC20Token(
  name: string,
  symbol: string,
  decimals: number = 18
): Promise<DeploymentResult> {
  // This would contain the compiled bytecode of your ERC20 contract
  // You'd get this from compiling your Solidity contract
  const contractBytecode = "0x608060405234801561001057600080fd5b50..."; // Your compiled bytecode
  
  return deployContract({
    contractBytecode,
    constructorArgs: [name, symbol, decimals],
  });
}

