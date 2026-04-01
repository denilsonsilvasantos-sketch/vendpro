-- Migration to add multiple images support to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS imagens TEXT[] DEFAULT '{}';
