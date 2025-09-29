import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FaucetInfo {
  name: string;
  url: string;
  description: string;
  token: string;
  amount: string;
  cooldown: string;
}

const TESTNET_FAUCETS: Record<string, FaucetInfo[]> = {
  sepolia: [
    {
      name: "Sepolia Faucet",
      url: "https://sepoliafaucet.com/",
      description: "Official Sepolia faucet",
      token: "ETH",
      amount: "0.1 ETH",
      cooldown: "24 hours"
    },
    {
      name: "Alchemy Faucet",
      url: "https://sepoliafaucet.com/",
      description: "Alchemy Sepolia faucet",
      token: "ETH",
      amount: "0.1 ETH",
      cooldown: "24 hours"
    },
    {
      name: "Chainlink Faucet",
      url: "https://faucets.chain.link/sepolia",
      description: "Chainlink Sepolia faucet",
      token: "ETH",
      amount: "0.1 ETH",
      cooldown: "24 hours"
    }
  ],
  mumbai: [
    {
      name: "Mumbai Faucet",
      url: "https://faucet.polygon.technology/",
      description: "Official Polygon Mumbai faucet",
      token: "MATIC",
      amount: "0.1 MATIC",
      cooldown: "24 hours"
    },
    {
      name: "Alchemy Mumbai",
      url: "https://mumbaifaucet.com/",
      description: "Alchemy Mumbai faucet",
      token: "MATIC",
      amount: "0.1 MATIC",
      cooldown: "24 hours"
    }
  ],
  bsc: [
    {
      name: "BSC Testnet Faucet",
      url: "https://testnet.bnbchain.org/faucet-smart",
      description: "Official BSC testnet faucet",
      token: "BNB",
      amount: "0.1 BNB",
      cooldown: "24 hours"
    }
  ],
  fuji: [
    {
      name: "Avalanche Fuji Faucet",
      url: "https://faucet.avax.network/",
      description: "Official Avalanche Fuji faucet",
      token: "AVAX",
      amount: "0.1 AVAX",
      cooldown: "24 hours"
    }
  ]
};

export function TestnetFaucet() {
  const { account, chainId } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getCurrentNetworkFaucets = () => {
    if (!chainId) return [];
    
    switch (chainId) {
      case "11155111": // Sepolia
        return TESTNET_FAUCETS.sepolia;
      case "80001": // Mumbai
        return TESTNET_FAUCETS.mumbai;
      case "97": // BSC Testnet
        return TESTNET_FAUCETS.bsc;
      case "43113": // Avalanche Fuji
        return TESTNET_FAUCETS.fuji;
      default:
        return [];
    }
  };

  const getNetworkName = () => {
    if (!chainId) return "Unknown";
    
    switch (chainId) {
      case "11155111": return "Sepolia";
      case "80001": return "Mumbai";
      case "97": return "BSC Testnet";
      case "43113": return "Avalanche Fuji";
      default: return "Unknown";
    }
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const openFaucet = (url: string) => {
    window.open(url, '_blank');
  };

  const faucets = getCurrentNetworkFaucets();
  const networkName = getNetworkName();

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Connect Wallet First
          </CardTitle>
          <CardDescription>
            Please connect your wallet to access testnet faucets
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (faucets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Unsupported Network
          </CardTitle>
          <CardDescription>
            This network is not supported for testnet faucets. Please switch to a supported testnet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium">Supported Networks:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Sepolia (Ethereum)</Badge>
              <Badge variant="outline">Mumbai (Polygon)</Badge>
              <Badge variant="outline">BSC Testnet</Badge>
              <Badge variant="outline">Avalanche Fuji</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-500" />
          Testnet Faucet - {networkName}
        </CardTitle>
        <CardDescription>
          Get free testnet tokens to use the Blue Carbon Token system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Your Wallet Address</Label>
              <p className="text-sm text-muted-foreground font-mono">
                {account.slice(0, 10)}...{account.slice(-8)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Available Faucets */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Available Faucets:</h4>
          {faucets.map((faucet, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium">{faucet.name}</h5>
                <Badge variant="secondary">{faucet.amount}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {faucet.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Cooldown: {faucet.cooldown}
                </div>
                <Button
                  size="sm"
                  onClick={() => openFaucet(faucet.url)}
                  disabled={isLoading}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get {faucet.token}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">How to get testnet tokens:</p>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Click on any faucet button above</li>
                <li>Paste your wallet address: <code className="bg-muted px-1 rounded">{account}</code></li>
                <li>Complete any required verification (captcha, social media, etc.)</li>
                <li>Wait for tokens to arrive (usually 1-5 minutes)</li>
                <li>Return to this app and start using Blue Carbon tokens!</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
