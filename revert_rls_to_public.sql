-- Script para REVERTER as configurações de RLS e voltar ao estado original (Acesso Público)
-- Execute este script no SQL Editor do Supabase para desabilitar todas as restrições de segurança.

-- 1. Desabilitar RLS em todas as tabelas
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;
ALTER TABLE top_bar_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas (opcional, para limpeza)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Companies can view their own profile" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can view all companies" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Companies can manage their sellers" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Sellers can view their own data" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Companies can manage their customers" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Sellers can view their own customers" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Customers can view their own data" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Everyone in the company can view products" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Companies can manage products" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Companies can view all orders" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Sellers can view their own orders" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Customers can view their own orders" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Sellers can create orders" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Customers can create orders" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view items of their orders" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert items to their orders" ON %I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view their own profile" ON %I', t);
    END LOOP;
END $$;

-- 3. Garantir que o acesso público (anon) continue funcionando
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
