-- Adiciona coluna de observações na tabela de pedidos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS observacoes TEXT;
