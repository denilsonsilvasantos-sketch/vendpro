-- Force change codigo_cliente to TEXT
-- This handles cases where it might have been created as UUID by mistake
ALTER TABLE sellers ALTER COLUMN codigo_cliente TYPE TEXT;

-- Also check customers table just in case
ALTER TABLE customers ALTER COLUMN codigo_acesso TYPE TEXT;
