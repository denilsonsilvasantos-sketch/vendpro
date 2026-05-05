-- Migration to add barcode to products and active status to brands
-- Run this in your Supabase SQL Editor

-- 1. Add barcode column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;

-- 2. Add active status column to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- 3. Add comments for documentation
COMMENT ON COLUMN products.barcode IS 'Código de barras (EAN-13) do produto para busca e exibição.';
COMMENT ON COLUMN brands.ativo IS 'Indica se a marca está ativa e deve ser exibida no catálogo para clientes.';
