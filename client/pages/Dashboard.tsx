import { useEffect, useMemo, useState, useCallback } from "react";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useAuth } from "@/hooks/useAuth";
import { Api } from "@/lib/api";
import type { Ticket } from "@shared/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, CheckCircle, Clock, XCircle, ExternalLink, RefreshCw, Trash2, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

function bytesToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Dashboard() {
  const { account, disconnect: disconnectWallet } = useUserWallet();
  const { user, logout: logoutAuth } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const disabled = useMemo(() => !file || uploading || !account, [file, uploading, account]);

  // Calculate token balance from IPFS
  const [tokenBalance, setTokenBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [rupeesBalance, setRupeesBalance] = useState(100);

  // Fetch balance from IPFS - keyed by Google email
  const fetchBalance = useCallback(async () => {
    if (!user?.email) return;
    
    setBalanceLoading(true);
    try {
      console.log('Fetching balance for user:', user.uid, 'email:', user.email, 'account:', account);
      const balanceData = await Api.getUserBalanceByEmail(user.email);
      console.log('Balance data from IPFS:', balanceData);
      console.log('Setting token balance to:', balanceData.totalBalance);
      setTokenBalance(balanceData.totalBalance);
      if (typeof balanceData.rupeesBalance === 'number') {
        setRupeesBalance(balanceData.rupeesBalance);
      }
    } catch (error) {
      console.error('Failed to fetch balance from IPFS:', error);
      // Fallback to ticket-based balance
      const ticketBalance = tickets
        .filter(ticket => ticket.status === 'approved' && ticket.txHash)
        .reduce((total, ticket) => {
          const amount = ticket.analysis?.estimatedTokens || 100;
          return total + amount;
        }, 0);
      console.log('Using fallback ticket balance:', ticketBalance);
      setTokenBalance(ticketBalance);
    } finally {
      setBalanceLoading(false);
    }
  }, [account, user, tickets]);

  // Fetch balance when account changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Handle complete logout (both auth and wallet)
  const handleLogout = useCallback(async () => {
    try {
      // Disconnect wallet first
      disconnectWallet();
      
      // Then logout from Firebase
      await logoutAuth();
      
      // Navigate to home page
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate to home even if logout fails
      navigate("/");
    }
  }, [disconnectWallet, logoutAuth, navigate]);

  // Get approved tickets with tokens
  const approvedTickets = useMemo(() => {
    return tickets.filter(ticket => ticket.status === 'approved' && ticket.txHash);
  }, [tickets]);

  async function refreshTickets() {
    if (!account || !user) return;
    setLoadingTickets(true);
    try {
      const res = await Api.listTickets(account);
      setTickets(res.tickets);
      // Also refresh balance when tickets are updated
      await fetchBalance();
    } finally {
      setLoadingTickets(false);
    }
  }

  useEffect(() => {
    refreshTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, user]);

  const onUploadAndSubmit = async () => {
    if (!file || !account || !user) return;
    setUploading(true);
    try {
      const b64 = await bytesToBase64(file);
      const { cid } = await Api.uploadReport(file.name, b64);
      await Api.createTicket({
        walletAddress: account,
        reportCid: cid,
        reportName: file.name,
        analysis: { estimatedTokens: 0, confidence: 0, summary: "Pending admin verification" },
        userId: user.uid,
        userEmail: user.email!,
      });
      setFile(null);
      await refreshTickets();
      alert("Request submitted! Admin will review and send you tokens if approved.");
    } catch (e: any) {
      alert(e?.message || "Submission failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="container py-10">
      {/* Header with user info and logout */}
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Dashboard</h1>
            <p className="text-foreground/70 mt-2">
              Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}! Upload your Blue Carbon project report and submit for admin verification.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <User className="h-4 w-4" />
              <div className="text-sm">
                <div className="font-medium">{user?.displayName || 'User'}</div>
                <div className="text-muted-foreground text-xs">{user?.email}</div>
              </div>
            </div>
            
            {/* Wallet Info */}
            {account && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm font-mono">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </div>
            )}
            
            {/* Logout Button */}
            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </section>

      {/* Token & Rupees Balance Section */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-500" />
              Your Balances
            </CardTitle>
            <CardDescription>
              Token and Rupees balances are stored in IPFS by your Google account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Token Balance</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchBalance}
                    disabled={balanceLoading}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${balanceLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <p className="text-2xl font-bold">
                  {balanceLoading ? "Loading..." : `${tokenBalance} BCCT`}
                </p>
                {!balanceLoading && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Exact amount: {tokenBalance} Blue Carbon Tokens
                  </p>
                )}
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">Rupees Balance</span>
                    {balanceLoading && (
                      <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/marketplace')}>Marketplace</Button>
                </div>
                <p className="text-2xl font-bold">{balanceLoading ? "Loading..." : `₹ ${rupeesBalance}`}</p>
                <p className="text-xs text-muted-foreground mt-1">Default 100. Updated by marketplace buys/sells.</p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Approved Requests</span>
                </div>
                <p className="text-2xl font-bold">{approvedTickets.length}</p>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button onClick={refreshTickets} disabled={loadingTickets} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingTickets ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => navigate('/marketplace')}>Go to Marketplace</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="p-6 rounded-xl border bg-card">
          <h2 className="font-semibold text-lg">Submit Carbon Credit Request</h2>
          <p className="text-sm text-foreground/70 mb-4">Upload your Blue Carbon project report. Admin will review and send you tokens if approved.</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-secondary file:text-foreground/90 hover:file:opacity-90"
          />
          <button onClick={onUploadAndSubmit} disabled={disabled} className="mt-4 px-4 py-2 rounded-md bg-accent text-accent-foreground disabled:opacity-50">
            {uploading ? "Submitting…" : "Submit Request for Admin Review"}
          </button>
        </div>

        <div className="p-6 rounded-xl border bg-card">
          <h2 className="font-semibold text-lg" id="verify">Request Status</h2>
          <p className="text-sm text-foreground/70 mb-4">Track the status of your carbon credit requests.</p>
          {loadingTickets ? (
            <div className="text-sm">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="text-sm text-foreground/70">No tickets yet.</div>
          ) : (
            <ul className="space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.reportName}</div>
                      <div className="text-xs text-foreground/60">{new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === "approved" && t.txHash && (
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          <Coins className="h-3 w-3 mr-1" />
                          {t.analysis?.estimatedTokens || 100} BCCT
                        </Badge>
                      )}
                      <span className={`px-2 py-1 rounded text-xs ${
                        t.status === "approved" ? "bg-green-100 text-green-700" : t.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {t.status === "approved" && <CheckCircle className="h-3 w-3 inline mr-1" />}
                        {t.status === "rejected" && <XCircle className="h-3 w-3 inline mr-1" />}
                        {t.status === "pending" && <Clock className="h-3 w-3 inline mr-1" />}
                        {t.status}
                      </span>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="ml-2"
                        title="Delete Ticket"
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this ticket? This cannot be undone.")) {
                            try {
                              await Api.deleteTicket(t.id, account!);
                              await refreshTickets();
                            } catch (e: any) {
                              alert(e?.message || "Failed to delete ticket");
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs">IPFS: <a className="underline" href={`https://amethyst-additional-flamingo-32.mypinata.cloud/ipfs/${t.reportCid}`} target="_blank" rel="noreferrer">{t.reportCid}</a></div>
                  {t.txHash && (
                    <div className="mt-1 text-xs flex items-center gap-1">
                      <span>Tx:</span>
                      <a className="underline flex items-center gap-1" href={`https://etherscan.io/tx/${t.txHash}`} target="_blank" rel="noreferrer">
                        {t.txHash.slice(0, 10)}...{t.txHash.slice(-8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
