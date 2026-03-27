-- Adiciona colunas necessárias para o novo fluxo de clientes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nome_empresa TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nome_responsavel TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Garante que a coluna senha existe (já deve existir, mas por segurança)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='senha') THEN
        ALTER TABLE customers ADD COLUMN senha TEXT;
    END IF;
END $$;
