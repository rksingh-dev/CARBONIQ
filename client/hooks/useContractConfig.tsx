import { useState, useEffect, useCallback } from 'react';
import { ContractConfig, validateContractConfig, getContractInfo } from '@/lib/contractUtils';

const CONTRACT_CONFIG_KEY = 'contractConfig';
const DEFAULT_CONFIG: Partial<ContractConfig> = {
  decimals: 18,
  symbol: 'CCT',
  name: 'Carbon Credit Token',
  gasLimit: '200000',
};

export function useContractConfig() {
  const [config, setConfig] = useState<ContractConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONTRACT_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = validateContractConfig(parsed);
        setConfig(validated);
      }
    } catch (err) {
      console.warn('Failed to load contract config:', err);
      // Clear invalid config from localStorage
      try {
        localStorage.removeItem(CONTRACT_CONFIG_KEY);
      } catch (clearErr) {
        console.warn('Failed to clear invalid config:', clearErr);
      }
      setError('Invalid contract configuration found. Please reconfigure.');
    }
  }, []);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    if (config) {
      try {
        localStorage.setItem(CONTRACT_CONFIG_KEY, JSON.stringify(config));
      } catch (err) {
        console.warn('Failed to save contract config:', err);
      }
    }
  }, [config]);

  /**
   * Update contract configuration
   */
  const updateConfig = useCallback((newConfig: Partial<ContractConfig>) => {
    try {
      const validated = validateContractConfig({ ...config, ...newConfig });
      setConfig(validated);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [config]);

  /**
   * Auto-detect contract configuration from address
   */
  const detectConfig = useCallback(async (address: string) => {
    if (!window.ethereum) {
      setError('MetaMask not found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const contractInfo = await getContractInfo(address);
      const newConfig: ContractConfig = {
        address,
        decimals: contractInfo.decimals,
        symbol: contractInfo.symbol,
        name: contractInfo.name,
        gasLimit: config?.gasLimit || DEFAULT_CONFIG.gasLimit,
        gasPrice: config?.gasPrice,
      };

      setConfig(validateContractConfig(newConfig));
    } catch (err: any) {
      setError(`Failed to detect contract: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [config?.gasLimit, config?.gasPrice]);

  /**
   * Reset to default configuration
   */
  const resetConfig = useCallback(() => {
    setConfig(null);
    setError(null);
    try {
      localStorage.removeItem(CONTRACT_CONFIG_KEY);
    } catch (err) {
      console.warn('Failed to clear contract config:', err);
    }
  }, []);

  /**
   * Validate current configuration
   */
  const validateCurrentConfig = useCallback(() => {
    if (!config) {
      setError('No contract configuration set');
      return false;
    }

    try {
      validateContractConfig(config);
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [config]);

  /**
   * Get configuration for minting
   */
  const getMintConfig = useCallback((): ContractConfig | null => {
    if (!config || !validateCurrentConfig()) {
      return null;
    }
    return config;
  }, [config, validateCurrentConfig]);

  return {
    config,
    isLoading,
    error,
    updateConfig,
    detectConfig,
    resetConfig,
    validateCurrentConfig,
    getMintConfig,
    hasConfig: !!config,
    isValid: !error && !!config,
  };
}
