-- Adiciona colunas para controle de Novidades e Reposição
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_back_in_stock BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS back_in_stock_until TIMESTAMP WITH TIME ZONE;

-- Função para gerenciar as datas de destaque automaticamente
CREATE OR REPLACE FUNCTION handle_product_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Lógica para "Voltei!" (Reposição)
  -- 1. Automático: Se o produto estava esgotado e agora não está mais
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.status_estoque = 'esgotado' OR (OLD.estoque IS NOT NULL AND OLD.estoque = 0)) AND 
       (NEW.status_estoque != 'esgotado' AND (NEW.estoque IS NULL OR NEW.estoque > 0)) THEN
      NEW.back_in_stock_until := NOW() + INTERVAL '7 days';
      NEW.is_back_in_stock := TRUE; -- Sincroniza o flag manual
    END IF;
  END IF;

  -- 2. Manual: Se o campo is_back_in_stock for marcado como TRUE manualmente
  IF NEW.is_back_in_stock = TRUE AND (TG_OP = 'INSERT' OR OLD.is_back_in_stock = FALSE OR OLD.is_back_in_stock IS NULL) THEN
    -- Só atualiza a data se ela já não estiver no futuro (para não sobrescrever o automático se for o caso)
    IF NEW.back_in_stock_until IS NULL OR NEW.back_in_stock_until < NOW() THEN
      NEW.back_in_stock_until := NOW() + INTERVAL '7 days';
    END IF;
  ELSIF NEW.is_back_in_stock = FALSE THEN
    NEW.back_in_stock_until := NULL;
  END IF;

  -- Lógica para "Novidades" (Novo)
  IF NEW.is_new = TRUE AND (TG_OP = 'INSERT' OR OLD.is_new = FALSE OR OLD.is_new IS NULL) THEN
    NEW.new_until := NOW() + INTERVAL '7 days';
  ELSIF NEW.is_new = FALSE THEN
    NEW.new_until := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função antes de cada INSERT ou UPDATE
DROP TRIGGER IF EXISTS tr_product_status_changes ON products;
CREATE TRIGGER tr_product_status_changes
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION handle_product_status_changes();
