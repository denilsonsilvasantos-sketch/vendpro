-- Adiciona colunas para controle de Novidades e Reposição
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS back_in_stock_until TIMESTAMP WITH TIME ZONE;

-- Trigger para automatizar as datas de expiração e detecção de reposição
CREATE OR REPLACE FUNCTION handle_product_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Lógica para "Voltei!" (Reposição)
  -- Se o produto estava esgotado e agora não está mais
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.status_estoque = 'esgotado' OR (OLD.estoque IS NOT NULL AND OLD.estoque = 0)) AND 
       (NEW.status_estoque != 'esgotado' AND (NEW.estoque IS NULL OR NEW.estoque > 0)) THEN
      NEW.back_in_stock_until := NOW() + INTERVAL '7 days';
    END IF;
  END IF;

  -- Lógica para "Novidades" (Novo)
  -- Se o campo is_new for marcado como TRUE
  IF NEW.is_new = TRUE AND (TG_OP = 'INSERT' OR OLD.is_new = FALSE OR OLD.is_new IS NULL) THEN
    NEW.new_until := NOW() + INTERVAL '7 days';
  ELSIF NEW.is_new = FALSE THEN
    NEW.new_until := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger se já existir para evitar erro ao rodar o script novamente
DROP TRIGGER IF EXISTS tr_product_status_changes ON products;

CREATE TRIGGER tr_product_status_changes
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION handle_product_status_changes();
