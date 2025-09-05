import { useState, useEffect, useCallback } from 'react';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { toNano, beginCell } from '@ton/ton';

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

  // Fetch real TON balance
  const fetchBalance = useCallback(async () => {
    if (!wallet?.account.address) return;
    
    try {
      // This would typically use TON API to get real balance
      // For demo purposes, using a mock value
      const mockBalance = Math.random() * 10;
      setStats(prev => ({ ...prev, realTonBalance: mockBalance }));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [wallet?.account.address]);

  // Initialize wallet connection
  useEffect(() => {
    if (wallet) {
      fetchBalance();
    }
  }, [wallet, fetchBalance]);

  // Auto-mining logic
  useEffect(() => {
    if (!isMining || !wallet) return;
    
    const interval = setInterval(() => {
      setStats(prev => {
        if (prev.energyLevel <= 0) {
          setIsMining(false);
          return prev;
        }
        
        const mined = prev.miningRate * prev.multiplier;
        return {
          ...prev,
          totalMined: prev.totalMined + mined,
          energyLevel: Math.max(0, prev.energyLevel - 1)
        };
      });
      
      setMiningProgress(prev => (prev + 10) % 100);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMining, wallet]);

  // Energy regeneration
  useEffect(() => {
    if (stats.energyLevel >= 100) return;
    
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        energyLevel: Math.min(100, prev.energyLevel + 0.5)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [stats.energyLevel]);

  const handleMiningTap = useCallback(() => {
    if (!wallet) return;
    
    setStats(prev => {
      if (prev.energyLevel <= 0) return prev;
      
      const mined = prev.miningRate * prev.multiplier * 2; // Tap bonus
      setTapCount(count => count + 1);
      
      return {
        ...prev,
        totalMined: prev.totalMined + mined,
        energyLevel: Math.max(0, prev.energyLevel - 2)
      };
    });
  }, [wallet]);

  const toggleMining = useCallback(() => {
    if (!wallet) return;
    setIsMining(prev => !prev);
  }, [wallet]);

  const withdrawTON = useCallback(async (amount: number) => {
    if (!wallet || !tonConnectUI) return;
    
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
      setStats(prev => ({
        ...prev,
        totalMined: Math.max(0, prev.totalMined - amount)
      }));
      
      // Refresh balance
      fetchBalance();
      
    } catch (error) {
      console.error('Withdrawal failed:', error);
      throw error;
    } finally {
      setIsWithdrawing(false);
    }
  }, [wallet, tonConnectUI, fetchBalance]);

  return {
    stats,
    isMining,
    tapCount,
    miningProgress,
    isWithdrawing,
    isConnected: !!wallet,
    handleMiningTap,
    toggleMining,
    withdrawTON,
    formatTON: (amount: number) => amount.toFixed(6)
  };
}