-- Corrigir restrição de unicidade das categorias
-- A restrição anterior impedia o mesmo nome de categoria em marcas diferentes na mesma empresa
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_company_nome_unique;

-- Adicionar a restrição correta que inclui o brand_id
-- Primeiro, vamos garantir que não existam duplicatas que violem a nova restrição (nome + brand_id + company_id)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT nome, company_id, brand_id, MIN(id::text)::uuid as master_id 
        FROM categories 
        GROUP BY nome, company_id, brand_id 
        HAVING COUNT(*) > 1
    ) LOOP
        UPDATE products SET category_id = r.master_id WHERE category_id IN (SELECT id FROM categories WHERE nome = r.nome AND company_id = r.company_id AND brand_id = r.brand_id AND id != r.master_id);
        DELETE FROM categories WHERE nome = r.nome AND company_id = r.company_id AND brand_id = r.brand_id AND id != r.master_id;
    END LOOP;
END $$;

-- Agora adicionamos a restrição correta
ALTER TABLE categories ADD CONSTRAINT categories_company_brand_nome_unique UNIQUE (company_id, brand_id, nome);
