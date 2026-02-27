import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WithdrawDialogProps {
  balance: number;
  onSuccess: () => void;
}

export const WithdrawDialog = ({ balance, onSuccess }: WithdrawDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (!walletAddress.trim()) {
      toast({ title: "Wallet address required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke("withdraw", {
        body: {
          action: "withdraw",
          amount: numAmount,
          wallet_address: walletAddress.trim(),
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) {
        toast({ title: "Withdrawal failed", description: response.data.error, variant: "destructive" });
        return;
      }

      toast({
        title: "Withdrawal submitted!",
        description: `${numAmount.toFixed(6)} TON withdrawal is being processed.`,
      });
      setOpen(false);
      setAmount("");
      setWalletAddress("");
      onSuccess();
    } catch (err) {
      toast({ title: "Error", description: "Failed to submit withdrawal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Download className="w-4 h-4 mr-2" />
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Withdraw TON</DialogTitle>
          <DialogDescription>
            Available balance: {balance.toFixed(6)} TON
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Amount (TON)</Label>
            <Input
              type="number"
              step="0.000001"
              min="0.01"
              max={balance}
              placeholder="0.000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary border-border"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-primary"
              onClick={() => setAmount(balance.toString())}
            >
              Max
            </Button>
          </div>
          <div className="space-y-2">
            <Label>TON Wallet Address</Label>
            <Input
              type="text"
              placeholder="UQ... or EQ..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleWithdraw}
            disabled={loading || !amount || !walletAddress}
            className="mining-gradient"
          >
            {loading ? "Processing..." : "Confirm Withdrawal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
