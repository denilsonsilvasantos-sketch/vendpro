-- Script para corrigir o erro de login desabilitando RLS nas tabelas de autenticação
-- O erro ocorre porque o sistema tenta buscar os dados (CNPJ/Senha) antes do usuário estar logado no Supabase Auth.

-- Desabilita RLS para permitir que as consultas de login funcionem
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Opcional: Se preferir manter o RLS mas permitir a busca pública (SELECT)
-- DROP POLICY IF EXISTS "Allow public select for login" ON companies;
-- CREATE POLICY "Allow public select for login" ON companies FOR SELECT TO anon USING (true);

-- DROP POLICY IF EXISTS "Allow public select for login" ON sellers;
-- CREATE POLICY "Allow public select for login" ON sellers FOR SELECT TO anon USING (true);

-- DROP POLICY IF EXISTS "Allow public select for login" ON customers;
-- CREATE POLICY "Allow public select for login" ON customers FOR SELECT TO anon USING (true);
