-- Fix missing RLS policies for brands, categories and other tables
-- These were missed in the initial rls_setup.sql

-- 1. Brands Table
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies can manage their brands" ON brands;
CREATE POLICY "Companies can manage their brands" ON brands
    FOR ALL USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Everyone in the company can view brands" ON brands;
CREATE POLICY "Everyone in the company can view brands" ON brands
    FOR SELECT USING (company_id = get_user_company_id());

-- 2. Categories Table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies can manage their categories" ON categories;
CREATE POLICY "Companies can manage their categories" ON categories
    FOR ALL USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Everyone in the company can view categories" ON categories;
CREATE POLICY "Everyone in the company can view categories" ON categories
    FOR SELECT USING (company_id = get_user_company_id());

-- 3. Banners Table
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies can manage their banners" ON banners;
CREATE POLICY "Companies can manage their banners" ON banners
    FOR ALL USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Everyone in the company can view banners" ON banners;
CREATE POLICY "Everyone in the company can view banners" ON banners
    FOR SELECT USING (company_id = get_user_company_id());

-- 4. Top Bar Messages Table
ALTER TABLE top_bar_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies can manage their top bar messages" ON top_bar_messages;
CREATE POLICY "Companies can manage their top bar messages" ON top_bar_messages
    FOR ALL USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Everyone in the company can view top bar messages" ON top_bar_messages;
CREATE POLICY "Everyone in the company can view top bar messages" ON top_bar_messages
    FOR SELECT USING (company_id = get_user_company_id());

-- 5. Order Removed Items Table
ALTER TABLE order_removed_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view removed items of their orders" ON order_removed_items;
CREATE POLICY "Users can view removed items of their orders" ON order_removed_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_removed_items.order_id
        )
    );

-- 6. Push Subscriptions Table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies can view push subscriptions" ON push_subscriptions;
CREATE POLICY "Companies can view push subscriptions" ON push_subscriptions
    FOR SELECT USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Sellers can manage their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Sellers can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (seller_id = get_user_seller_id());

-- 7. Ensure profiles can be updated by the user (e.g. to set names/avatar if we add them)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());
