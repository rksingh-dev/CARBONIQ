import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useMinting } from "@/hooks/useMinting";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Coins, 
  Send, 
  Flame, 
  Plus, 
  Minus, 
  RefreshCw, 
  ExternalLink,
  Copy,
  CheckCircle,
  AlertTriangle,
  Leaf
} from "lucide-react";

interface CarbonCredit {
  amount: string;
  projectId: string;
  verificationHash: string;
  timestamp: number;
  verified: boolean;
}

export function BlueCarbonTokenManager() {
  const { account, isConnected } = useWallet();
  const { mint, refreshBalance, getAccountBalance } = useMinting();
  const { toast } = useToast();
  
  const [balance, setBalance] = useState<string>("0");
  const [totalSupply, setTotalSupply] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [carbonCredits, setCarbonCredits] = useState<CarbonCredit[]>([]);
  
  // Mint form state
  const [mintAmount, setMintAmount] = useState("");
  const [mintTo, setMintTo] = useState("");
  const [projectId, setProjectId] = useState("");
  const [verificationHash, setVerificationHash] = useState("");
  
  // Burn form state
  const [burnAmount, setBurnAmount] = useState("");
  const [burnReason, setBurnReason] = useState("");
  
  // Transfer form state
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const loadTokenData = useCallback(async () => {
    if (!account) return;
    
    setIsLoading(true);
    try {
      // Load balance
      const userBalance = await getAccountBalance(account);
      setBalance(userBalance);
      
      // Load carbon credits (mock data for now)
      setCarbonCredits([
        {
          amount: "100",
          projectId: "BC001",
          verificationHash: "0x1234567890abcdef",
          timestamp: Date.now() - 86400000,
          verified: true
        },
        {
          amount: "50",
          projectId: "BC002", 
          verificationHash: "0xabcdef1234567890",
          timestamp: Date.now() - 172800000,
          verified: false
        }
      ]);
      
    } catch (error: any) {
      toast({
        title: "Failed to load token data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [account, getAccountBalance, toast]);

  useEffect(() => {
    loadTokenData();
  }, [loadTokenData]);

  const handleMint = async () => {
    if (!mintAmount || !mintTo || !projectId || !verificationHash) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // This would call the actual minting function
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Tokens Minted Successfully",
        description: `${mintAmount} Blue Carbon tokens minted to ${mintTo}`,
      });
      
      // Reset form
      setMintAmount("");
      setMintTo("");
      setProjectId("");
      setVerificationHash("");
      
      // Refresh data
      await loadTokenData();
      
    } catch (error: any) {
      toast({
        title: "Minting Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBurn = async () => {
    if (!burnAmount || !burnReason) {
      toast({
        title: "Missing Information",
        description: "Please fill in amount and reason",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // This would call the actual burning function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Tokens Burned Successfully",
        description: `${burnAmount} Blue Carbon tokens burned for: ${burnReason}`,
      });
      
      // Reset form
      setBurnAmount("");
      setBurnReason("");
      
      // Refresh data
      await loadTokenData();
      
    } catch (error: any) {
      toast({
        title: "Burning Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in recipient and amount",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // This would call the actual transfer function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Transfer Successful",
        description: `${transferAmount} Blue Carbon tokens sent to ${transferTo}`,
      });
      
      // Reset form
      setTransferTo("");
      setTransferAmount("");
      
      // Refresh data
      await loadTokenData();
      
    } catch (error: any) {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Connect Wallet Required
          </CardTitle>
          <CardDescription>
            Please connect your wallet to manage Blue Carbon tokens
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Token Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-500" />
            Blue Carbon Token Overview
          </CardTitle>
          <CardDescription>
            Manage your Blue Carbon Credit tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Your Balance</span>
              </div>
              <p className="text-2xl font-bold">{balance} BCCT</p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Total Supply</span>
              </div>
              <p className="text-2xl font-bold">{totalSupply} BCCT</p>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Carbon Credits</span>
              </div>
              <p className="text-2xl font-bold">{carbonCredits.length}</p>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button onClick={loadTokenData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token Management Tabs */}
      <Tabs defaultValue="mint" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mint">Mint Tokens</TabsTrigger>
          <TabsTrigger value="burn">Burn Tokens</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
        </TabsList>
        
        {/* Mint Tokens Tab */}
        <TabsContent value="mint">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-500" />
                Mint Blue Carbon Tokens
              </CardTitle>
              <CardDescription>
                Mint new Blue Carbon Credit tokens with carbon project metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mint-amount">Amount *</Label>
                  <Input
                    id="mint-amount"
                    type="number"
                    placeholder="100"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mint-to">Recipient Address *</Label>
                  <Input
                    id="mint-to"
                    placeholder="0x..."
                    value={mintTo}
                    onChange={(e) => setMintTo(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project-id">Project ID *</Label>
                  <Input
                    id="project-id"
                    placeholder="BC001"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="verification-hash">Verification Hash *</Label>
                  <Input
                    id="verification-hash"
                    placeholder="0x..."
                    value={verificationHash}
                    onChange={(e) => setVerificationHash(e.target.value)}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleMint} 
                disabled={isLoading || !mintAmount || !mintTo || !projectId || !verificationHash}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Minting...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Mint Tokens
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Burn Tokens Tab */}
        <TabsContent value="burn">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                Burn Blue Carbon Tokens
              </CardTitle>
              <CardDescription>
                Burn tokens to verify carbon offset and reduce supply
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="burn-amount">Amount to Burn *</Label>
                  <Input
                    id="burn-amount"
                    type="number"
                    placeholder="50"
                    value={burnAmount}
                    onChange={(e) => setBurnAmount(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="burn-reason">Reason for Burning *</Label>
                  <Textarea
                    id="burn-reason"
                    placeholder="Carbon offset verification for project XYZ..."
                    value={burnReason}
                    onChange={(e) => setBurnReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleBurn} 
                disabled={isLoading || !burnAmount || !burnReason}
                variant="destructive"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Burning...
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4 mr-2" />
                    Burn Tokens
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Transfer Tokens Tab */}
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Transfer Blue Carbon Tokens
              </CardTitle>
              <CardDescription>
                Send Blue Carbon tokens to another address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transfer-to">Recipient Address *</Label>
                  <Input
                    id="transfer-to"
                    placeholder="0x..."
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transfer-amount">Amount *</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    placeholder="25"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleTransfer} 
                disabled={isLoading || !transferTo || !transferAmount}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Transfer Tokens
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Carbon Credits History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-green-500" />
            Carbon Credits History
          </CardTitle>
          <CardDescription>
            Track your carbon credit projects and verifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carbonCredits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No carbon credits yet
            </div>
          ) : (
            <div className="space-y-4">
              {carbonCredits.map((credit, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{credit.amount} BCCT</span>
                      <Badge variant={credit.verified ? "default" : "secondary"}>
                        {credit.verified ? "Verified" : "Pending"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(credit.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Project ID:</span>
                      <span className="ml-2 font-mono">{credit.projectId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Verification:</span>
                      <span className="ml-2 font-mono">{credit.verificationHash.slice(0, 10)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
