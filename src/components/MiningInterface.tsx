import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Pickaxe, Coins, Zap, TrendingUp, Download, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MiningProfile {
  total_mined: number;
  mining_rate: number;
  energy_level: number;
  multiplier: number;
  tap_count: number;
}

export const MiningInterface = () => {
  const [profile, setProfile] = useState<MiningProfile>({
    total_mined: 0,
    mining_rate: 0.1,
    energy_level: 100,
    multiplier: 1,
    tap_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tapping, setTapping] = useState(false);
  const { toast } = useToast();

  // Fetch stats from server
  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("mining", {
        body: { action: "get_stats" },
      });

      if (response.error) throw response.error;
      if (response.data?.profile) {
        setProfile(response.data.profile);
      }
    } catch (err) {
      // Silent fail on stats refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 5 seconds for energy regen display
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleMiningTap = useCallback(async () => {
    if (tapping || profile.energy_level < 1) return;
    setTapping(true);

    try {
      const response = await supabase.functions.invoke("mining", {
        body: { action: "tap" },
      });

      if (response.error) throw response.error;
      if (response.data?.profile) {
        setProfile(response.data.profile);
      } else if (response.data?.error) {
        toast({
          title: "Mining failed",
          description: response.data.error,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to process mining tap",
        variant: "destructive",
      });
    } finally {
      setTapping(false);
    }
  }, [tapping, profile.energy_level, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const formatTON = (amount: number) => {
    return amount.toFixed(6);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background particles relative flex items-center justify-center">
        <Pickaxe className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background particles relative">
      {/* Header */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold ton-gradient bg-clip-text text-transparent">
              TON Miner
            </h1>
            <p className="text-sm text-muted-foreground">Earn TON for FREE</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="card-gradient border-primary/20 glow-effect">
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="w-6 h-6 text-ton-gold" />
              <span className="text-2xl font-bold text-foreground">
                {formatTON(profile.total_mined)}
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
              <div className="text-lg font-semibold">{profile.mining_rate.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground">TON/tap</div>
            </div>
          </Card>
          <Card className="card-gradient border-border/50">
            <div className="p-4 text-center">
              <Zap className="w-5 h-5 text-mining-active mx-auto mb-2" />
              <div className="text-lg font-semibold">x{profile.multiplier}</div>
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
                {Math.floor(profile.energy_level)}/100
              </span>
            </div>
            <Progress
              value={profile.energy_level}
              className="h-3 bg-secondary"
            />
          </div>
        </Card>

        {/* Mining Button */}
        <div className="flex flex-col items-center space-y-4 py-8">
          <Button
            onClick={handleMiningTap}
            disabled={profile.energy_level < 1 || tapping}
            className={`
              w-48 h-48 rounded-full mining-gradient border-4 border-primary-glow
              ${profile.energy_level < 1 ? 'opacity-50' : 'glow-effect'}
              hover:scale-105 transition-all duration-300
              disabled:hover:scale-100
            `}
          >
            <div className="text-center">
              <Pickaxe className="w-16 h-16 mb-2 mx-auto" />
              <div className="text-sm font-semibold">TAP TO MINE</div>
              <div className="text-xs opacity-80">+{(profile.mining_rate * profile.multiplier * 5).toFixed(3)} TON</div>
            </div>
          </Button>

          <Badge variant="secondary" className="bg-secondary/80">
            Taps: {profile.tap_count}
          </Badge>
        </div>

        {/* Info Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/30">
          <p>Server-validated mining • Secure rewards</p>
          <p className="mt-1">All mining actions verified server-side</p>
        </div>
      </div>
    </div>
  );
};
