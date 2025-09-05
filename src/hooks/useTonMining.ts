import { useState, useEffect, useCallback } from 'react';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { toNano, beginCell } from '@ton/ton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MiningStats {
  totalMined: number;
  miningRate: number;
  energyLevel: number;
  multiplier: number;
  realTonBalance: number;
}

export function useTonMining() {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const { user, isAuthenticated } = useAuth();
  
  const [stats, setStats] = useState<MiningStats>({
    totalMined: 0,
    miningRate: 0.001,
    energyLevel: 100,
    multiplier: 1,
    realTonBalance: 0
  });
  
  const [isMining, setIsMining] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [miningProgress, setMiningProgress] = useState(0);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load mining data from database
  const loadMiningData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mining_sessions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading mining data:', error);
        return;
      }

      if (data) {
        // Calculate energy regeneration since last update
        const lastUpdate = new Date(data.last_energy_update);
        const now = new Date();
        const minutesPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
        const energyToRestore = Math.min(minutesPassed * 0.5, 100 - data.energy_level);
        
        setStats({
          totalMined: parseFloat(data.total_mined.toString()),
          miningRate: parseFloat(data.mining_rate.toString()),
          energyLevel: Math.min(100, data.energy_level + energyToRestore),
          multiplier: parseFloat(data.multiplier.toString()),
          realTonBalance: parseFloat(data.real_ton_balance.toString())
        });
        setIsMining(data.is_mining);
      }
    } catch (error) {
      console.error('Error loading mining data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Save mining data to database
  const saveMiningData = useCallback(async (updatedStats: MiningStats, miningStatus: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('mining_sessions')
        .update({
          total_mined: updatedStats.totalMined,
          mining_rate: updatedStats.miningRate,
          energy_level: updatedStats.energyLevel,
          multiplier: updatedStats.multiplier,
          real_ton_balance: updatedStats.realTonBalance,
          is_mining: miningStatus,
          last_energy_update: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving mining data:', error);
      }
    } catch (error) {
      console.error('Error saving mining data:', error);
    }
  }, [user]);

  // Fetch real TON balance
  const fetchBalance = useCallback(async () => {
    if (!wallet?.account.address) return;
    
    try {
      // This would typically use TON API to get real balance
      // For demo purposes, using a mock value
      const mockBalance = Math.random() * 10;
      const updatedStats = { ...stats, realTonBalance: mockBalance };
      setStats(updatedStats);
      
      if (user) {
        await saveMiningData(updatedStats, isMining);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [wallet?.account.address, stats, user, isMining, saveMiningData]);

  // Load mining data when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      loadMiningData();
    }
  }, [isAuthenticated, loadMiningData]);

  // Initialize wallet connection
  useEffect(() => {
    if (wallet && user) {
      fetchBalance();
    }
  }, [wallet, user, fetchBalance]);

  // Auto-mining logic
  useEffect(() => {
    if (!isMining || !wallet || !user || stats.energyLevel <= 0) return;
    
    const interval = setInterval(async () => {
      setStats(prev => {
        if (prev.energyLevel <= 0) {
          setIsMining(false);
          return prev;
        }
        
        const mined = prev.miningRate * prev.multiplier;
        const updatedStats = {
          ...prev,
          totalMined: prev.totalMined + mined,
          energyLevel: Math.max(0, prev.energyLevel - 1)
        };

        // Save to database (non-blocking)
        setTimeout(() => saveMiningData(updatedStats, true), 0);
        
        return updatedStats;
      });
      
      setMiningProgress(prev => (prev + 10) % 100);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMining, wallet, user, stats.energyLevel, saveMiningData]);

  // Energy regeneration
  useEffect(() => {
    if (stats.energyLevel >= 100 || !user) return;
    
    const interval = setInterval(async () => {
      setStats(prev => {
        const updatedStats = {
          ...prev,
          energyLevel: Math.min(100, prev.energyLevel + 0.5)
        };
        
        // Save to database (non-blocking)
        setTimeout(() => saveMiningData(updatedStats, isMining), 0);
        
        return updatedStats;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [stats.energyLevel, user, isMining, saveMiningData]);

  const handleMiningTap = useCallback(async () => {
    if (!wallet || !user) return;
    
    setStats(prev => {
      if (prev.energyLevel <= 0) return prev;
      
      const mined = prev.miningRate * prev.multiplier * 2; // Tap bonus
      setTapCount(count => count + 1);
      
      const updatedStats = {
        ...prev,
        totalMined: prev.totalMined + mined,
        energyLevel: Math.max(0, prev.energyLevel - 2)
      };

      // Save to database (non-blocking)
      setTimeout(() => saveMiningData(updatedStats, isMining), 0);
      
      return updatedStats;
    });
  }, [wallet, user, isMining, saveMiningData]);

  const toggleMining = useCallback(async () => {
    if (!wallet || !user) return;
    
    const newMiningStatus = !isMining;
    setIsMining(newMiningStatus);
    
    // Save mining status to database
    await saveMiningData(stats, newMiningStatus);
  }, [wallet, user, isMining, stats, saveMiningData]);

  const withdrawTON = useCallback(async (amount: number) => {
    if (!wallet || !tonConnectUI || !user) return;
    
    if (amount > stats.totalMined) {
      throw new Error('Insufficient balance');
    }
    
    setIsWithdrawing(true);
    
    try {
      // Create withdrawal transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        messages: [
          {
            address: wallet.account.address,
            amount: toNano(amount.toString()).toString(),
            payload: beginCell()
              .storeUint(0, 32)
              .storeStringTail("TON Miner Withdrawal")
              .endCell()
              .toBoc()
              .toString("base64")
          }
        ]
      };

      await tonConnectUI.sendTransaction(transaction);
      
      // Update local stats after successful withdrawal
      const updatedStats = {
        ...stats,
        totalMined: Math.max(0, stats.totalMined - amount)
      };
      
      setStats(updatedStats);
      
      // Save to database
      await saveMiningData(updatedStats, isMining);
      
      // Refresh balance
      await fetchBalance();
      
    } catch (error) {
      console.error('Withdrawal failed:', error);
      throw error;
    } finally {
      setIsWithdrawing(false);
    }
  }, [wallet, tonConnectUI, user, stats, isMining, saveMiningData, fetchBalance]);

  return {
    stats,
    isMining,
    tapCount,
    miningProgress,
    isWithdrawing,
    loading,
    isConnected: !!wallet,
    isAuthenticated,
    handleMiningTap,
    toggleMining,
    withdrawTON,
    formatTON: (amount: number) => amount.toFixed(6)
  };
}