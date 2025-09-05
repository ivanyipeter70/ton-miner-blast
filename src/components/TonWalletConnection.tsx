import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TonWalletConnection() {
  const wallet = useTonWallet();
  const address = useTonAddress();

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          TON Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {wallet ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connected:</span>
              <Badge variant="outline" className="text-primary border-primary/30">
                {wallet.device.appName || 'TON Wallet'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Address:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {formatAddress(address)}
              </code>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Connect your TON wallet to start mining
            </p>
          </div>
        )}
        <div className="flex justify-center">
          <TonConnectButton />
        </div>
      </CardContent>
    </Card>
  );
}