-- Script para identificar e prevenir duplicidade de clientes por CNPJ
-- 1. Identifica duplicados (apenas para consulta no editor de SQL)
-- SELECT cnpj, count(*) FROM customers GROUP BY cnpj HAVING count(*) > 1;

-- 2. Remove duplicados mantendo apenas o registro mais recente para cada CNPJ
DELETE FROM customers a
USING customers b
WHERE a.id < b.id
  AND a.cnpj = b.cnpj;

-- 3. Adiciona uma restrição de unicidade para o CNPJ
-- Isso evita que novos duplicados sejam criados no futuro
-- Nota: Se você tiver múltiplos vendedores atendendo o mesmo CNPJ e quiser registros separados, 
-- não execute esta parte. Mas para sincronização total entre dispositivos, a unicidade é recomendada.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_cnpj_key;
ALTER TABLE customers ADD CONSTRAINT customers_cnpj_key UNIQUE (cnpj);
