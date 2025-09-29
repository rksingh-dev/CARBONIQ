import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  ContractConfig,
  MintParams,
  TransactionResult,
  GasEstimate,
  RetryOptions,
  validateContractConfig,
  parseAmount,
  encodeMintData,
  estimateMintGas,
  waitForTransactionConfirmation,
  getContractInfo,
  parseContractError,
  isValidAddress,
  withRetry,
  validateTransaction,
  getAccountBalance,
} from '@/lib/contractUtils';

interface MintingState {
  isMinting: boolean;
  isEstimatingGas: boolean;
  currentTransaction: string | null;
  gasEstimate: GasEstimate | null;
  error: string | null;
  balance: string | null;
  isBalanceLoading: boolean;
  lastMintParams: MintParams | null;
  retryCount: number;
}

interface MintingOptions {
  waitForConfirmation?: boolean;
  confirmationTimeout?: number;
  retryAttempts?: number;
  onProgress?: (status: string) => void;
  retryOptions?: Partial<RetryOptions>;
  validateBalance?: boolean;
  customGasPrice?: string;
  customGasLimit?: string;
}

export function useMinting() {
  const [state, setState] = useState<MintingState>({
    isMinting: false,
    isEstimatingGas: false,
    currentTransaction: null,
    gasEstimate: null,
    error: null,
    balance: null,
    isBalanceLoading: false,
    lastMintParams: null,
    retryCount: 0,
  });
  
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const balanceCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check account balance
   */
  const checkBalance = useCallback(async (address: string): Promise<void> => {
    if (!address) return;

    setState(prev => ({ ...prev, isBalanceLoading: true }));

    try {
      const balance = await getAccountBalance(address);
      setState(prev => ({ 
        ...prev, 
        balance,
        isBalanceLoading: false 
      }));
    } catch (error) {
      console.warn('Failed to check balance:', error);
      setState(prev => ({ 
        ...prev, 
        isBalanceLoading: false 
      }));
    }
  }, []);

  /**
   * Estimate gas for minting operation with enhanced validation
   */
  const estimateGas = useCallback(async (
    from: string,
    contractConfig: ContractConfig,
    mintParams: MintParams
  ): Promise<GasEstimate> => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    if (!isValidAddress(from)) {
      throw new Error('Invalid sender address');
    }

    if (!isValidAddress(mintParams.to)) {
      throw new Error('Invalid recipient address');
    }

    setState(prev => ({ ...prev, isEstimatingGas: true, error: null }));

    try {
      const validatedConfig = validateContractConfig(contractConfig);
      const amount = parseAmount(mintParams.amount, validatedConfig.decimals);
      
      // Check balance if needed (debounced to prevent race conditions)
      if (balanceCheckTimeoutRef.current) {
        clearTimeout(balanceCheckTimeoutRef.current);
      }
      balanceCheckTimeoutRef.current = setTimeout(() => {
        checkBalance(from);
      }, 1000);
      
      const estimate = await withRetry(
        () => estimateMintGas(from, validatedConfig.address, mintParams.to, amount),
        { maxRetries: 2, baseDelay: 1000 }
      );

      setState(prev => ({ 
        ...prev, 
        gasEstimate: estimate,
        isEstimatingGas: false 
      }));

      return estimate;
    } catch (error) {
      const errorMessage = parseContractError(error);
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isEstimatingGas: false 
      }));
      throw new Error(errorMessage);
    }
  }, [checkBalance]);

  /**
   * Mint tokens to a user's wallet with enhanced validation and error handling
   */
  const mint = useCallback(async (
    from: string,
    contractConfig: ContractConfig,
    mintParams: MintParams,
    options: MintingOptions = {}
  ): Promise<TransactionResult> => {
    const {
      waitForConfirmation = true,
      confirmationTimeout = 300000,
      retryAttempts = 3,
      onProgress,
      retryOptions,
      validateBalance = true,
      customGasPrice,
      customGasLimit,
    } = options;

    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    if (!isValidAddress(from)) {
      throw new Error('Invalid sender address');
    }

    if (!isValidAddress(mintParams.to)) {
      throw new Error('Invalid recipient address');
    }

    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ 
      ...prev, 
      isMinting: true, 
      error: null,
      currentTransaction: null,
      lastMintParams: mintParams,
      retryCount: 0,
    }));

    onProgress?.('Preparing mint transaction...');

    try {
      const validatedConfig = validateContractConfig(contractConfig);
      const amount = parseAmount(mintParams.amount, validatedConfig.decimals);
      
      onProgress?.('Encoding transaction data...');
      const data = encodeMintData(mintParams.to, amount);

      onProgress?.('Estimating gas...');
      const gasEstimate = await estimateMintGas(
        from,
        validatedConfig.address,
        mintParams.to,
        amount
      );

      // Validate balance if requested (using the gas estimate we just got)
      if (validateBalance) {
        onProgress?.('Checking account balance...');
        const balance = await getAccountBalance(from);
        const balanceWei = BigInt(parseAmount(balance, 18));
        const gasCostWei = BigInt(gasEstimate.gasLimit) * BigInt(gasEstimate.gasPrice);
        
        if (balanceWei < gasCostWei) {
          throw new Error('Insufficient ETH balance for gas fees');
        }
      }

      // Use custom gas settings if provided
      const finalGasLimit = customGasLimit || gasEstimate.gasLimit;
      const finalGasPrice = customGasPrice || gasEstimate.gasPrice;

      // Validate transaction parameters
      validateTransaction(from, validatedConfig.address, '0x0', finalGasLimit, finalGasPrice);

      onProgress?.('Sending transaction to MetaMask...');
      
      const txParams: any = {
        from,
        to: validatedConfig.address,
        value: '0x0',
        data,
        gas: finalGasLimit,
      };

      // Add gas price or EIP-1559 fees
      if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
        txParams.maxFeePerGas = gasEstimate.maxFeePerGas;
        txParams.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas;
      } else {
        txParams.gasPrice = finalGasPrice;
      }

      const txHash = await withRetry(
        () => window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        }),
        retryOptions || { maxRetries: 2, baseDelay: 1000 }
      );

      setState(prev => ({ 
        ...prev, 
        currentTransaction: txHash 
      }));

      onProgress?.('Transaction submitted, waiting for confirmation...');

      if (waitForConfirmation) {
        const result = await waitForTransactionConfirmation(
          txHash,
          confirmationTimeout
        );

        if (result.status === 'confirmed') {
          toast({
            title: 'Mint Successful',
            description: `Successfully minted ${mintParams.amount} ${validatedConfig.symbol} to ${mintParams.to.slice(0, 6)}...${mintParams.to.slice(-4)}`,
          });
          
          // Update balance after successful mint
          checkBalance(from);
        } else {
          throw new Error(result.error || 'Transaction failed');
        }

        setState(prev => ({ 
          ...prev, 
          isMinting: false,
          currentTransaction: null,
          retryCount: 0,
        }));

        return result;
      } else {
        setState(prev => ({ 
          ...prev, 
          isMinting: false,
          currentTransaction: null,
          retryCount: 0,
        }));

        toast({
          title: 'Transaction Submitted',
          description: `Mint transaction submitted. Hash: ${txHash.slice(0, 10)}...`,
        });

        return {
          hash: txHash,
          status: 'pending',
        };
      }
    } catch (error: any) {
      const errorMessage = parseContractError(error);
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isMinting: false,
        currentTransaction: null,
        retryCount: prev.retryCount + 1,
      }));

      toast({
        title: 'Mint Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      throw new Error(errorMessage);
    }
  }, [toast, estimateGas, checkBalance]);


  /**
   * Cancel current operation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (balanceCheckTimeoutRef.current) {
      clearTimeout(balanceCheckTimeoutRef.current);
      balanceCheckTimeoutRef.current = null;
    }
    
    setState(prev => ({ 
      ...prev, 
      isMinting: false,
      isEstimatingGas: false,
      currentTransaction: null,
      error: null,
      retryCount: 0,
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Retry last operation (if applicable)
   */
  const retry = useCallback(async (
    from: string,
    contractConfig: ContractConfig,
    mintParams: MintParams,
    options?: MintingOptions
  ) => {
    if (state.error && state.lastMintParams) {
      clearError();
      return mint(from, contractConfig, mintParams, options);
    }
    throw new Error('No operation to retry');
  }, [state.error, state.lastMintParams, clearError, mint]);

  /**
   * Refresh balance for current account
   */
  const refreshBalance = useCallback(async (address: string) => {
    await checkBalance(address);
  }, [checkBalance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (balanceCheckTimeoutRef.current) {
        clearTimeout(balanceCheckTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    mint,
    estimateGas,
    cancel,
    clearError,
    retry,
    refreshBalance,
    checkBalance,
    
    // Computed
    canMint: !state.isMinting && !state.isEstimatingGas && !state.error,
    hasError: !!state.error,
    isOperationInProgress: state.isMinting || state.isEstimatingGas,
    canRetry: !!state.error && !!state.lastMintParams && state.retryCount < 3,
    hasBalance: state.balance !== null,
    isBalanceLow: state.balance ? parseFloat(state.balance) < 0.001 : false,
  };
}
