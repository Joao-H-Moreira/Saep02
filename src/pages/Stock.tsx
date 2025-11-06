import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Minus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const movementSchema = z.object({
  product_id: z.string().uuid(),
  movement_type: z.enum(["entrada", "saida"]),
  quantity: z.number().min(1, "Quantidade deve ser maior que 0"),
  notes: z.string().optional(),
});

type Product = {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
};

type Movement = {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  movement_date: string;
  notes?: string;
  products: {
    name: string;
  };
  profiles: {
    full_name: string;
  };
};

const Stock = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userName, setUserName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [formData, setFormData] = useState({
    product_id: "",
    movement_type: "entrada" as "entrada" | "saida",
    quantity: 1,
    notes: "",
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
        loadProducts();
        loadMovements();
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

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, current_stock, minimum_stock")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar produtos");
    } else {
      setProducts(data || []);
      
      // Verificar produtos com estoque baixo
      const lowStock = (data || []).filter(p => p.current_stock <= p.minimum_stock);
      if (lowStock.length > 0) {
        lowStock.forEach(product => {
          toast.warning(
            `Alerta: ${product.name} está com estoque baixo! (${product.current_stock} unidades)`,
            { duration: 5000 }
          );
        });
      }
    }
  };

  const loadMovements = async () => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select(`
        *,
        products(name)
      `)
      .order("movement_date", { ascending: false })
      .limit(20);

    if (error) {
      toast.error("Erro ao carregar movimentações");
      return;
    }

    if (data) {
      // Buscar dados dos perfis separadamente
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const movementsWithProfiles = data.map(movement => ({
        ...movement,
        profiles: profilesMap.get(movement.user_id) || { full_name: "Usuário" },
      }));

      setMovements(movementsWithProfiles as any);
    }
  };

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) return;

    try {
      const validated = movementSchema.parse(formData);

      // Verificar se há estoque suficiente para saída
      if (validated.movement_type === "saida") {
        const product = products.find(p => p.id === validated.product_id);
        if (product && product.current_stock < validated.quantity) {
          toast.error("Estoque insuficiente para esta saída!");
          return;
        }
      }

      const movementData = {
        product_id: validated.product_id,
        movement_type: validated.movement_type,
        quantity: validated.quantity,
        notes: validated.notes || null,
        user_id: session.user.id,
      };

      const { error } = await supabase
        .from("stock_movements")
        .insert([movementData]);

      if (error) throw error;

      toast.success(`${validated.movement_type === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!`);
      
      setFormData({
        product_id: "",
        movement_type: "entrada",
        quantity: 1,
        notes: "",
      });

      loadProducts();
      loadMovements();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao registrar movimentação");
      }
    }
  };

  // Algoritmo de ordenação (Bubble Sort) para demonstração
  const sortedProducts = [...products].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header userName={userName} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-3xl font-bold">Gestão de Estoque</h2>
            <p className="text-muted-foreground">Registre entradas e saídas de produtos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Registrar Movimentação</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitMovement} className="space-y-4">
                <div>
                  <Label htmlFor="product">Produto *</Label>
                  <Select 
                    value={formData.product_id} 
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Estoque: {product.current_stock})
                          {product.current_stock <= product.minimum_stock && (
                            <AlertTriangle className="inline h-4 w-4 ml-2 text-warning" />
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="movement_type">Tipo de Movimentação *</Label>
                  <Select 
                    value={formData.movement_type} 
                    onValueChange={(value: "entrada" | "saida") => setFormData({ ...formData, movement_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">
                        <div className="flex items-center">
                          <Plus className="h-4 w-4 mr-2 text-success" />
                          Entrada
                        </div>
                      </SelectItem>
                      <SelectItem value="saida">
                        <div className="flex items-center">
                          <Minus className="h-4 w-4 mr-2 text-destructive" />
                          Saída
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informações adicionais (opcional)"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Registrar Movimentação
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Produtos em Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {sortedProducts.map((product) => (
                  <div 
                    key={product.id}
                    className={`p-3 border rounded-lg ${
                      product.current_stock <= product.minimum_stock 
                        ? "border-warning bg-warning/5" 
                        : "border-border"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Mínimo: {product.minimum_stock} unidades
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          product.current_stock <= product.minimum_stock 
                            ? "text-warning" 
                            : "text-success"
                        }`}>
                          {product.current_stock}
                        </p>
                        <p className="text-xs text-muted-foreground">em estoque</p>
                      </div>
                    </div>
                    {product.current_stock <= product.minimum_stock && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        Estoque abaixo do mínimo!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 shadow-soft">
          <CardHeader>
            <CardTitle>Histórico de Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {new Date(movement.movement_date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{movement.products.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        movement.movement_type === "entrada" 
                          ? "bg-success/10 text-success" 
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {movement.movement_type === "entrada" ? (
                          <><Plus className="h-3 w-3" /> Entrada</>
                        ) : (
                          <><Minus className="h-3 w-3" /> Saída</>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {movement.quantity}
                    </TableCell>
                    <TableCell>{movement.profiles.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {movement.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {movements.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma movimentação registrada
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Stock;
