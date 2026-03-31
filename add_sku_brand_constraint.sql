-- Adiciona restrição de unicidade para SKU por marca e empresa
-- Isso permite que o mesmo SKU seja usado em marcas diferentes, 
-- mas evita duplicados dentro da mesma marca.

ALTER TABLE products 
ADD CONSTRAINT unique_sku_per_brand 
UNIQUE (company_id, brand_id, sku);
