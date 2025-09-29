import { useEffect, useState, useCallback } from "react";
import { isMetaMaskAvailable } from "@/lib/contractUtils";

interface UserWalletState {
  account: string | null;
  chainId: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  hasProvider: boolean;
  error: string | null;
}

interface ConnectOptions {
  forceSelect?: boolean;
}

const USER_WALLET_ACCOUNT_KEY = "userWallet:account";
const USER_WALLET_CHAINID_KEY = "userWallet:chainId";

function getStoredUserWallet(): { account: string | null; chainId: string | null } {
  try {
    return {
      account: localStorage.getItem(USER_WALLET_ACCOUNT_KEY),
      chainId: localStorage.getItem(USER_WALLET_CHAINID_KEY),
    };
  } catch {
    return { account: null, chainId: null };
  }
}

function setStoredUserWallet(account: string | null, chainId: string | null) {
  try {
    if (account) localStorage.setItem(USER_WALLET_ACCOUNT_KEY, account);
    else localStorage.removeItem(USER_WALLET_ACCOUNT_KEY);

    if (chainId) localStorage.setItem(USER_WALLET_CHAINID_KEY, chainId);
    else localStorage.removeItem(USER_WALLET_CHAINID_KEY);
  } catch {
    // ignore storage errors
  }
}

export function useUserWallet() {
  const [state, setState] = useState<UserWalletState>({
    account: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    hasProvider: false,
    error: null,
  });

  // Initialize from storage; do NOT subscribe to provider events to keep it independent from admin wallet changes
  useEffect(() => {
    const hasProvider = isMetaMaskAvailable();
    const stored = getStoredUserWallet();
    setState((prev) => ({
      ...prev,
      hasProvider,
      account: stored.account,
      chainId: stored.chainId,
      isConnected: !!stored.account,
    }));
  }, []);

  const connect = useCallback(async (options?: ConnectOptions): Promise<string | null> => {
    if (!isMetaMaskAvailable()) {
      throw new Error("MetaMask not found");
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (options?.forceSelect) {
        try {
          await window.ethereum!.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch (e) {
          console.warn("wallet_requestPermissions failed (user wallet)", e);
        }
      }

      const accounts: string[] = await window.ethereum!.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) throw new Error("No accounts found");

      const account = accounts[0];
      const chainId: string = await window.ethereum!.request({ method: "eth_chainId" });

      setState((prev) => ({
        ...prev,
        account,
        chainId,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));
      setStoredUserWallet(account, chainId);
      return account;
    } catch (error: any) {
      const message = error?.message || "Failed to connect user wallet";
      setState((prev) => ({ ...prev, isConnecting: false, error: message }));
      throw new Error(message);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState((prev) => ({ ...prev, account: null, isConnected: false, error: null }));
    setStoredUserWallet(null, null);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    account: state.account,
    chainId: state.chainId,
    isConnecting: state.isConnecting,
    isConnected: state.isConnected,
    hasProvider: state.hasProvider,
    error: state.error,
    connect,
    disconnect,
    clearError,
  };
}
