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
import { ArrowLeft, Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  current_quantity: number;
  minimum_quantity: number;
  category_id: string | null;
  categories?: { name: string };
}

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    unit: "unidade",
    minimum_quantity: "0",
  });

  useEffect(() => {
    checkAuth();
    loadCategories();
    loadProducts();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (data) {
      setCategories(data);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(`
        *,
        categories (name)
      `)
      .order("name");
    
    if (data) {
      setProducts(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.unit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description || null,
      category_id: formData.category_id || null,
      unit: formData.unit,
      minimum_quantity: parseFloat(formData.minimum_quantity),
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Erro ao atualizar produto");
      } else {
        toast.success("Produto atualizado com sucesso!");
        resetForm();
        loadProducts();
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert([{ ...productData, current_quantity: 0 }]);

      if (error) {
        toast.error("Erro ao criar produto");
      } else {
        toast.success("Produto criado com sucesso!");
        resetForm();
        loadProducts();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) {
      return;
    }

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

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category_id: product.category_id || "",
      unit: product.unit,
      minimum_quantity: product.minimum_quantity.toString(),
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category_id: "",
      unit: "unidade",
      minimum_quantity: "0",
    });
    setEditingProduct(null);
    setDialogOpen(false);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  Cadastro de Produtos
                </CardTitle>
                <CardDescription>
                  Gerencie todos os produtos do seu estoque
                </CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? "Editar Produto" : "Novo Produto"}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados do produto
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit">Unidade *</Label>
                        <Select
                          value={formData.unit}
                          onValueChange={(value) => setFormData({...formData, unit: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unidade">Unidade</SelectItem>
                            <SelectItem value="kg">Quilograma (kg)</SelectItem>
                            <SelectItem value="g">Grama (g)</SelectItem>
                            <SelectItem value="litro">Litro</SelectItem>
                            <SelectItem value="metro">Metro</SelectItem>
                            <SelectItem value="kit">Kit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select
                          value={formData.category_id}
                          onValueChange={(value) => setFormData({...formData, category_id: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="minimum_quantity">Quantidade Mínima *</Label>
                        <Input
                          id="minimum_quantity"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.minimum_quantity}
                          onChange={(e) => setFormData({...formData, minimum_quantity: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingProduct ? "Atualizar" : "Criar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Qtd. Atual</TableHead>
                      <TableHead className="text-right">Qtd. Mínima</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum produto encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.categories?.name || "-"}</TableCell>
                          <TableCell>{product.unit}</TableCell>
                          <TableCell className="text-right">
                            {product.current_quantity.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.minimum_quantity.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(product)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(product.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Products;
