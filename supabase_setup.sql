-- SQL Script for VendPro Database Setup
-- Run this in your Supabase SQL Editor

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT,
    telefone TEXT,
    email TEXT,
    logo_url TEXT,
    primary_color TEXT,
    minimum_order_value NUMERIC(10,2) DEFAULT 0,
    payment_policy TEXT,
    shipping_policy TEXT,
    responsavel TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Sellers Table
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    whatsapp TEXT,
    codigo_vinculo TEXT UNIQUE,
    senha TEXT,
    codigo_cliente TEXT UNIQUE,
    ativo BOOLEAN DEFAULT TRUE,
    comissao NUMERIC(5,2) DEFAULT 0,
    comissao_por_marca JSONB DEFAULT '{}',
    marcas_liberadas TEXT[] DEFAULT '{}',
    marcas_bloqueadas TEXT[] DEFAULT '{}',
    skus_bloqueados TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    margin_percentage NUMERIC(5,2) DEFAULT 0,
    minimum_order_value NUMERIC(10,2) DEFAULT 0,
    shipping_policy TEXT,
    payment_policy TEXT,
    stock_policy TEXT,
    payment_methods TEXT[] DEFAULT '{}',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    palavras_chave TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sku TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    marca TEXT,
    preco_unitario NUMERIC(10,2) NOT NULL,
    preco_box NUMERIC(10,2) DEFAULT 0,
    qtd_box INTEGER DEFAULT 1,
    venda_somente_box BOOLEAN DEFAULT FALSE,
    has_box_discount BOOLEAN DEFAULT FALSE,
    is_last_units BOOLEAN DEFAULT FALSE,
    multiplo_venda INTEGER DEFAULT 1,
    imagem TEXT,
    imagens TEXT[] DEFAULT '{}',
    status_estoque TEXT DEFAULT 'normal',
    sugestao_revenda_max NUMERIC(10,2),
    categoria_pendente BOOLEAN DEFAULT FALSE,
    imagem_pendente BOOLEAN DEFAULT FALSE,
    variacoes TEXT,
    qtd_variacoes INTEGER DEFAULT 0,
    tipo_variacao TEXT,
    variacoes_disponiveis JSONB DEFAULT '[]',
    variacoes_flat JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    nome_empresa TEXT,
    cnpj TEXT UNIQUE,
    whatsapp TEXT,
    email TEXT,
    telefone TEXT,
    responsavel TEXT,
    cidade TEXT,
    codigo_acesso TEXT UNIQUE,
    senha TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    vendedor_marcas_bloqueadas TEXT[] DEFAULT '{}',
    vendedor_skus_bloqueados TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    subtotal NUMERIC(10,2) DEFAULT 0,
    discount_value NUMERIC(10,2) DEFAULT 0,
    discount_type TEXT,
    total NUMERIC(10,2) NOT NULL,
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
    variacoes JSONB DEFAULT '{}',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Order Removed Items Table
CREATE TABLE IF NOT EXISTS order_removed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    nome TEXT,
    sku TEXT,
    quantidade INTEGER,
    preco_unitario NUMERIC(10,2),
    subtotal NUMERIC(10,2),
    variacoes JSONB DEFAULT '{}',
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
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
    className TEXT,
    image_url TEXT,
    link_url TEXT,
    visuals JSONB DEFAULT '[]',
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_seller_id ON customers(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);

-- RLS Policies (Simplified for development, refine for production)
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

-- Allow all access for now (Development)
CREATE POLICY "Allow all access" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all access" ON sellers FOR ALL USING (true);
CREATE POLICY "Allow all access" ON brands FOR ALL USING (true);
CREATE POLICY "Allow all access" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all access" ON products FOR ALL USING (true);
CREATE POLICY "Allow all access" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all access" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all access" ON order_items FOR ALL USING (true);
CREATE POLICY "Allow all access" ON order_removed_items FOR ALL USING (true);
CREATE POLICY "Allow all access" ON banners FOR ALL USING (true);
CREATE POLICY "Allow all access" ON top_bar_messages FOR ALL USING (true);
