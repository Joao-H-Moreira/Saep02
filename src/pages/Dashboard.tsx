import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import StatsCard from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Package, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalValue: 0,
  });

  useEffect(() => {
    const setupAuth = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, currentSession) => {
          setSession(currentSession);
          if (!currentSession) {
            navigate("/auth");
          }
        }
      );

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (!currentSession) {
        navigate("/auth");
      } else {
        loadUserProfile(currentSession.user.id);
        loadStats();
      }

      return () => subscription.unsubscribe();
    };

    setupAuth();
  }, [navigate]);

  const loadUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    
    if (data) {
      setUserName(data.full_name);
    }
  };

  const loadStats = async () => {
    const { data: products } = await supabase
      .from("products")
      .select("*");

    if (products) {
      const total = products.length;
      const lowStock = products.filter(p => p.current_stock <= p.minimum_stock).length;
      const totalValue = products.reduce((sum, p) => sum + (p.current_stock * (p.unit_price || 0)), 0);

      setStats({
        totalProducts: total,
        lowStock,
        totalValue,
      });

      if (lowStock > 0) {
        toast.warning(`Atenção: ${lowStock} produto(s) com estoque baixo!`, {
          duration: 5000,
        });
      }
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={userName} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral do seu estoque de equipamentos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total de Produtos"
            value={stats.totalProducts}
            icon={Package}
            variant="default"
          />
          <StatsCard
            title="Produtos em Estoque Baixo"
            value={stats.lowStock}
            icon={AlertTriangle}
            variant={stats.lowStock > 0 ? "warning" : "success"}
          />
          <StatsCard
            title="Valor Total em Estoque"
            value={`R$ ${stats.totalValue.toFixed(2)}`}
            icon={TrendingUp}
            variant="success"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Button
            size="lg"
            className="h-32 text-lg font-semibold"
            onClick={() => navigate("/products")}
          >
            <Package className="mr-3 h-6 w-6" />
            Gerenciar Produtos
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="h-32 text-lg font-semibold"
            onClick={() => navigate("/stock")}
          >
            <TrendingDown className="mr-3 h-6 w-6" />
            Gestão de Estoque
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
