-- Migration to add missing columns for catalog enhancements
-- Run this in your Supabase SQL Editor

-- 1. Add columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_last_units BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS multiplo_venda INTEGER DEFAULT 1;

-- 2. Add columns to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS palavras_chave TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- 3. Add comments for documentation
COMMENT ON COLUMN products.is_last_units IS 'Indica se o produto está nas últimas unidades para exibição de badge.';
COMMENT ON COLUMN products.multiplo_venda IS 'Define se o produto deve ser vendido em múltiplos (ex: de 2 em 2).';
COMMENT ON COLUMN categories.palavras_chave IS 'Palavras-chave para busca e SEO dentro da categoria.';
COMMENT ON COLUMN categories.ativo IS 'Indica se a categoria está ativa e deve ser exibida no catálogo.';
