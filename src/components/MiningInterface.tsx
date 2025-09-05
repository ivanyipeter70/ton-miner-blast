import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TonWalletConnection } from './TonWalletConnection';
import { useTonMining } from '@/hooks/useTonMining';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LogOut, User } from 'lucide-react';

export function MiningInterface() {
  const { signOut, user } = useAuth();
  const {
    stats,
    isMining,
    tapCount,
    miningProgress,
    isWithdrawing,
    loading,
    isConnected,
    isAuthenticated,
    handleMiningTap,
    toggleMining,
    withdrawTON,
    formatTON
  } = useTonMining();

  const handleWithdraw = async () => {
    if (stats.totalMined < 0.01) {
      toast.error("Minimum withdrawal is 0.01 TON");
      return;
    }

    try {
      await withdrawTON(stats.totalMined);
      toast.success("Withdrawal successful!");
    } catch (error) {
      toast.error("Withdrawal failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with User Info */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">
                {user?.email?.substring(0, 20)}...
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            TON Miner
          </h1>
          <p className="text-muted-foreground text-sm">
            Secure mining with blockchain integration
          </p>
        </div>

        {/* Wallet Connection */}
        <TonWalletConnection />

        {/* Main Balance Card */}
        <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-primary/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-muted-foreground">Total Balance</CardTitle>
            <div className="text-4xl font-bold text-primary glow-text">
              {formatTON(stats.totalMined)} TON
            </div>
            {stats.realTonBalance > 0 && (
              <div className="text-sm text-muted-foreground">
                Wallet: {formatTON(stats.realTonBalance)} TON
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-semibold text-foreground">
                  {formatTON(stats.miningRate * stats.multiplier)}/s
                </div>
                <div className="text-xs text-muted-foreground">Mining Rate</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-semibold text-primary">
                  {stats.multiplier}x
                </div>
                <div className="text-xs text-muted-foreground">Multiplier</div>
              </div>
            </div>
            
            <Separator className="bg-primary/20" />
            
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg shadow-lg hover:shadow-primary/25 transition-all duration-300"
              disabled={!isConnected || stats.totalMined < 0.01 || isWithdrawing}
              onClick={handleWithdraw}
            >
              {isWithdrawing ? "⏳ Processing..." : "💎 WITHDRAW TON"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Minimum withdrawal: 0.01 TON
            </p>
          </CardContent>
        </Card>

        {/* Mining Action */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm border-primary/30">
          <CardContent className="p-6">
            <Button
              className="w-full h-32 text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground rounded-xl shadow-2xl hover:shadow-primary/30 transition-all duration-300 active:scale-95 mining-glow"
              onPointerDown={handleMiningTap}
              disabled={stats.energyLevel <= 0 || !isConnected}
            >
              {!isConnected ? (
                <>
                  🔗 CONNECT WALLET
                  <div className="text-sm font-normal opacity-90">
                    Connect TON wallet to start mining
                  </div>
                </>
              ) : stats.energyLevel > 0 ? (
                <>
                  ⛏️ TAP TO MINE
                  <div className="text-sm font-normal opacity-90">
                    +{formatTON(stats.miningRate * stats.multiplier * 2)} TON
                  </div>
                </>
              ) : (
                <>
                  😴 NO ENERGY
                  <div className="text-sm font-normal opacity-90">
                    Wait for energy to regenerate
                  </div>
                </>
              )}
            </Button>
            
            <div className="mt-4 text-center">
              <Badge variant="secondary" className="text-xs">
                Taps: {tapCount}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Energy and Auto-Mining */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Energy Level</span>
                <span>{Math.floor(stats.energyLevel)}/100</span>
              </div>
              <Progress 
                value={stats.energyLevel} 
                className="h-3 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/80" 
              />
            </div>
            
            <Separator className="bg-border/50" />
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Auto-Mining</span>
                <Badge variant={isMining ? "default" : "secondary"} className="text-xs">
                  {isMining ? "Active" : "Paused"}
                </Badge>
              </div>
              
              {isMining && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{miningProgress}%</span>
                  </div>
                  <Progress 
                    value={miningProgress} 
                    className="h-2 bg-secondary/50 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/60" 
                  />
                </div>
              )}
              
              <Button
                variant={isMining ? "destructive" : "default"}
                className="w-full font-semibold"
                onClick={toggleMining}
                disabled={stats.energyLevel <= 0 || !isConnected}
              >
                {isMining ? "⏸️ PAUSE MINING" : "▶️ START AUTO-MINING"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-2">
          <p>🔗 Connected to TON Blockchain</p>
          <p>💎 Real mining rewards • ⚡ Instant withdrawals</p>
        </div>
      </div>
    </div>
  );
}