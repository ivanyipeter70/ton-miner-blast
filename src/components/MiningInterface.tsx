import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Pickaxe, Coins, Zap, TrendingUp, Download } from "lucide-react";

interface MiningStats {
  totalMined: number;
  miningRate: number;
  energyLevel: number;
  multiplier: number;
}

export const MiningInterface = () => {
  const [stats, setStats] = useState<MiningStats>({
    totalMined: 0,
    miningRate: 0.1,
    energyLevel: 100,
    multiplier: 1
  });
  const [isMining, setIsMining] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [miningProgress, setMiningProgress] = useState(0);

  // Auto mining effect
  useEffect(() => {
    if (isMining && stats.energyLevel > 0) {
      const interval = setInterval(() => {
        setStats(prev => ({
          ...prev,
          totalMined: prev.totalMined + (prev.miningRate * prev.multiplier),
          energyLevel: Math.max(0, prev.energyLevel - 0.1)
        }));
        setMiningProgress(prev => (prev + 1) % 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isMining, stats.energyLevel]);

  // Energy regeneration
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        energyLevel: Math.min(100, prev.energyLevel + 0.5)
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMiningTap = useCallback(() => {
    if (stats.energyLevel >= 1) {
      setTapCount(prev => prev + 1);
      setStats(prev => ({
        ...prev,
        totalMined: prev.totalMined + (prev.miningRate * prev.multiplier * 5),
        energyLevel: Math.max(0, prev.energyLevel - 1)
      }));
    }
  }, [stats.energyLevel, stats.miningRate, stats.multiplier]);

  const toggleMining = () => {
    setIsMining(!isMining);
  };

  const formatTON = (amount: number) => {
    return amount.toFixed(6);
  };

  return (
    <div className="min-h-screen bg-background particles relative">
      {/* Header Stats */}
      <div className="p-4 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold ton-gradient bg-clip-text text-transparent">
            TON Miner
          </h1>
          <p className="text-sm text-muted-foreground">Earn TON for FREE</p>
        </div>

        {/* Balance Card */}
        <Card className="card-gradient border-primary/20 glow-effect">
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="w-6 h-6 text-ton-gold" />
              <span className="text-2xl font-bold text-foreground">
                {formatTON(stats.totalMined)}
              </span>
              <span className="text-sm text-primary font-semibold">TON</span>
            </div>
            <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Download className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          </div>
        </Card>

        {/* Mining Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="card-gradient border-border/50">
            <div className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
              <div className="text-lg font-semibold">{stats.miningRate.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground">TON/sec</div>
            </div>
          </Card>
          <Card className="card-gradient border-border/50">
            <div className="p-4 text-center">
              <Zap className="w-5 h-5 text-mining-active mx-auto mb-2" />
              <div className="text-lg font-semibold">x{stats.multiplier}</div>
              <div className="text-xs text-muted-foreground">Multiplier</div>
            </div>
          </Card>
        </div>

        {/* Energy Level */}
        <Card className="card-gradient border-border/50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Energy</span>
              <span className="text-sm text-muted-foreground">
                {Math.floor(stats.energyLevel)}/100
              </span>
            </div>
            <Progress 
              value={stats.energyLevel} 
              className="h-3 bg-secondary" 
            />
          </div>
        </Card>

        {/* Mining Button */}
        <div className="flex flex-col items-center space-y-4 py-8">
          <Button
            onClick={handleMiningTap}
            disabled={stats.energyLevel < 1}
            className={`
              w-48 h-48 rounded-full mining-gradient border-4 border-primary-glow
              ${isMining ? 'mining-pulse' : ''} 
              ${stats.energyLevel < 1 ? 'opacity-50' : 'glow-effect'}
              hover:scale-105 transition-all duration-300
              disabled:hover:scale-100
            `}
          >
            <div className="text-center">
              <Pickaxe className="w-16 h-16 mb-2 mx-auto" />
              <div className="text-sm font-semibold">TAP TO MINE</div>
              <div className="text-xs opacity-80">+{(stats.miningRate * stats.multiplier * 5).toFixed(3)} TON</div>
            </div>
          </Button>

          <div className="flex gap-4">
            <Badge variant="secondary" className="bg-secondary/80">
              Taps: {tapCount}
            </Badge>
            <Badge 
              variant={isMining ? "default" : "outline"}
              className={isMining ? "bg-mining-active text-background" : ""}
            >
              {isMining ? "Mining Active" : "Mining Paused"}
            </Badge>
          </div>

          <Button
            onClick={toggleMining}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {isMining ? "Pause Mining" : "Start Auto Mining"}
          </Button>
        </div>

        {/* Mining Progress */}
        {isMining && (
          <Card className="card-gradient border-primary/30">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Mining Progress</span>
                <span className="text-sm text-primary">{miningProgress}%</span>
              </div>
              <Progress 
                value={miningProgress} 
                className="h-2 bg-secondary" 
              />
            </div>
          </Card>
        )}

        {/* Info Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          <p>Connect to TON Blockchain for real mining rewards</p>
          <p className="mt-1">Instant withdrawals • No fees • 100% Free</p>
        </div>
      </div>
    </div>
  );
};