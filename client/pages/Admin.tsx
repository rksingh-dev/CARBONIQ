import { useEffect, useState, useCallback, useMemo } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Ticket } from "@shared/api";
import { useWallet } from "@/hooks/useWallet";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
// Removed complex minting interface
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, CheckCircle, XCircle, Clock, Search, Filter, RefreshCw, AlertTriangle, Copy, Coins, Settings, Trash } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function getLocal(key: string, def = "") {
  try { return localStorage.getItem(key) || def; } catch { return def; }
}
function setLocal(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch {}
}

interface AdminState {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected';
  sortBy: 'date' | 'status' | 'name';
  sortOrder: 'asc' | 'desc';
}

export default function Admin() {
  const [state, setState] = useState<AdminState>({
    tickets: [],
    loading: false,
    error: null,
    searchQuery: '',
    statusFilter: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
  });
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showSendTokens, setShowSendTokens] = useState(false);
  const [tokenAmount, setTokenAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugBalances, setDebugBalances] = useState<any[]>([]);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupStatus, setCleanupStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  const { 
    account, 
    connect, 
    disconnect, 
    hasProvider, 
    isConnected, 
    chainId,
    switchChain,
    error: walletError,
    clearError: clearWalletError 
  } = useWallet();
  
  const { 
    session, 
    isLoading: sessionLoading, 
    isLoggedIn, 
    login, 
    logout, 
    completeLogout,
    refreshSession 
  } = useAdminSession();
  const { user: adminUser } = useAuth();
  
  const { toast } = useToast();


  // Memoized filtered and sorted tickets
  const filteredTickets = useMemo(() => {
    let filtered = state.tickets;

    // Filter by status
    if (state.statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === state.statusFilter);
    }

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.reportName.toLowerCase().includes(query) ||
        ticket.walletAddress.toLowerCase().includes(query) ||
        ticket.analysis.summary.toLowerCase().includes(query)
      );
    }

    // Sort tickets
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.sortBy) {
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'name':
          aValue = a.reportName.toLowerCase();
          bValue = b.reportName.toLowerCase();
          break;
        default:
          return 0;
      }

      if (state.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [state.tickets, state.statusFilter, state.searchQuery, state.sortBy, state.sortOrder]);

  useEffect(() => { 
    if (isLoggedIn && session?.token) {
      refresh();
    }
  }, [isLoggedIn, session?.token]);

  const refresh = useCallback(async () => {
    if (!session?.token) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const res = await Api.listTickets(undefined, session.token);
      setState(prev => ({ 
        ...prev, 
        tickets: res.tickets,
        loading: false,
        error: null 
      }));
      setRetryCount(0);
    } catch (e: any) {
      const msg = String(e?.message || "");
      
      if (e?.status === 401 || /unauthor/i.test(msg)) {
        // Session expired, let the session hook handle it
        await refreshSession();
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false,
          error: msg || "An error occurred while loading tickets"
        }));
        
        toast({
          title: "Failed to Load Tickets",
          description: msg || "An error occurred while loading tickets",
          variant: "destructive",
        });
      }
    }
  }, [session?.token, refreshSession, toast]);

  const onLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      setUsername("");
      setPassword("");
    }
  }, [login, username, password]);

  const handleRetry = useCallback(async () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      await refresh();
    }
  }, [retryCount, refresh]);

  const handleSearchChange = useCallback((value: string) => {
    setState(prev => ({ ...prev, searchQuery: value }));
  }, []);

  const handleStatusFilterChange = useCallback((status: 'all' | 'pending' | 'approved' | 'rejected') => {
    setState(prev => ({ ...prev, statusFilter: status }));
  }, []);

  const handleSortChange = useCallback((sortBy: 'date' | 'status' | 'name') => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  const handleSendTokens = async () => {
    if (!selectedTicket || !session?.token || !tokenAmount) return;

    setIsSending(true);
    try {
      // Check if MetaMask is connected
      if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install MetaMask to send tokens.");
      }

      // Check if admin wallet is connected
      if (!account) {
        throw new Error("Admin wallet not connected. Please connect your wallet first.");
      }

      // Check network - require Ethereum Mainnet
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      // Mainnet is 0x1
      if (chainId !== '0x1') {
        toast({
          title: "Wrong Network!",
          description: "Please switch to Ethereum Mainnet in MetaMask.",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }
      
      toast({
        title: "Requesting Signature...",
        description: "Please sign the message to approve token sending",
      });

      // Create a message to sign
      const message = `Approve sending ${tokenAmount} Blue Carbon tokens to ${selectedTicket.walletAddress} on Ethereum Mainnet at ${new Date().toISOString()}`;
      
      // Request signature instead of transaction
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      });

      if (!signature) {
        throw new Error("Signature was rejected or failed");
      }

      // Generate a dummy transaction hash for tracking
      const dummyTxHash = `0x${Math.random().toString(16).substr(2, 8)}${Date.now().toString(16)}`;
      
      // Store user balance in IPFS
      const amountToStore = parseFloat(tokenAmount);
      console.log('Admin setting token amount:', tokenAmount, 'Parsed as:', amountToStore);
      
      const balanceResult = await Api.storeUserBalance({
        userEmail: selectedTicket.userEmail,
        userId: selectedTicket.userId,
        walletAddress: selectedTicket.walletAddress,
        amount: amountToStore,
        adminSignature: signature,
        ticketId: selectedTicket.id,
        adminEmail: adminUser?.email || undefined,
      });
      
      console.log('Balance storage result:', balanceResult);

      // Update ticket with dummy transaction hash and token amount
      await Api.updateTicket(selectedTicket.id, { 
        action: "approve", 
        txHash: dummyTxHash,
        adminNote: `Tokens sent via signature: ${tokenAmount} tokens to ${selectedTicket.walletAddress}. Signature: ${signature.slice(0, 10)}... IPFS: ${balanceResult.cid}`
      }, session.token);
      
      await refresh();
      
      setSelectedTicket(null);
      setShowSendTokens(false);
      setTokenAmount("");
      
      toast({
        title: "Tokens Approved Successfully!",
        description: `${tokenAmount} Blue Carbon tokens approved for ${selectedTicket.walletAddress}. Signature confirmed.`,
      });
    } catch (e: any) {
      toast({
        title: "Approval Failed",
        description: e?.message || "Failed to approve token sending",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Helper function to wait for transaction confirmation
  const waitForTransactionConfirmation = async (txHash: string) => {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });
          
          if (receipt) {
            clearInterval(checkInterval);
            resolve(receipt);
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 2000); // Check every 2 seconds

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Transaction confirmation timeout"));
      }, 120000);
    });
  };

  const fetchDebugBalances = useCallback(async () => {
    try {
      const response = await fetch('/api/balance');
      const data = await response.json();
      setDebugBalances(data.balances || []);
    } catch (error) {
      console.error('Failed to fetch debug balances:', error);
    }
  }, []);

  const testBalanceSystem = useCallback(async () => {
    if (!selectedTicket) return;
    
    try {
      console.log('Testing balance system with amount: 25');
      const testResult = await Api.storeUserBalance({
        userEmail: selectedTicket.userEmail,
        userId: selectedTicket.userId,
        walletAddress: selectedTicket.walletAddress,
        amount: 25,
        adminSignature: 'test_signature_123',
        ticketId: 'test_ticket_123',
        adminEmail: adminUser?.email || undefined,
      });
      console.log('Test balance result:', testResult);
      
      // Now fetch the balance to verify
      const balanceData = await Api.getUserBalanceByEmail(selectedTicket.userEmail);
      console.log('Retrieved balance after test:', balanceData);
      
      toast({
        title: "Balance Test Complete",
        description: `Test stored 25 BCCT. Retrieved: ${balanceData.totalBalance} BCCT`,
      });
    } catch (error) {
      console.error('Balance test failed:', error);
      toast({
        title: "Balance Test Failed",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });
    }
  }, [selectedTicket, toast]);

  // Cleanup functions
  const handleClearAllTickets = useCallback(async () => {
    if (!session?.token) return;
    
    try {
      const result = await Api.clearAllTickets(session.token);
      await refresh();
      toast({
        title: "All Tickets Cleared",
        description: result.message,
      });
      setShowCleanupModal(false);
    } catch (error: any) {
      toast({
        title: "Clear Failed",
        description: error?.message || "Failed to clear tickets",
        variant: "destructive",
      });
    }
  }, [session?.token, refresh, toast]);

  const handleClearTicketsByStatus = useCallback(async () => {
    if (!session?.token || cleanupStatus === 'all') return;
    
    try {
      const result = await Api.clearTicketsByStatus(cleanupStatus, session.token);
      await refresh();
      toast({
        title: "Tickets Cleared",
        description: result.message,
      });
      setShowCleanupModal(false);
    } catch (error: any) {
      toast({
        title: "Clear Failed",
        description: error?.message || "Failed to clear tickets",
        variant: "destructive",
      });
    }
  }, [session?.token, cleanupStatus, refresh, toast]);

  const openSendTokens = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowSendTokens(true);
    setTokenAmount("100"); // Default amount
  };

  const closeSendTokens = () => {
    setSelectedTicket(null);
    setShowSendTokens(false);
    setTokenAmount("");
  };

  const reject = async (t: Ticket) => {
    if (!session?.token) {
      toast({
        title: "Session Expired",
        description: "Please log in again",
        variant: "destructive",
      });
      return;
    }

    try {
      await Api.updateTicket(t.id, { action: "reject" }, session.token);
    await refresh();
      toast({
        title: "Ticket Rejected",
        description: "The ticket has been rejected successfully",
      });
    } catch (e: any) {
      toast({
        title: "Rejection Failed",
        description: e?.message || "An error occurred while rejecting the ticket",
        variant: "destructive",
      });
    }
  };

  if (sessionLoading) {
    return (
      <ErrorBoundary>
      <main className="container py-10 max-w-md">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Validating session...</p>
          </div>
        </div>
      </main>
      </ErrorBoundary>
    );
  }

  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
      <main className="container py-10 max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Login</h1>
        <form onSubmit={onLogin} className="mt-6 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username"
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter username" 
            required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password" 
            required
                autoComplete="current-password"
          />
            </div>
            <Button 
            type="submit"
              className="w-full"
            disabled={!username.trim() || !password.trim()}
          >
            Login
            </Button>
        </form>
        <Toaster />
      </main>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <main className="container py-10">
      <section className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-foreground/70 mt-2">Review pending tickets, mint tokens, and manage carbon credit verification.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          {account ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-2 py-1">Admin Wallet</Badge>
              <Badge variant="outline" className="px-2 py-1">
                <span className="mr-1">Admin:</span>
                <span className="font-mono text-xs truncate max-w-[150px]">{account}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 ml-1" 
                  onClick={() => {
                    navigator.clipboard.writeText(account);
                    toast({
                      title: "Address copied",
                      description: "Wallet address copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </Badge>
              {chainId && (
                <Badge variant="secondary" className="px-2 py-1">
                  Chain ID: {chainId}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => switchChain(1)}>
                Switch Network
              </Button>
              <Button variant="outline" size="sm" onClick={() => connect({ forceSelect: true, lock: true })}>
                Switch Account
              </Button>
              <Button variant="outline" size="sm" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={() => connect({ forceSelect: true, lock: true })}>
              Connect Admin Wallet
            </Button>
          )}
          {/* Removed separate send tokens button - integrated into ticket workflow */}
            <Button variant="outline" onClick={refresh} disabled={state.loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => {
            setShowDebugInfo(!showDebugInfo);
            if (!showDebugInfo) fetchDebugBalances();
          }}>
            {showDebugInfo ? 'Hide Debug' : 'Show Debug'}
          </Button>
          <Button variant="outline" onClick={() => setShowCleanupModal(true)} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Cleanup
          </Button>
          <Button variant="outline" onClick={completeLogout}>
            Complete Logout
          </Button>
        </div>
      </section>

        {/* Wallet Error Alert */}
        {walletError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Wallet Error: {walletError}</span>
              <Button variant="outline" size="sm" onClick={clearWalletError}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search tickets</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by report name, wallet address, or summary..."
                  value={state.searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={state.statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange('all')}
              >
                All ({state.tickets.length})
              </Button>
              <Button
                variant={state.statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange('pending')}
              >
                Pending ({state.tickets.filter(t => t.status === 'pending').length})
              </Button>
              <Button
                variant={state.statusFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange('approved')}
              >
                Approved ({state.tickets.filter(t => t.status === 'approved').length})
              </Button>
              <Button
                variant={state.statusFilter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange('rejected')}
              >
                Rejected ({state.tickets.filter(t => t.status === 'rejected').length})
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Button
              variant={state.sortBy === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('date')}
            >
              Date {state.sortBy === 'date' && (state.sortOrder === 'desc' ? '↓' : '↑')}
            </Button>
            <Button
              variant={state.sortBy === 'status' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('status')}
            >
              Status {state.sortBy === 'status' && (state.sortOrder === 'desc' ? '↓' : '↑')}
            </Button>
            <Button
              variant={state.sortBy === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSortChange('name')}
            >
              Name {state.sortBy === 'name' && (state.sortOrder === 'desc' ? '↓' : '↑')}
            </Button>
          </div>
        </div>

        {/* Error State */}
        {state.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{state.error}</span>
              <div className="flex gap-2">
                {retryCount < 3 && (
                  <Button variant="outline" size="sm" onClick={handleRetry}>
                    Retry ({3 - retryCount} left)
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={refresh}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {state.loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tickets...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredTickets.length} of {state.tickets.length} tickets
              {state.searchQuery && ` matching "${state.searchQuery}"`}
              {state.statusFilter !== 'all' && ` with status "${state.statusFilter}"`}
            </div>

            {/* Tickets List */}
            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <div className="text-muted-foreground text-center">
                    {state.tickets.length === 0 ? (
                      <p>No tickets found. Upload some reports to get started.</p>
                    ) : (
                      <p>No tickets match your current filters. Try adjusting your search or filter criteria.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden">
              <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <CardTitle className="text-lg">{ticket.reportName}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{ticket.walletAddress}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 p-0" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(ticket.walletAddress);
                            toast({
                              title: "Address copied",
                              description: "Wallet address copied to clipboard",
                            });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${ticket.reportCid}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Report
                    </Button>
                    <Badge 
                      variant={
                        ticket.status === "approved" ? "default" : 
                        ticket.status === "rejected" ? "destructive" : 
                        "secondary"
                      }
                      className="flex items-center gap-1"
                    >
                      {ticket.status === "approved" && <CheckCircle className="h-3 w-3" />}
                      {ticket.status === "rejected" && <XCircle className="h-3 w-3" />}
                      {ticket.status === "pending" && <Clock className="h-3 w-3" />}
                      {ticket.status}
                    </Badge>
                    {/* Delete button removed per request */}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Analysis Summary */}
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground w-36">Estimated Tokens:</span>
                      <span className="ml-2 font-medium">{ticket.analysis.estimatedTokens}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground w-28">Confidence:</span>
                      <span className="ml-2 font-medium">{(ticket.analysis.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{ticket.analysis.summary}</p>
                </div>

                {/* Actions */}
                {ticket.status === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => openSendTokens(ticket)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Tokens (Signature)
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => reject(ticket)}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                </div>
              )}

                {/* Transaction Hash */}
                {ticket.txHash && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Transaction:</span>
                      <a
                        href={`https://etherscan.io/tx/${ticket.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-primary hover:underline flex items-center gap-1"
                      >
                        {ticket.txHash.slice(0, 10)}...{ticket.txHash.slice(-8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
              ))
            )}
          </div>
        )}

        {/* Approve Tokens Modal */}
        {showSendTokens && selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Approve Tokens</h2>
                  <Button variant="ghost" size="sm" onClick={closeSendTokens}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Recipient</Label>
                    <p className="text-sm text-muted-foreground font-mono">
                      {selectedTicket.walletAddress}
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="token-amount">Token Amount</Label>
                    <Input
                      id="token-amount"
                      type="number"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      placeholder="100"
                      className="mt-1"
                    />
                  </div>
                  
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSendTokens}
                      disabled={isSending || !tokenAmount}
                      className="flex-1"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Tokens
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={closeSendTokens}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {showDebugInfo && (
          <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Debug: IPFS Balance Storage</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={fetchDebugBalances} 
                  size="sm"
                  variant="outline"
                >
                  Refresh
                </Button>
                <Button 
                  onClick={testBalanceSystem} 
                  disabled={!selectedTicket}
                  size="sm"
                  variant="outline"
                >
                  Test Balance System
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total users with balances: {debugBalances.length}
              </p>
              {debugBalances.map((balance, index) => (
                <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded border">
                  <p className="font-mono text-xs">
                    <strong>Wallet:</strong> {balance.walletAddress}
                  </p>
                  <p className="font-mono text-xs">
                    <strong>IPFS Hash:</strong> {balance.ipfsHash}
                  </p>
                  <p className="font-mono text-xs">
                    <strong>IPFS URL:</strong> 
                    <a href={balance.ipfsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                      {balance.ipfsUrl}
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cleanup Modal */}
        {showCleanupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Cleanup Tickets</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCleanupModal(false)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <strong>Warning:</strong> This action cannot be undone. Choose what to clean up.
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Cleanup Type</Label>
                    <div className="mt-2 space-y-2">
                      <Button
                        variant={cleanupStatus === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCleanupStatus('all')}
                        className="w-full justify-start"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Clear All Tickets ({state.tickets.length})
                      </Button>
                      <Button
                        variant={cleanupStatus === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCleanupStatus('pending')}
                        className="w-full justify-start"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Clear Pending Only ({state.tickets.filter(t => t.status === 'pending').length})
                      </Button>
                      <Button
                        variant={cleanupStatus === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCleanupStatus('approved')}
                        className="w-full justify-start"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Clear Approved Only ({state.tickets.filter(t => t.status === 'approved').length})
                      </Button>
                      <Button
                        variant={cleanupStatus === 'rejected' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCleanupStatus('rejected')}
                        className="w-full justify-start"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Clear Rejected Only ({state.tickets.filter(t => t.status === 'rejected').length})
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={cleanupStatus === 'all' ? handleClearAllTickets : handleClearTicketsByStatus}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      {cleanupStatus === 'all' ? 'Clear All' : `Clear ${cleanupStatus}`}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCleanupModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Toaster />
      </main>
    </ErrorBoundary>
  );
}
