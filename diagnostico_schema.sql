-- ============================================================
-- DIAGNÓSTICO DE SCHEMA — SOMENTE LEITURA (não altera nada)
-- Rode isso no SQL Editor do Supabase (projeto que está no .env)
-- e me envie o resultado de cada consulta.
-- ============================================================

-- 1. Em qual banco/projeto eu realmente estou?
SELECT current_database() AS banco, current_user AS usuario;

-- 2. Quais schemas existem (o VendPro espera tudo em "public")
SELECT schema_name
FROM information_schema.schemata
ORDER BY schema_name;

-- 3. Todas as tabelas em TODOS os schemas (não só public)
--    Isso mostra se "companies", "sellers", "products" existem
--    em outro schema (ex: "vendpro", "app", etc.)
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- 4. Colunas da tabela customers, seja qual for o schema em que ela está
SELECT table_schema, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY table_schema, ordinal_position;

-- 5. As tabelas do public estão expostas pra API (PostgREST)?
--    Se "companies"/"sellers"/"products" existirem mas não aparecerem
--    aqui, o problema é exposição da API, não a tabela em si.
SELECT nspname AS schema, relname AS tabela
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY relname;

-- 6. RLS: quais tabelas têm Row Level Security ligado/desligado
SELECT schemaname, tablename, rowsecurity AS rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Políticas RLS já existentes em todas as tabelas
-- (pra eu criar as políticas de companies/customers/sellers no mesmo padrão)
SELECT schemaname, tablename, policyname, cmd AS operacao, roles, qual AS condicao_using, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
