-- Script para corrigir a restrição de unicidade do SKU
-- Remove restrições antigas que podem estar causando erros de duplicidade entre marcas
-- E garante que a restrição correta (empresa + marca + sku) esteja ativa

DO $$ 
DECLARE 
    constraint_name TEXT;
BEGIN 
    -- 1. Procurar e remover restrições de unicidade que envolvam apenas SKU ou (company_id, sku)
    -- Isso limpa restrições antigas ou criadas automaticamente pelo Supabase
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public' 
          AND rel.relname = 'products' 
          AND con.contype = 'u' -- unique constraint
          AND conname != 'unique_sku_per_brand' -- Não removemos a que queremos manter (se já existir)
    LOOP
        -- Se a restrição contiver SKU, nós a removemos para garantir que não conflite
        -- Verificamos se a coluna 'sku' faz parte da restrição
        IF EXISTS (
            SELECT 1 FROM pg_attribute a 
            JOIN pg_constraint c ON a.attnum = ANY(c.conkey)
            WHERE c.conname = constraint_name 
              AND a.attname = 'sku'
              AND a.attrelid = rel.oid
        ) THEN
            EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', constraint_name);
            RAISE NOTICE 'Removida restrição antiga: %', constraint_name;
        END IF;
    END LOOP;

    -- 2. Garantir que a restrição correta exista
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_sku_per_brand'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT unique_sku_per_brand UNIQUE (company_id, brand_id, sku);
        RAISE NOTICE 'Criada restrição: unique_sku_per_brand';
    ELSE
        -- Se já existe, vamos recriá-la para ter certeza que as colunas estão corretas
        ALTER TABLE products DROP CONSTRAINT unique_sku_per_brand;
        ALTER TABLE products ADD CONSTRAINT unique_sku_per_brand UNIQUE (company_id, brand_id, sku);
        RAISE NOTICE 'Recriada restrição: unique_sku_per_brand';
    END IF;
END $$;
