-- Adiciona colunas para controle de Preço Promocional
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_promo BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price_unit NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price_box NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_box_qty INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_until TIMESTAMP WITH TIME ZONE;

-- Comentários para documentação
COMMENT ON COLUMN products.is_promo IS 'Indica se o produto está em promoção';
COMMENT ON COLUMN products.promo_price_unit IS 'Preço unitário promocional';
COMMENT ON COLUMN products.promo_price_box IS 'Preço do box promocional';
COMMENT ON COLUMN products.promo_box_qty IS 'Quantidade do box promocional';
COMMENT ON COLUMN products.promo_until IS 'Data limite da promoção (NULL = indefinida)';
