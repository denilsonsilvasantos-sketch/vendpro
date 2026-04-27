
-- Script de melhorias para ordenação de marcas e categorias no catálogo

-- 1. Garante que a tabela de marcas possui coluna de ordenação
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brands' AND column_name = 'order_index') THEN
        ALTER TABLE brands ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Garante que a tabela de categorias possui coluna de ordenação
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'order_index') THEN
        ALTER TABLE categories ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Atualiza índices de ordenação existentes (exemplo de reset)
-- UPDATE brands SET order_index = 0 WHERE order_index IS NULL;
-- UPDATE categories SET order_index = 0 WHERE order_index IS NULL;

-- 4. Observação: As consultas no frontend agora utilizam .order('order_index', { ascending: true })
