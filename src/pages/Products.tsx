import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  category: z.enum(["smartphone", "notebook", "smart_tv", "outros"]),
  voltage: z.string().optional(),
  resolution: z.string().optional(),
  dimensions: z.string().optional(),
  storage: z.string().optional(),
  connectivity: z.string().optional(),
  minimum_stock: z.number().min(0, "Estoque mínimo deve ser >= 0"),
  current_stock: z.number().min(0, "Estoque atual deve ser >= 0"),
  unit_price: z.number().min(0, "Preço deve ser >= 0"),
});

type Product = {
  id: string;
  name: string;
  description?: string;
  category: string;
  voltage?: string;
  resolution?: string;
  dimensions?: string;
  storage?: string;
  connectivity?: string;
  minimum_stock: number;
  current_stock: number;
  unit_price?: number;
};

const Products = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userName, setUserName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "outros",
    voltage: "",
    resolution: "",
    dimensions: "",
    storage: "",
    connectivity: "",
    minimum_stock: 10,
    current_stock: 0,
    unit_price: 0,
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
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar produtos");
    } else {
      setProducts(data || []);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = productSchema.parse(formData);

      const productData = {
        name: validated.name,
        description: validated.description || null,
        category: validated.category,
        voltage: validated.voltage || null,
        resolution: validated.resolution || null,
        dimensions: validated.dimensions || null,
        storage: validated.storage || null,
        connectivity: validated.connectivity || null,
        minimum_stock: validated.minimum_stock,
        current_stock: validated.current_stock,
        unit_price: validated.unit_price,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("products")
          .insert([productData]);

        if (error) throw error;
        toast.success("Produto cadastrado com sucesso!");
      }

      setIsDialogOpen(false);
      resetForm();
      loadProducts();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Erro ao salvar produto");
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir produto");
    } else {
      toast.success("Produto excluído com sucesso!");
      loadProducts();
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category,
      voltage: product.voltage || "",
      resolution: product.resolution || "",
      dimensions: product.dimensions || "",
      storage: product.storage || "",
      connectivity: product.connectivity || "",
      minimum_stock: product.minimum_stock,
      current_stock: product.current_stock,
      unit_price: product.unit_price || 0,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      category: "outros",
      voltage: "",
      resolution: "",
      dimensions: "",
      storage: "",
      connectivity: "",
      minimum_stock: 10,
      current_stock: 0,
      unit_price: 0,
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header userName={userName} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h2 className="text-3xl font-bold">Gerenciar Produtos</h2>
              <p className="text-muted-foreground">Cadastre e gerencie seus equipamentos</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                <DialogDescription>
                  Preencha os dados do produto
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smartphone">Smartphone</SelectItem>
                        <SelectItem value="notebook">Notebook</SelectItem>
                        <SelectItem value="smart_tv">Smart TV</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="voltage">Tensão</Label>
                    <Input
                      id="voltage"
                      placeholder="Ex: 110V/220V"
                      value={formData.voltage}
                      onChange={(e) => setFormData({ ...formData, voltage: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="resolution">Resolução</Label>
                    <Input
                      id="resolution"
                      placeholder="Ex: 1920x1080"
                      value={formData.resolution}
                      onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dimensions">Dimensões</Label>
                    <Input
                      id="dimensions"
                      placeholder="Ex: 15.6 polegadas"
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="storage">Armazenamento</Label>
                    <Input
                      id="storage"
                      placeholder="Ex: 256GB SSD"
                      value={formData.storage}
                      onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="connectivity">Conectividade</Label>
                    <Input
                      id="connectivity"
                      placeholder="Ex: Wi-Fi, Bluetooth"
                      value={formData.connectivity}
                      onChange={(e) => setFormData({ ...formData, connectivity: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="minimum_stock">Estoque Mínimo *</Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      min="0"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="current_stock">Estoque Atual *</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      min="0"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="unit_price">Preço Unitário (R$) *</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProduct ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Estoque Atual</TableHead>
                  <TableHead className="text-right">Estoque Mínimo</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} className={product.current_stock <= product.minimum_stock ? "bg-warning/10" : ""}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="capitalize">{product.category.replace("_", " ")}</TableCell>
                    <TableCell className="text-right">{product.current_stock}</TableCell>
                    <TableCell className="text-right">{product.minimum_stock}</TableCell>
                    <TableCell className="text-right">
                      R$ {product.unit_price?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum produto encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Products;
