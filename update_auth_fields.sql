-- Update sellers and customers tables for code-based authentication
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS codigo_vinculo TEXT UNIQUE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS senha TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS codigo_cliente TEXT; -- Code used by customers to link to this seller

ALTER TABLE customers ADD COLUMN IF NOT EXISTS codigo_acesso TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS senha TEXT;

-- Populate existing sellers with generated codes if they don't have one
-- (This is just a fallback, the app will handle new ones)
UPDATE sellers SET codigo_vinculo = 'VEND-' || upper(substring(id::text, 1, 4)) WHERE codigo_vinculo IS NULL;
UPDATE sellers SET senha = upper(substring(id::text, 1, 4)) WHERE senha IS NULL;
UPDATE sellers SET codigo_cliente = 'LINK-' || upper(substring(id::text, 1, 4)) WHERE codigo_cliente IS NULL;
