import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  unit: string;
  current_quantity: number;
  minimum_quantity: number;
}

interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  responsible_user_id: string;
  products: { name: string; unit: string };
}

const Stock = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userId, setUserId] = useState("");
  
  const [formData, setFormData] = useState({
    product_id: "",
    movement_type: "entrada",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    loadProducts();
    loadMovements();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setUserId(session.user.id);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("name");
    
    if (data) {
      setProducts(data);
    }
  };

  const loadMovements = async () => {
    const { data: movementsData } = await supabase
      .from("stock_movements")
      .select(`
        *,
        products (name, unit)
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (movementsData) {
      // Fetch user profiles for responsible users
      const userIds = [...new Set(movementsData.map(m => m.responsible_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      const movementsWithProfiles = movementsData.map(m => ({
        ...m,
        responsible_name: profileMap.get(m.responsible_user_id) || "Usuário"
      }));
      
      setMovements(movementsWithProfiles as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.quantity) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero");
      return;
    }

    const { error } = await supabase
      .from("stock_movements")
      .insert([{
        product_id: formData.product_id,
        movement_type: formData.movement_type,
        quantity,
        notes: formData.notes || null,
        responsible_user_id: userId,
      }]);

    if (error) {
      toast.error("Erro ao registrar movimentação");
    } else {
      toast.success("Movimentação registrada com sucesso!");
      resetForm();
      loadProducts();
      loadMovements();
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      movement_type: "entrada",
      quantity: "",
      notes: "",
    });
    setDialogOpen(false);
  };

  const getLowStockProducts = () => {
    return products.filter(p => p.current_quantity <= p.minimum_quantity);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {getLowStockProducts().length > 0 && (
          <Alert className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              <strong>Atenção!</strong> {getLowStockProducts().length} produto(s) com estoque abaixo do mínimo:
              <ul className="mt-2 ml-4 list-disc">
                {getLowStockProducts().slice(0, 3).map((p) => (
                  <li key={p.id}>
                    {p.name} - Atual: {p.current_quantity.toFixed(2)} / Mínimo: {p.minimum_quantity.toFixed(2)}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Gestão de Estoque
                </CardTitle>
                <CardDescription>
                  Controle de entrada e saída de materiais
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <History className="h-4 w-4 mr-2" />
                      Histórico
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Histórico de Movimentações</DialogTitle>
                      <DialogDescription>
                        Últimas 50 movimentações registradas
                      </DialogDescription>
                    </DialogHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead>Responsável</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement: any) => (
                          <TableRow key={movement.id}>
                            <TableCell>
                              {format(new Date(movement.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{movement.products.name}</TableCell>
                            <TableCell>
                              <Badge variant={movement.movement_type === "entrada" ? "default" : "secondary"}>
                                {movement.movement_type === "entrada" ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {movement.movement_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {movement.quantity.toFixed(2)} {movement.products.unit}
                            </TableCell>
                            <TableCell>{movement.responsible_name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </DialogContent>
                </Dialog>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Nova Movimentação
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Movimentação</DialogTitle>
                      <DialogDescription>
                        Registre entrada ou saída de produtos
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="product">Produto *</Label>
                        <Select
                          value={formData.product_id}
                          onValueChange={(value) => setFormData({...formData, product_id: value})}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - Atual: {product.current_quantity.toFixed(2)} {product.unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="movement_type">Tipo *</Label>
                          <Select
                            value={formData.movement_type}
                            onValueChange={(value) => setFormData({...formData, movement_type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="entrada">Entrada</SelectItem>
                              <SelectItem value="saida">Saída</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantidade *</Label>
                          <Input
                            id="quantity"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.quantity}
                            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          rows={3}
                        />
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          Registrar
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Qtd. Atual</TableHead>
                    <TableHead className="text-right">Qtd. Mínima</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum produto cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => {
                      const isLowStock = product.current_quantity <= product.minimum_quantity;
                      return (
                        <TableRow key={product.id} className={isLowStock ? "bg-warning/5" : ""}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.unit}</TableCell>
                          <TableCell className="text-right">
                            {product.current_quantity.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.minimum_quantity.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLowStock ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Estoque Baixo
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-success">
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Stock;
