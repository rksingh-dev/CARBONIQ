import { useEffect, useState, useCallback, useRef } from "react";
import { isMetaMaskAvailable, getCurrentChainId, switchNetwork } from "@/lib/contractUtils";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      isConnected?: () => boolean;
    };
  }
}

const DISCONNECT_KEY = "wallet:manuallyDisconnected";
const WALLET_CONNECT_KEY = "wallet:connected";
const CHAIN_ID_KEY = "wallet:chainId";
const ADMIN_LOCK_KEY = "wallet:adminLock";

function getAdminLock(): boolean {
  try {
    return localStorage.getItem(ADMIN_LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

function setAdminLock(value: boolean): void {
  try {
    if (value) localStorage.setItem(ADMIN_LOCK_KEY, "1");
    else localStorage.removeItem(ADMIN_LOCK_KEY);
  } catch {
    // ignore
  }
}

interface WalletState {
  account: string | null;
  chainId: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  hasProvider: boolean;
  error: string | null;
}

interface ConnectOptions {
  forceSelect?: boolean;
  lock?: boolean; // when true, ignore external accountsChanged events
}

function getManualFlag(): boolean {
  try {
    return localStorage.getItem(DISCONNECT_KEY) === "1";
  } catch {
    return false;
  }
}

function setManualFlag(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(DISCONNECT_KEY, "1");
    } else {
      localStorage.removeItem(DISCONNECT_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredConnection(): { account: string | null; chainId: string | null } {
  try {
    const account = localStorage.getItem(WALLET_CONNECT_KEY);
    const chainId = localStorage.getItem(CHAIN_ID_KEY);
    return {
      account: account || null,
      chainId: chainId || null,
    };
  } catch {
    return { account: null, chainId: null };
  }
}

function setStoredConnection(account: string | null, chainId: string | null): void {
  try {
    if (account) {
      localStorage.setItem(WALLET_CONNECT_KEY, account);
    } else {
      localStorage.removeItem(WALLET_CONNECT_KEY);
    }
    
    if (chainId) {
      localStorage.setItem(CHAIN_ID_KEY, chainId);
    } else {
      localStorage.removeItem(CHAIN_ID_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    account: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    hasProvider: false,
    error: null,
  });
  
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize wallet state
  useEffect(() => {
    const hasProvider = isMetaMaskAvailable();
    setState(prev => ({ ...prev, hasProvider }));

    if (!hasProvider) {
      setState(prev => ({ 
        ...prev, 
        error: "MetaMask not found. Please install MetaMask to continue." 
      }));
      return;
    }

    const initializeWallet = async () => {
      try {
        const manual = getManualFlag();
        
        if (!manual) {
          // Try to restore previous connection
          const stored = getStoredConnection();
          if (stored.account && stored.chainId) {
            setState(prev => ({
              ...prev,
              account: stored.account,
              chainId: stored.chainId,
              isConnected: true,
            }));
          }

          // Verify current connection
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          const chainId = await window.ethereum.request({ method: "eth_chainId" });
          
          if (accounts?.length > 0) {
            setState(prev => ({
              ...prev,
              account: accounts[0],
              chainId,
              isConnected: true,
              error: null,
            }));
            setStoredConnection(accounts[0], chainId);
          } else {
            setState(prev => ({
              ...prev,
              account: null,
              chainId,
              isConnected: false,
            }));
            setStoredConnection(null, chainId);
          }
        } else {
          setState(prev => ({
            ...prev,
            account: null,
            isConnected: false,
          }));
        }
      } catch (error) {
        console.error("Failed to initialize wallet:", error);
        setState(prev => ({
          ...prev,
          error: "Failed to initialize wallet connection",
        }));
      }
    };

    initializeWallet();
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!isMetaMaskAvailable()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (getManualFlag()) return; // ignore updates while manually disconnected
      if (getAdminLock()) return; // ignore external changes when admin lock is enabled
      
      const account = accounts[0] ?? null;
      setState(prev => ({
        ...prev,
        account,
        isConnected: !!account,
        error: null,
      }));
      setStoredConnection(account, state.chainId);
    };

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({
        ...prev,
        chainId,
        error: null,
      }));
      setStoredConnection(state.account, chainId);
    };

    const handleConnect = () => {
      setState(prev => ({ ...prev, error: null }));
    };

    const handleDisconnect = () => {
      setState(prev => ({
        ...prev,
        account: null,
        isConnected: false,
      }));
      setStoredConnection(null, state.chainId);
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);
    window.ethereum.on?.("connect", handleConnect);
    window.ethereum.on?.("disconnect", handleDisconnect);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
      window.ethereum?.removeListener?.("connect", handleConnect);
      window.ethereum?.removeListener?.("disconnect", handleDisconnect);
    };
  }, [state.chainId, state.account]);

  const connect = useCallback(async (options?: ConnectOptions): Promise<string | null> => {
    if (!isMetaMaskAvailable()) {
      throw new Error("MetaMask not found");
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      setManualFlag(false);
      // Set or clear admin lock depending on options
      setAdminLock(!!options?.lock);
      
      // If requested, re-request permissions to open MetaMask account selection UI
      if (options?.forceSelect) {
        try {
          await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch (permError) {
          // Continue with normal flow if permissions request fails
          console.warn("wallet_requestPermissions failed, falling back to eth_requestAccounts", permError);
        }
      }
      
      const accounts: string[] = await window.ethereum.request({ 
        method: "eth_requestAccounts" 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const account = accounts[0];
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      
      setState(prev => ({
        ...prev,
        account,
        chainId,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));

      setStoredConnection(account, chainId);
      reconnectAttempts.current = 0;
      
      return account;
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to connect wallet";
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  }, []);

  const disconnect = useCallback(() => {
    setManualFlag(true);
    setAdminLock(false);
    setState(prev => ({
      ...prev,
      account: null,
      isConnected: false,
      error: null,
    }));
    setStoredConnection(null, null);
    
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset reconnection attempts
    reconnectAttempts.current = 0;
  }, []);

  const switchToNetwork = useCallback(async (chainId: number): Promise<void> => {
    if (!isMetaMaskAvailable()) {
      throw new Error("MetaMask not found");
    }

    try {
      await switchNetwork(chainId);
      const newChainId = await getCurrentChainId();
      setState(prev => ({
        ...prev,
        chainId: `0x${newChainId.toString(16)}`,
        error: null,
      }));
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to switch network";
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      throw new Error(errorMessage);
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const retryConnection = useCallback(async (): Promise<void> => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setState(prev => ({
        ...prev,
        error: "Maximum reconnection attempts reached",
      }));
      return;
    }

    reconnectAttempts.current++;
    
    try {
      await connect();
    } catch (error) {
      // Schedule retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
      reconnectTimeoutRef.current = setTimeout(() => {
        retryConnection();
      }, delay);
    }
  }, [connect]);

  return {
    // State
    account: state.account,
    chainId: state.chainId,
    isConnecting: state.isConnecting,
    isConnected: state.isConnected,
    hasProvider: state.hasProvider,
    error: state.error,
    
    // Actions
    connect,
    disconnect,
    switchToNetwork,
    switchChain: switchToNetwork,
    clearError,
    retryConnection,
  };
}
