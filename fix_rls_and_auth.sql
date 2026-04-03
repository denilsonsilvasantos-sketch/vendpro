-- SCRIPT DE CORREÇÃO DE RLS E AUTENTICAÇÃO PARA VENDPRO
-- Execute este script no SQL Editor do Supabase para garantir que o Upload e o Catálogo funcionem corretamente.

-- 1. Garantir que a tabela de perfis existe e está correta
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'company', 'seller', 'customer')),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Funções auxiliares para RLS (Segurança Definida para ignorar RLS ao buscar o perfil)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Resetar políticas existentes para evitar conflitos
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4. POLÍTICAS PARA PRODUTOS (Essencial para o Upload)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas gerenciam seus produtos" ON public.products
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Vendedores e Clientes visualizam produtos da empresa" ON public.products
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

-- 5. POLÍTICAS PARA MARCAS E CATEGORIAS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas gerenciam suas marcas" ON public.brands
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Visualização de marcas" ON public.brands
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

CREATE POLICY "Empresas gerenciam suas categorias" ON public.categories
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Visualização de categorias" ON public.categories
    FOR SELECT TO authenticated
    USING (company_id = public.get_user_company_id());

-- 6. POLÍTICAS PARA EMPRESAS, VENDEDORES E CLIENTES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas visualizam seus dados" ON public.companies
    FOR SELECT TO authenticated
    USING (id = public.get_user_company_id());

CREATE POLICY "Empresas gerenciam seus vendedores" ON public.sellers
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id());

CREATE POLICY "Empresas gerenciam seus clientes" ON public.customers
    FOR ALL TO authenticated
    USING (company_id = public.get_user_company_id());

-- 7. POLÍTICA PARA PERFIS (Permitir que o usuário veja seu próprio perfil)
CREATE POLICY "Usuários veem seu próprio perfil" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- 8. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, company_id, seller_id, customer_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    (new.raw_user_meta_data->>'company_id')::UUID,
    (new.raw_user_meta_data->>'seller_id')::UUID,
    (new.raw_user_meta_data->>'customer_id')::UUID
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. PERMISSÕES DE SCHEMA (Garantir acesso ao schema public)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
