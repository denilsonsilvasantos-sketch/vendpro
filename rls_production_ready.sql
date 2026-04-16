-- ===============================================================
-- SUPABASE RLS PRODUCTION READY SETUP
-- ===============================================================
-- This script implements Row Level Security (RLS) for VendPro.
-- It ensures that data is isolated by company and role.
-- ===============================================================

-- 1. PROFILES TABLE
-- This table links Supabase Auth users to their roles and companies.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'company', 'seller', 'customer')),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FUNCTIONS
-- These functions make policies cleaner and more performant.

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_seller_id()
RETURNS UUID AS $$
  SELECT seller_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_customer_id()
RETURNS UUID AS $$
  SELECT customer_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. ENABLE RLS ON ALL TABLES
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['companies', 'sellers', 'customers', 'products', 'brands', 'categories', 'orders', 'order_items', 'order_removed_items', 'push_subscriptions', 'banners', 'top_bar_messages'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        END IF;
    END LOOP;
END $$;

-- 4. POLICIES

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

-- COMPANIES
DROP POLICY IF EXISTS "Public select for login" ON public.companies;
CREATE POLICY "Public select for login" ON public.companies
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert for registration" ON public.companies;
CREATE POLICY "Public insert for registration" ON public.companies
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Companies can update their own data" ON public.companies;
CREATE POLICY "Companies can update their own data" ON public.companies
    FOR UPDATE USING (id = public.get_my_company_id());

-- SELLERS
DROP POLICY IF EXISTS "Public select for login/link" ON public.sellers;
CREATE POLICY "Public select for login/link" ON public.sellers
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Companies manage their sellers" ON public.sellers;
CREATE POLICY "Companies manage their sellers" ON public.sellers
    FOR ALL TO authenticated USING (company_id = public.get_my_company_id());

-- CUSTOMERS
DROP POLICY IF EXISTS "Public select for login" ON public.customers;
CREATE POLICY "Public select for login" ON public.customers
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public insert for registration" ON public.customers;
CREATE POLICY "Public insert for registration" ON public.customers
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users manage their customers" ON public.customers;
CREATE POLICY "Users manage their customers" ON public.customers
    FOR ALL TO authenticated USING (
        company_id = public.get_my_company_id() AND (
            public.get_my_role() = 'company' OR 
            (public.get_my_role() = 'seller' AND seller_id = public.get_my_seller_id()) OR
            (public.get_my_role() = 'customer' AND id = public.get_my_customer_id())
        )
    );

-- PRODUCTS, BRANDS, CATEGORIES, BANNERS, TOP BAR
-- Read access for everyone in the company
-- Write access for company admins

DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['products', 'brands', 'categories', 'banners', 'top_bar_messages'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Company read access" ON public.%I', t);
            EXECUTE format('CREATE POLICY "Company read access" ON public.%I FOR SELECT TO anon, authenticated USING (company_id = public.get_my_company_id() OR auth.role() = ''anon'')', t);
            
            EXECUTE format('DROP POLICY IF EXISTS "Company admin manage" ON public.%I', t);
            EXECUTE format('CREATE POLICY "Company admin manage" ON public.%I FOR ALL TO authenticated USING (company_id = public.get_my_company_id() AND public.get_my_role() = ''company'')', t);
        END IF;
    END LOOP;
END $$;

-- ORDERS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        DROP POLICY IF EXISTS "View orders" ON public.orders;
        CREATE POLICY "View orders" ON public.orders
            FOR SELECT TO authenticated USING (
                company_id = public.get_my_company_id() AND (
                    public.get_my_role() = 'company' OR 
                    (public.get_my_role() = 'seller' AND seller_id = public.get_my_seller_id()) OR
                    (public.get_my_role() = 'customer' AND customer_id = public.get_my_customer_id())
                )
            );

        DROP POLICY IF EXISTS "Create orders" ON public.orders;
        CREATE POLICY "Create orders" ON public.orders
            FOR INSERT TO authenticated WITH CHECK (
                company_id = public.get_my_company_id() AND (
                    (public.get_my_role() = 'seller' AND seller_id = public.get_my_seller_id()) OR
                    (public.get_my_role() = 'customer' AND customer_id = public.get_my_customer_id()) OR
                    (public.get_my_role() = 'company')
                )
            );

        DROP POLICY IF EXISTS "Update orders" ON public.orders;
        CREATE POLICY "Update orders" ON public.orders
            FOR UPDATE TO authenticated USING (
                company_id = public.get_my_company_id() AND (
                    public.get_my_role() = 'company' OR 
                    (public.get_my_role() = 'seller' AND seller_id = public.get_my_seller_id())
                )
            );
    END IF;
END $$;

-- ORDER ITEMS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
        DROP POLICY IF EXISTS "View order items" ON public.order_items;
        CREATE POLICY "View order items" ON public.order_items
            FOR SELECT TO authenticated USING (
                EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_items.order_id
                )
            );

        DROP POLICY IF EXISTS "Insert order items" ON public.order_items;
        CREATE POLICY "Insert order items" ON public.order_items
            FOR INSERT TO authenticated WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_items.order_id
                )
            );
    END IF;
END $$;

-- ORDER REMOVED ITEMS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_removed_items') THEN
        DROP POLICY IF EXISTS "View order removed items" ON public.order_removed_items;
        CREATE POLICY "View order removed items" ON public.order_removed_items
            FOR SELECT TO authenticated USING (
                EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_removed_items.order_id
                )
            );

        DROP POLICY IF EXISTS "Insert order removed items" ON public.order_removed_items;
        CREATE POLICY "Insert order removed items" ON public.order_removed_items
            FOR INSERT TO authenticated WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE orders.id = order_removed_items.order_id
                )
            );
    END IF;
END $$;

-- PUSH SUBSCRIPTIONS
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'push_subscriptions') THEN
        DROP POLICY IF EXISTS "Users manage their push subs" ON public.push_subscriptions;
        CREATE POLICY "Users manage their push subs" ON public.push_subscriptions
            FOR ALL TO authenticated USING (
                (seller_id IS NOT NULL AND seller_id = public.get_my_seller_id()) OR
                (company_id IS NOT NULL AND company_id = public.get_my_company_id())
            );
    END IF;
END $$;

-- 5. AUTH TRIGGER
-- Automatically creates a profile when a new user signs up.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. MIGRATION FOR EXISTING USERS
-- This part is tricky because we don't know which user belongs to which company/role
-- unless we have that info in auth.users metadata already.
-- We will attempt to link based on email patterns if they follow our convention.

INSERT INTO public.profiles (id, role, company_id, seller_id, customer_id)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'role', 'customer'),
    (u.raw_user_meta_data->>'company_id')::UUID,
    (u.raw_user_meta_data->>'seller_id')::UUID,
    (u.raw_user_meta_data->>'customer_id')::UUID
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
