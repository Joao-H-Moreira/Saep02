-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Função para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário')
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil ao registrar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Criar tabela de categorias
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para categories (todos podem ler, apenas autenticados podem modificar)
CREATE POLICY "Todos podem ver categorias"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar categorias"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar categorias"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar categorias"
  ON public.categories FOR DELETE
  TO authenticated
  USING (true);

-- Criar tabela de produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL,
  current_quantity DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  minimum_quantity DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para products
CREATE POLICY "Usuários autenticados podem ver produtos"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar produtos"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar produtos"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem deletar produtos"
  ON public.products FOR DELETE
  TO authenticated
  USING (true);

-- Criar tabela de movimentações de estoque
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida')),
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  responsible_user_id UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para stock_movements
CREATE POLICY "Usuários autenticados podem ver movimentações"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar movimentações"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = responsible_user_id);

-- Função para atualizar quantidade de produto automaticamente
CREATE OR REPLACE FUNCTION public.update_product_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.movement_type = 'entrada' THEN
    UPDATE public.products
    SET current_quantity = current_quantity + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'saida' THEN
    UPDATE public.products
    SET current_quantity = GREATEST(current_quantity - NEW.quantity, 0),
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para atualizar quantidade ao inserir movimentação
CREATE TRIGGER on_stock_movement_created
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_quantity();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger para atualizar updated_at em products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir categorias iniciais
INSERT INTO public.categories (name, description) VALUES
  ('Ferramentas Manuais', 'Ferramentas de trabalho manual'),
  ('Ferramentas Elétricas', 'Ferramentas com motor elétrico'),
  ('Acessórios', 'Peças e acessórios diversos');

-- Inserir produtos iniciais
INSERT INTO public.products (name, description, category_id, unit, current_quantity, minimum_quantity) VALUES
  ('Martelo de Aço', 'Martelo profissional com cabo de madeira', (SELECT id FROM public.categories WHERE name = 'Ferramentas Manuais'), 'unidade', 50, 10),
  ('Chave de Fenda Phillips', 'Chave de fenda tipo Phillips #2', (SELECT id FROM public.categories WHERE name = 'Ferramentas Manuais'), 'unidade', 75, 15),
  ('Furadeira Elétrica 500W', 'Furadeira de impacto 500W', (SELECT id FROM public.categories WHERE name = 'Ferramentas Elétricas'), 'unidade', 20, 5),
  ('Jogo de Brocas', 'Kit com 13 brocas variadas', (SELECT id FROM public.categories WHERE name = 'Acessórios'), 'kit', 30, 10);