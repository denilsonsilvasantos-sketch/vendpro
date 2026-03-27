-- SQL Script to implement Row Level Security (RLS) with Profiles
-- This script sets up a profiles table and updates RLS policies to be role-based.

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'company', 'seller', 'customer')),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Update existing tables with user_id for direct ownership where applicable
-- (Companies are already linked via profiles, but we can add user_id to sellers and customers for easier RLS)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Helper Functions for RLS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_seller_id()
RETURNS UUID AS $$
  SELECT seller_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_customer_id()
RETURNS UUID AS $$
  SELECT customer_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Drop old "Public access" policies
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access" ON %I', t);
    END LOOP;
END $$;

-- 5. Implement Granular RLS Policies

-- Companies Table
CREATE POLICY "Companies can view their own profile" ON companies
    FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "Admins can view all companies" ON companies
    FOR SELECT USING (get_user_role() = 'admin');

-- Sellers Table
CREATE POLICY "Companies can manage their sellers" ON sellers
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Sellers can view their own data" ON sellers
    FOR SELECT USING (id = get_user_seller_id());

-- Customers Table
CREATE POLICY "Companies can manage their customers" ON customers
    FOR ALL USING (company_id = get_user_company_id());

CREATE POLICY "Sellers can view their own customers" ON customers
    FOR SELECT USING (seller_id = get_user_seller_id());

CREATE POLICY "Customers can view their own data" ON customers
    FOR SELECT USING (id = get_user_customer_id());

-- Products Table
CREATE POLICY "Everyone in the company can view products" ON products
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Companies can manage products" ON products
    FOR ALL USING (company_id = get_user_company_id());

-- Orders Table
CREATE POLICY "Companies can view all orders" ON orders
    FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Sellers can view their own orders" ON orders
    FOR SELECT USING (seller_id = get_user_seller_id());

CREATE POLICY "Customers can view their own orders" ON orders
    FOR SELECT USING (customer_id = get_user_customer_id());

CREATE POLICY "Sellers can create orders" ON orders
    FOR INSERT WITH CHECK (seller_id = get_user_seller_id());

CREATE POLICY "Customers can create orders" ON orders
    FOR INSERT WITH CHECK (customer_id = get_user_customer_id());

-- Order Items Table
CREATE POLICY "Users can view items of their orders" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id
        )
    );

CREATE POLICY "Users can insert items to their orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id
        )
    );

-- Profiles Table Policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- 6. Trigger to create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- We'll extract metadata from the user's raw_user_meta_data if available
  -- or we'll let the application update the profile after creation.
  INSERT INTO public.profiles (id, role, company_id, seller_id, customer_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'role', 'customer'),
    (new.raw_user_meta_data->>'company_id')::UUID,
    (new.raw_user_meta_data->>'seller_id')::UUID,
    (new.raw_user_meta_data->>'customer_id')::UUID
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
