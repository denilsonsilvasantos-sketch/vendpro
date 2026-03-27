-- SQL Script para implementar Código de Vínculo e Senha para Vendedores
-- Execute este script no seu Supabase SQL Editor

-- 1. Atualizar a tabela de vendedores (Sellers)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS codigo_vinculo TEXT UNIQUE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS senha TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Garantir que a tabela de clientes (Customers) também tenha suporte a acesso se necessário
ALTER TABLE customers ADD COLUMN IF NOT EXISTS codigo_acesso TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS senha TEXT;

-- 3. Criar uma função para gerar códigos aleatórios (opcional, faremos via JS por ser mais flexível)

-- 4. Atualizar as políticas de RLS para usar o codigo_vinculo como identificador
-- Nota: Como usaremos um sistema de "sessão manual" inicialmente, 
-- vamos configurar o RLS para permitir que o App filtre os dados, 
-- mas manteremos a estrutura pronta para o Auth.

-- Habilitar RLS
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Política: Vendedor só vê seus próprios dados (baseado no ID que o App enviará)
-- Por enquanto, manteremos as políticas de desenvolvimento, mas com os campos novos prontos.
DROP POLICY IF EXISTS "Public access for sellers" ON sellers;
CREATE POLICY "Public access for sellers" ON sellers FOR ALL USING (true) WITH CHECK (true);
