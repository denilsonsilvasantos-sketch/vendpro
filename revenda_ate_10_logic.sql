-- Script para identificar produtos da seção "REVENDA ATÉ 10"
-- Este script pode ser executado no editor SQL do Supabase para consulta rápida ou geração de relatórios.

-- 1. Consulta simples de produtos com preço unitário abaixo de 6.99
SELECT 
    p.sku, 
    p.nome, 
    p.preco_unitario, 
    p.status_estoque, 
    b.name as marca,
    c.nome as categoria
FROM 
    products p
JOIN 
    brands b ON p.brand_id = b.id
LEFT JOIN 
    categories c ON p.category_id = c.id
WHERE 
    p.preco_unitario < 6.99
    AND p.status_estoque != 'esgotado'
ORDER BY 
    p.preco_unitario ASC;

-- 2. (Opcional) Criar uma VIEW para facilitar o uso em integrações futuras ou Dashboard
CREATE OR REPLACE VIEW view_revenda_ate_10 AS
SELECT 
    *
FROM 
    products
WHERE 
    preco_unitario < 6.99
    AND status_estoque != 'esgotado';

COMMENT ON VIEW view_revenda_ate_10 IS 'Produtos com preço unitário menor que 6.99, destinados à seção Revenda Até 10.';
