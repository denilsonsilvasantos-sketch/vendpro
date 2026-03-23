-- SQL Script to fix database schema for VendPro
-- Run this in your Supabase SQL Editor

-- 1. Create top_bar_messages table if not exists
CREATE TABLE IF NOT EXISTS top_bar_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    text TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create banners table if not exists
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    tag TEXT,
    title TEXT,
    sub TEXT,
    cta TEXT,
    "className" TEXT,
    "imageUrl" TEXT,
    visuals JSONB DEFAULT '[]',
    link TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Update banners table if it already exists with old schema
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='banners') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='tag') THEN
            ALTER TABLE banners ADD COLUMN tag TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='title') THEN
            ALTER TABLE banners ADD COLUMN title TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='sub') THEN
            ALTER TABLE banners ADD COLUMN sub TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='cta') THEN
            ALTER TABLE banners ADD COLUMN cta TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='className') THEN
            ALTER TABLE banners ADD COLUMN "className" TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='imageUrl') THEN
            ALTER TABLE banners ADD COLUMN "imageUrl" TEXT;
            -- Migrate old image_url if present
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='image_url') THEN
                UPDATE banners SET "imageUrl" = image_url;
            END IF;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='visuals') THEN
            ALTER TABLE banners ADD COLUMN visuals JSONB DEFAULT '[]';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='link') THEN
            ALTER TABLE banners ADD COLUMN link TEXT;
            -- Migrate old link_url if present
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='banners' AND column_name='link_url') THEN
                UPDATE banners SET link = link_url;
            END IF;
        END IF;
    END IF;
END $$;

-- 3. Update orders table with missing columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='whatsapp_sent') THEN
        ALTER TABLE orders ADD COLUMN whatsapp_sent BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='brand_id') THEN
        ALTER TABLE orders ADD COLUMN brand_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='seller_id') THEN
        ALTER TABLE orders ADD COLUMN seller_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_id') THEN
        ALTER TABLE orders ADD COLUMN customer_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total') THEN
        ALTER TABLE orders ADD COLUMN total DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status') THEN
        ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='client_name') THEN
        ALTER TABLE orders ADD COLUMN client_name TEXT;
    END IF;
END $$;

-- 4. Create order_items table if not exists
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    sku TEXT,
    nome TEXT,
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create customers table if not exists (for Pedidos page join)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    seller_id UUID,
    nome TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    responsavel TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Update customers table if it already exists with missing columns
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='customers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='company_id') THEN
            ALTER TABLE customers ADD COLUMN company_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='cnpj') THEN
            ALTER TABLE customers ADD COLUMN cnpj TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='seller_id') THEN
            ALTER TABLE customers ADD COLUMN seller_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='responsavel') THEN
            ALTER TABLE customers ADD COLUMN responsavel TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='ativo') THEN
            ALTER TABLE customers ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
        END IF;
    END IF;
END $$;

-- 6. Enable Realtime for these tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'top_bar_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE top_bar_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'banners'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE banners;
    END IF;
END $$;

-- 7. Configure Row Level Security (RLS)
-- This allows the app to work without full Supabase Auth for customers
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_bar_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (anon role)
-- Note: In a production environment, you might want to restrict this further
DROP POLICY IF EXISTS "Public access for orders" ON orders;
CREATE POLICY "Public access for orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for order_items" ON order_items;
CREATE POLICY "Public access for order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for customers" ON customers;
CREATE POLICY "Public access for customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for top_bar_messages" ON top_bar_messages;
CREATE POLICY "Public access for top_bar_messages" ON top_bar_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public access for banners" ON banners;
CREATE POLICY "Public access for banners" ON banners FOR SELECT USING (true);

-- =============================================
-- ETAPA 1 MIGRATIONS (2026-03)
-- =============================================

-- Adicionar forma de pagamento aos pedidos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- =============================================
-- ETAPA 2 MIGRATIONS (2026-03)
-- =============================================

-- Tabela de itens removidos dos pedidos
CREATE TABLE IF NOT EXISTS order_removed_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,
  nome TEXT NOT NULL,
  sku TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  removed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE order_removed_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for order_removed_items" ON order_removed_items;
CREATE POLICY "Public access for order_removed_items" ON order_removed_items FOR ALL USING (true);

-- =============================================
-- ETAPA 3 MIGRATIONS (2026-03)
-- =============================================

-- Campo de comissão nos vendedores
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS comissao NUMERIC(5,2) DEFAULT 0;

-- Marcas bloqueadas por vendedor (array de UUIDs)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS marcas_bloqueadas TEXT[] DEFAULT '{}';

-- =============================================
-- ETAPA 5 MIGRATIONS (2026-03)
-- =============================================

-- Tabela de assinaturas de push notification
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL,
  subscription TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Push subscriptions access" ON push_subscriptions;
CREATE POLICY "Push subscriptions access" ON push_subscriptions FOR ALL USING (true);

-- Database webhook para disparar notificações push
-- (Configurar no Supabase Dashboard > Database > Webhooks)
-- Tabela: orders | Evento: INSERT | URL: <SUPABASE_URL>/functions/v1/notify-new-order




