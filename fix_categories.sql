DO $$ 
DECLARE 
    MATRIZ_ID uuid := '273c5bbc-631b-44dc-b286-1b07de720222';
    r RECORD;
    b_id uuid;
BEGIN
    -- 1. Garantir que todas as categorias mencionadas no master_products existam para suas respectivas marcas na Matriz
    FOR r IN (
        SELECT DISTINCT brand_name, category_name 
        FROM master_products 
        WHERE category_name IS NOT NULL AND category_name != ''
    ) LOOP
        -- Buscar o ID da marca na Matriz
        SELECT id INTO b_id FROM brands WHERE company_id = MATRIZ_ID AND name = r.brand_name LIMIT 1;
        
        IF b_id IS NOT NULL THEN
            -- Verificar se a categoria já existe para esta marca na Matriz
            IF NOT EXISTS (
                SELECT 1 FROM categories 
                WHERE company_id = MATRIZ_ID AND brand_id = b_id AND nome = r.category_name
            ) THEN
                INSERT INTO categories (company_id, brand_id, nome, ativo)
                VALUES (MATRIZ_ID, b_id, r.category_name, true);
            END IF;
        END IF;
    END LOOP;
END $$;
