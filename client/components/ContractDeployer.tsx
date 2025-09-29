import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deployERC20Token } from '@/lib/contractDeployment';

export function ContractDeployer() {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('18');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  const handleDeploy = async () => {
    if (!name || !symbol) {
      setError('Name and symbol are required');
      return;
    }

    setIsDeploying(true);
    setError(null);
    setDeploymentResult(null);

    try {
      const result = await deployERC20Token(name, symbol, parseInt(decimals));
      setDeploymentResult(result);
      
      toast({
        title: 'Contract Deployed Successfully!',
        description: `Contract address: ${result.contractAddress}`,
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Deployment Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Deploy New Contract</CardTitle>
        <CardDescription>
          Deploy a new ERC20 token contract and get its address
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token-name">Token Name</Label>
          <Input
            id="token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Carbon Credit Token"
            disabled={isDeploying}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="token-symbol">Token Symbol</Label>
          <Input
            id="token-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="CCT"
            disabled={isDeploying}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="decimals">Decimals</Label>
          <Input
            id="decimals"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            placeholder="18"
            disabled={isDeploying}
            type="number"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {deploymentResult && (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  <strong>Contract Address:</strong> 
                  <span className="font-mono ml-2">{deploymentResult.contractAddress}</span>
                </div>
                <div>
                  <strong>Transaction Hash:</strong> 
                  <span className="font-mono ml-2">{deploymentResult.transactionHash}</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto ml-2"
                    onClick={() => window.open(`https://etherscan.io/tx/${deploymentResult.transactionHash}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <div>
                  <strong>Block Number:</strong> {deploymentResult.blockNumber}
                </div>
                <div>
                  <strong>Gas Used:</strong> {deploymentResult.gasUsed}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleDeploy}
          disabled={!name || !symbol || isDeploying}
          className="w-full"
        >
          {isDeploying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Deploying Contract...
            </>
          ) : (
            'Deploy Contract'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

