import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Withdrawal {
  id: string;
  amount: number;
  wallet_address: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, className: "bg-accent/20 text-accent border-accent/30" },
  processing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, className: "bg-primary/20 text-primary border-primary/30" },
  completed: { icon: <CheckCircle className="w-4 h-4" />, className: "bg-mining-active/20 text-mining-active border-mining-active/30" },
  failed: { icon: <XCircle className="w-4 h-4" />, className: "bg-destructive/20 text-destructive border-destructive/30" },
};

const History = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await supabase.functions.invoke("withdraw", {
          body: { action: "history" },
        });
        if (response.data?.withdrawals) {
          setWithdrawals(response.data.withdrawals);
        }
      } catch (err) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-background particles relative">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold ton-gradient bg-clip-text text-transparent">
            Transaction History
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <Card className="card-gradient border-border/50">
            <div className="p-8 text-center text-muted-foreground">
              No withdrawals yet. Start mining and withdraw your TON!
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => {
              const config = statusConfig[w.status] || statusConfig.pending;
              return (
                <Card key={w.id} className="card-gradient border-border/50">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-foreground">
                        -{Number(w.amount).toFixed(6)} TON
                      </span>
                      <Badge variant="outline" className={config.className}>
                        <span className="flex items-center gap-1">
                          {config.icon}
                          {w.status}
                        </span>
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="truncate">To: {w.wallet_address}</div>
                      <div>{new Date(w.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
