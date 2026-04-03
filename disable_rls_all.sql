-- Script para desabilitar RLS em todas as tabelas relacionadas ao catálogo e upload
-- Isso resolve problemas de permissão durante o upload de produtos e categorias.

-- Desabilita RLS para permitir que as consultas e inserções funcionem sem restrições
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

-- Opcional: Se preferir manter o RLS mas permitir acesso total para usuários autenticados
-- DROP POLICY IF EXISTS "Allow all for authenticated" ON products;
-- CREATE POLICY "Allow all for authenticated" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- (Repetir para outras tabelas se necessário)
