import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, TrendingDown, AlertTriangle, LogOut } from "lucide-react";
import { toast } from "sonner";

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalEntries: number;
  totalExits: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    totalEntries: 0,
    totalExits: 0,
  });

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setUserName(profile.full_name);
    }
  };

  const loadDashboardData = async () => {
    // Get total products
    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    // Get low stock products
    const { data: products } = await supabase
      .from("products")
      .select("current_quantity, minimum_quantity");

    const lowStockProducts = products?.filter(
      (p) => p.current_quantity <= p.minimum_quantity
    ).length || 0;

    // Get entries count
    const { count: totalEntries } = await supabase
      .from("stock_movements")
      .select("*", { count: "exact", head: true })
      .eq("movement_type", "entrada");

    // Get exits count
    const { count: totalExits } = await supabase
      .from("stock_movements")
      .select("*", { count: "exact", head: true })
      .eq("movement_type", "saida");

    setStats({
      totalProducts: totalProducts || 0,
      lowStockProducts,
      totalEntries: totalEntries || 0,
      totalExits: totalExits || 0,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Sistema de Estoque</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, <span className="font-semibold text-foreground">{userName}</span>
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
            <p className="text-muted-foreground">
              Visão geral do sistema de gestão de estoque
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <p className="text-xs text-muted-foreground">Produtos cadastrados</p>
              </CardContent>
            </Card>

            <Card className="border-warning">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
                <AlertTriangle className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{stats.lowStockProducts}</div>
                <p className="text-xs text-muted-foreground">Produtos abaixo do mínimo</p>
              </CardContent>
            </Card>

            <Card className="border-success">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{stats.totalEntries}</div>
                <p className="text-xs text-muted-foreground">Movimentações de entrada</p>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Saídas</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.totalExits}</div>
                <p className="text-xs text-muted-foreground">Movimentações de saída</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/products")}>
              <CardHeader>
                <CardTitle>Cadastro de Produtos</CardTitle>
                <CardDescription>
                  Gerencie o cadastro de produtos, categorias e informações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Acessar Cadastro</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/stock")}>
              <CardHeader>
                <CardTitle>Gestão de Estoque</CardTitle>
                <CardDescription>
                  Controle entradas, saídas e movimentações de estoque
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Acessar Gestão</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
