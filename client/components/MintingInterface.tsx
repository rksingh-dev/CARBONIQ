import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMinting } from '@/hooks/useMinting';
import { useContractConfig } from '@/hooks/useContractConfig';
import { useToast } from '@/hooks/use-toast';
import { useDebounce, usePerformanceMonitor } from '@/lib/performance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Zap, RefreshCw } from 'lucide-react';
import { isValidAddress } from '@/lib/contractUtils';

interface MintingInterfaceProps {
  recipientAddress: string;
  onMintSuccess?: (txHash: string) => void;
  onMintError?: (error: string) => void;
  disabled?: boolean;
}

export function MintingInterface({ 
  recipientAddress: initialRecipientAddress, 
  onMintSuccess, 
  onMintError,
  disabled = false 
}: MintingInterfaceProps) {
  const { config, isLoading: configLoading, error: configError, updateConfig, detectConfig, getMintConfig } = useContractConfig();
  const [contractAddress, setContractAddress] = useState(config?.address || '');
  const [contractAddressError, setContractAddressError] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState(initialRecipientAddress);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [gasPrice, setGasPrice] = useState('');
  const [gasLimit, setGasLimit] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [detectStatus, setDetectStatus] = useState<'idle' | 'loading' | 'success' | 'error'>("idle");
  const [detectMessage, setDetectMessage] = useState<string | null>(null);

  const { toast } = useToast();
  const { 
    mint, 
    estimateGas, 
    isMinting, 
    isEstimatingGas, 
    gasEstimate, 
    error: mintError, 
    currentTransaction,
    canMint,
    hasError,
    clearError,
    balance,
    isBalanceLow,
    refreshBalance
  } = useMinting();

  // Performance monitoring
  usePerformanceMonitor('MintingInterface');

  // Auto-detect contract when address changes
  useEffect(() => {
    if (config?.address && !config.name) {
      detectConfig(config.address);
    }
  }, [config?.address, detectConfig]);

  // Clear errors when component unmounts or recipient changes
  useEffect(() => {
    clearError();
  }, [recipientAddress, clearError]);

  // Debounced amount validation
  const debouncedAmountValidation = useDebounce(async (value: string) => {
    if (!value || !config) return;
    
    setIsValidating(true);
    try {
      // Validate amount format
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return;
      }
      
      // Check if amount is reasonable (not too large)
      if (num > 1000000) {
        toast({
          title: 'Amount Too Large',
          description: 'Please enter a smaller amount',
          variant: 'destructive',
        });
        return;
      }
      
      // Auto-estimate gas for valid amounts
      if (num > 0) {
        await estimateGas(recipientAddress, config, { to: recipientAddress, amount: value, description });
      }
    } catch (error) {
      console.warn('Amount validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  }, 500);

  const handleAmountChange = useCallback((value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length <= 2) {
      setAmount(sanitized);
      debouncedAmountValidation(sanitized);
    }
  }, [debouncedAmountValidation]);

  // Contract address input handler
  const handleContractAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow 0x-prefixed hex strings up to 42 chars
    if (/^0x[a-fA-F0-9]{0,40}$/.test(value) || value === '') {
      setContractAddress(value);
      updateConfig({ address: value });
      setContractAddressError(null); // Clear error on input
    }
  };

  // Enhanced detect handler with feedback
  const handleDetectClick = async () => {
    if (!contractAddress || !isValidAddress(contractAddress)) return;
    setDetectStatus('loading');
    setDetectMessage(null);
    try {
      await detectConfig(contractAddress);
      setDetectStatus('success');
      setDetectMessage('Contract detected successfully!');
      setTimeout(() => {
        setDetectStatus('idle');
        setDetectMessage(null);
      }, 2000);
    } catch (err: any) {
      setDetectStatus('error');
      const msg = err?.message || 'Failed to detect contract.';
      setDetectMessage(
        msg +
        '\nPossible causes: Invalid address, contract not deployed, wrong network, or MetaMask not connected.'
      );
      console.error('Detect contract error:', err);
    }
  };

  // Memoized computed values
  const isValidAmount = useMemo(() => {
    const num = parseFloat(amount);
    return amount && !isNaN(num) && num > 0 && num <= 1000000;
  }, [amount]);

  const canProceed = useMemo(() => {
    return canMint && isValidAmount && config && !configError && !isValidating;
  }, [canMint, isValidAmount, config, configError, isValidating]);

  const estimatedCostUSD = useMemo(() => {
    if (!gasEstimate?.estimatedCostUSD) return null;
    return `$${gasEstimate.estimatedCostUSD}`;
  }, [gasEstimate?.estimatedCostUSD]);

  // Memoized handlers
  const handleGasEstimate = useCallback(async () => {
    if (!amount || !config || !recipientAddress) return;

    try {
      await estimateGas(recipientAddress, config, { to: recipientAddress, amount, description });
    } catch (error: any) {
      toast({
        title: 'Gas Estimation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [amount, config, recipientAddress, description, estimateGas, toast]);

  const handleMint = useCallback(async () => {
    if (!amount || !config || !recipientAddress) return;

    try {
      const mintConfig = getMintConfig();
      if (!mintConfig) {
        throw new Error('Invalid contract configuration');
      }

      const result = await mint(recipientAddress, mintConfig, {
        to: recipientAddress,
        amount,
        description,
      }, {
        waitForConfirmation: true,
        onProgress: (status) => {
          console.log('Minting progress:', status);
        }
      });

      if (result.status === 'confirmed') {
        onMintSuccess?.(result.hash);
        setAmount('');
        setDescription('');
      }
    } catch (error: any) {
      onMintError?.(error.message);
    }
  }, [amount, config, recipientAddress, description, getMintConfig, mint, onMintSuccess, onMintError]);

  const handleRefreshBalance = useCallback(() => {
    if (recipientAddress) {
      refreshBalance(recipientAddress);
    }
  }, [recipientAddress, refreshBalance]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Mint Tokens
          {config && (
            <Badge variant="secondary" className="text-xs">
              {config.symbol}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Mint new tokens directly to the user's wallet
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Contract Configuration */}
        <div className="space-y-2">
          <Label htmlFor="contract-address">Contract Address</Label>
          <div className="flex gap-2">
            <Input
              id="contract-address"
              value={contractAddress}
              onChange={handleContractAddressChange}
              placeholder="0x..."
              disabled={isMinting || disabled}
              className="font-mono text-sm"
              maxLength={42}
              autoComplete="off"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetectClick}
              disabled={!contractAddress || !!contractAddressError || configLoading || isMinting || detectStatus === 'loading'}
            >
              {detectStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Detect'}
            </Button>
          </div>
          {(contractAddressError || detectStatus === 'error' || detectStatus === 'success') && (
            <Alert variant={detectStatus === 'success' ? 'default' : 'destructive'}>
              {detectStatus === 'success' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {detectStatus === 'success' ? detectMessage : contractAddressError || detectMessage}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Contract Info */}
        {config && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <p className="font-medium">{config.name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Symbol</Label>
              <p className="font-medium">{config.symbol}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Decimals</Label>
              <p className="font-medium">{config.decimals}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Gas Limit</Label>
              <p className="font-medium">{config.gasLimit}</p>
            </div>
          </div>
        )}

        <Separator />

        {/* Minting Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              value={recipientAddress}
              onChange={e => setRecipientAddress(e.target.value)}
              className="font-mono text-sm bg-muted"
              disabled={isMinting || disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Mint</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="100.5"
                disabled={isMinting || disabled}
                className="text-right"
              />
              {config && (
                <span className="flex items-center px-3 py-2 text-sm text-muted-foreground border rounded-md bg-muted">
                  {config.symbol}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Carbon credit verification reward"
              disabled={isMinting || disabled}
            />
          </div>

          {/* Advanced Options */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isMinting || disabled}
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>
            
            {showAdvanced && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <Label htmlFor="gas-limit">Gas Limit</Label>
                  <Input
                    id="gas-limit"
                    value={gasLimit || config?.gasLimit || ''}
                    onChange={(e) => setGasLimit(e.target.value)}
                    placeholder="200000"
                    disabled={isMinting || disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gas-price">Gas Price (Gwei)</Label>
                  <Input
                    id="gas-price"
                    value={gasPrice}
                    onChange={(e) => setGasPrice(e.target.value)}
                    placeholder="Auto"
                    disabled={isMinting || disabled}
                  />
                </div>
              </div>
            )}
          </div>

        {/* Balance Information */}
        {balance && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Account Balance:</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${isBalanceLow ? 'text-destructive' : ''}`}>
                  {balance} ETH
                </span>
                {isBalanceLow && (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshBalance}
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {isBalanceLow && (
              <p className="text-xs text-destructive mt-1">
                Low balance - may not have enough ETH for gas fees
              </p>
            )}
          </div>
        )}

        {/* Gas Estimation */}
        {gasEstimate && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated Cost:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{gasEstimate.estimatedCost} ETH</span>
                {estimatedCostUSD && (
                  <span className="text-xs text-muted-foreground">
                    ({estimatedCostUSD})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Gas Limit:</span>
              <span className="font-mono">{gasEstimate.gasLimit}</span>
            </div>
            {gasEstimate.priorityFee && (
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Priority Fee:</span>
                <span className="font-mono">{gasEstimate.priorityFee}</span>
              </div>
            )}
          </div>
        )}

        {/* Validation Status */}
        {isValidating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Validating amount...</span>
          </div>
        )}

          {/* Error Display */}
          {hasError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{mintError}</AlertDescription>
            </Alert>
          )}

          {/* Transaction Status */}
          {currentTransaction && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Transaction pending: {currentTransaction.slice(0, 10)}...
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto ml-2"
                  onClick={() => window.open(`https://etherscan.io/tx/${currentTransaction}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleGasEstimate}
              disabled={!isValidAmount || !config || isEstimatingGas || isMinting || disabled}
              variant="outline"
              className="flex-1"
            >
              {isEstimatingGas ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Estimating...
                </>
              ) : (
                'Estimate Gas'
              )}
            </Button>
            
            <Button
              onClick={handleMint}
              disabled={!canProceed || isMinting}
              className="flex-1"
            >
              {isMinting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Minting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mint Tokens
                </>
              )}
            </Button>
          </div>
          {/* Debug panel for Mint button state */}
          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs text-gray-700 dark:text-gray-300">
            <div><b>Mint Button Debug:</b></div>
            <div>canMint: {String(canMint)}</div>
            <div>isValidAmount: {String(isValidAmount)}</div>
            <div>config: {config ? 'set' : 'null'}</div>
            <div>configError: {configError || 'none'}</div>
            <div>isValidating: {String(isValidating)}</div>
            <div>canProceed: {String(canProceed)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
