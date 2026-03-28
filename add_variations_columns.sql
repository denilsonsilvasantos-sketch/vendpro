-- Add variacoes_flat column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS variacoes_flat JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tipo_variacao TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variacoes_disponiveis JSONB DEFAULT '[]';
