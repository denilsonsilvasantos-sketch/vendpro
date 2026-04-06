-- MIGRATION SCRIPT FOR VENDPRO
-- Run this in your Supabase SQL Editor to update your existing database

-- 1. Update Companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS minimum_order_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_policy TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS shipping_policy TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS responsavel TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- 2. Update Sellers
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS codigo_vinculo TEXT UNIQUE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS senha TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS codigo_cliente TEXT UNIQUE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS comissao_por_marca JSONB DEFAULT '{}';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS skus_bloqueados TEXT[] DEFAULT '{}';

-- 3. Update Brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS margin_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS shipping_policy TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS payment_policy TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS stock_policy TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT '{}';
ALTER TABLE brands ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 4. Update Categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS palavras_chave TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- 5. Update Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS qtd_box INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_last_units BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS multiplo_venda INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS imagens TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sugestao_revenda_max NUMERIC(10,2);

-- 6. Update Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nome_empresa TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS senha TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS responsavel TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS codigo_acesso TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vendedor_marcas_bloqueadas TEXT[] DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vendedor_skus_bloqueados TEXT[] DEFAULT '{}';

-- 7. Update Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type TEXT;

-- 8. Update Order Items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variacoes JSONB DEFAULT '{}';

-- 9. Update Order Removed Items
ALTER TABLE order_removed_items ADD COLUMN IF NOT EXISTS variacoes JSONB DEFAULT '{}';

-- 10. Create Banners Table if not exists
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    tag TEXT,
    title TEXT,
    sub TEXT,
    cta TEXT,
    className TEXT,
    image_url TEXT,
    link_url TEXT,
    visuals JSONB DEFAULT '[]',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Create Top Bar Messages Table if not exists
CREATE TABLE IF NOT EXISTS top_bar_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_bar_messages ENABLE ROW LEVEL SECURITY;

-- Policies for new tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'banners') THEN
        CREATE POLICY "Allow all access" ON banners FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'top_bar_messages') THEN
        CREATE POLICY "Allow all access" ON top_bar_messages FOR ALL USING (true);
    END IF;
END $$;
