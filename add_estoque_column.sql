-- Adiciona a coluna estoque (numérica) à tabela de produtos
ALTER TABLE products ADD COLUMN IF NOT EXISTS estoque INTEGER DEFAULT 0;

-- Comentário para documentar a coluna
COMMENT ON COLUMN products.estoque IS 'Quantidade física em estoque sincronizada via arquivo.';
