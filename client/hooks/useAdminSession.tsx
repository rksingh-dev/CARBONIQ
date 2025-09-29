import { useState, useEffect, useCallback, useRef } from "react";
import { Api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AdminSession {
  token: string;
  expiresAt: string;
  isValid: boolean;
}

const ADMIN_TOKEN_KEY = "adminToken";
const SESSION_CHECK_INTERVAL = 60000; // 1 minute
const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // Ignore storage errors
  }
}

function removeStoredToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  // Validate session with server
  const validateSession = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await Api.validateAdminSession(token);
      return response.valid;
    } catch (error: any) {
      if (error?.status === 401 || /unauthor/i.test(error?.message || "")) {
        return false;
      }
      // For other errors, assume session is still valid
      return true;
    }
  }, []);

  // Check if session is expired based on local time
  const isSessionExpired = useCallback((expiresAt: string): boolean => {
    try {
      return new Date(expiresAt).getTime() <= Date.now();
    } catch {
      return true;
    }
  }, []);

  // Get time until expiry in milliseconds
  const getTimeUntilExpiry = useCallback((expiresAt: string): number => {
    try {
      return new Date(expiresAt).getTime() - Date.now();
    } catch {
      return 0;
    }
  }, []);

  // Initialize session from stored token
  const initializeSession = useCallback(async () => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    setIsValidating(true);
    try {
      const isValid = await validateSession(storedToken);
      if (isValid) {
        // Create a mock session object - we don't have expiresAt from validation
        // For now, assume 8 hours from now (matching server default)
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        setSession({
          token: storedToken,
          expiresAt,
          isValid: true,
        });
      } else {
        removeStoredToken();
        setSession(null);
        toast({
          title: "Session Expired",
          description: "Your admin session has expired. Please log in again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Session validation failed:", error);
      removeStoredToken();
      setSession(null);
    } finally {
      setIsValidating(false);
      setIsLoading(false);
    }
  }, [validateSession, toast]);

  // Login function
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await Api.adminLogin({ username, password });
      setStoredToken(response.token);
      setSession({
        token: response.token,
        expiresAt: response.expiresAt,
        isValid: true,
      });
      warningShownRef.current = false;
      toast({
        title: "Login Successful",
        description: "You are now logged in as admin.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error?.message || "Invalid credentials",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Logout function
  const logout = useCallback(() => {
    removeStoredToken();
    setSession(null);
    warningShownRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
  }, [toast]);

  // Complete logout (admin + wallet)
  const completeLogout = useCallback(() => {
    // Clear admin session
    logout();
    
    // Clear wallet data
    try {
      localStorage.removeItem("wallet:manuallyDisconnected");
      localStorage.removeItem("wallet:connected");
      localStorage.removeItem("wallet:chainId");
    } catch (e) {
      console.warn("Failed to clear wallet data:", e);
    }
    
    // Clear Firebase auth data
    try {
      localStorage.removeItem("firebase:authUser");
    } catch (e) {
      console.warn("Failed to clear Firebase data:", e);
    }
  }, [logout]);

  // Refresh session (re-validate with server)
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!session?.token) return false;

    setIsValidating(true);
    try {
      const isValid = await validateSession(session.token);
      if (isValid) {
        setSession(prev => prev ? { ...prev, isValid: true } : null);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error("Session refresh failed:", error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [session?.token, validateSession, logout]);

  // Check session expiry and show warnings
  const checkSessionExpiry = useCallback(() => {
    if (!session?.expiresAt) return;

    const timeUntilExpiry = getTimeUntilExpiry(session.expiresAt);
    
    if (timeUntilExpiry <= 0) {
      // Session expired
      logout();
    } else if (timeUntilExpiry <= WARNING_THRESHOLD && !warningShownRef.current) {
      // Show warning
      const minutesLeft = Math.ceil(timeUntilExpiry / (60 * 1000));
      toast({
        title: "Session Expiring Soon",
        description: `Your admin session will expire in ${minutesLeft} minutes. Please save your work.`,
        variant: "destructive",
      });
      warningShownRef.current = true;
    }
  }, [session?.expiresAt, getTimeUntilExpiry, logout, toast]);

  // Initialize on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Set up periodic session checking
  useEffect(() => {
    if (session?.isValid) {
      intervalRef.current = setInterval(checkSessionExpiry, SESSION_CHECK_INTERVAL);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [session?.isValid, checkSessionExpiry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    session,
    isLoading,
    isValidating,
    isLoggedIn: !!session?.isValid,
    login,
    logout,
    completeLogout,
    refreshSession,
  };
}
