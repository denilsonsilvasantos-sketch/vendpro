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
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE top_bar_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE banners;
