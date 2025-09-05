import { MiningInterface } from "@/components/MiningInterface";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = () => {
  return (
    <ProtectedRoute>
      <MiningInterface />
    </ProtectedRoute>
  );
};

export default Index;
