-- SQL Script for VendPro Database Setup
-- Run this in your Supabase SQL Editor

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Sellers Table
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    codigo_vendedor TEXT UNIQUE,
    comissao NUMERIC(5,2) DEFAULT 0,
    marcas_liberadas TEXT[] DEFAULT '{}',
    marcas_bloqueadas TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    minimum_order_value NUMERIC(10,2) DEFAULT 0,
    payment_policy TEXT,
    shipping_policy TEXT,
    margin_percentage NUMERIC(5,2) DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    sku TEXT,
    descricao TEXT,
    preco_unitario NUMERIC(10,2) DEFAULT 0,
    preco_box NUMERIC(10,2) DEFAULT 0,
    qtd_box INTEGER DEFAULT 1,
    venda_somente_box BOOLEAN DEFAULT FALSE,
    has_box_discount BOOLEAN DEFAULT FALSE,
    imagem TEXT,
    status_estoque TEXT DEFAULT 'normal',
    categoria_pendente BOOLEAN DEFAULT FALSE,
    imagem_pendente BOOLEAN DEFAULT FALSE,
    variacoes TEXT,
    qtd_variacoes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    responsavel TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    total NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    client_name TEXT,
    payment_method TEXT,
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    sku TEXT,
    nome TEXT,
    quantidade INTEGER NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Order Removed Items Table
CREATE TABLE IF NOT EXISTS order_removed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    sku TEXT,
    quantidade INTEGER NOT NULL DEFAULT 1,
    preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    removed_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Banners Table
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
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

-- 11. Top Bar Messages Table
CREATE TABLE IF NOT EXISTS top_bar_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE UNIQUE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    subscription TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for key tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to publication safely
DO $$
DECLARE
    tables_to_add TEXT[] := ARRAY['orders', 'order_items', 'top_bar_messages', 'banners', 'products', 'categories', 'brands'];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables_to_add LOOP
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = t AND relkind = 'r') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND tablename = t
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Configure Row Level Security (RLS)
-- Note: These are permissive policies for the app to function. 
-- In production, you should restrict these based on authenticated roles.

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_removed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_bar_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (anon role)
CREATE POLICY "Public access" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON sellers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON order_removed_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON top_bar_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
