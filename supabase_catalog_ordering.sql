
-- Script de melhorias para ordenação e restrições no catálogo

-- 1. Garante colunas de ordenação em marcas e categorias
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'order_index') THEN
        ALTER TABLE brands ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'order_index') THEN
        ALTER TABLE categories ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Garante colunas de restrições em vendedores (se não existirem)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'marcas_bloqueadas') THEN
        ALTER TABLE sellers ADD COLUMN marcas_bloqueadas TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sellers' AND column_name = 'skus_bloqueados') THEN
        ALTER TABLE sellers ADD COLUMN skus_bloqueados TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 3. Garante colunas de restrições em clientes (herdados/específicos)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'vendedor_marcas_bloqueadas') THEN
        ALTER TABLE customers ADD COLUMN vendedor_marcas_bloqueadas TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'vendedor_skus_bloqueados') THEN
        ALTER TABLE customers ADD COLUMN vendedor_skus_bloqueados TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 4. Comentários para documentação
COMMENT ON COLUMN brands.order_index IS 'Define a ordem de exibição no catálogo';
COMMENT ON COLUMN categories.order_index IS 'Define a ordem de exibição das categorias no catálogo';
COMMENT ON COLUMN sellers.marcas_bloqueadas IS 'IDs das marcas que o vendedor não pode visualizar/vender';
COMMENT ON COLUMN sellers.skus_bloqueados IS 'SKUs que o vendedor não pode visualizar/vender';

-- Nota: As consultas no frontend já foram atualizadas para respeitar estas colunas.
