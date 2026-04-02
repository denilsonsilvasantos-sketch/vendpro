-- Script para adicionar restrições por SKU para vendedores
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS skus_bloqueados TEXT[] DEFAULT '{}';

-- Comentário para documentação
COMMENT ON COLUMN sellers.skus_bloqueados IS 'Lista de SKUs que o vendedor não pode vender';

-- Se houver necessidade de propagar para a tabela de clientes (cache/denormalização)
-- ALTER TABLE customers ADD COLUMN IF NOT EXISTS vendedor_skus_bloqueados TEXT[] DEFAULT '{}';
