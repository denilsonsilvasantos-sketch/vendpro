-- SQL Script to disable Row Level Security (RLS) for tables related to the Upload/Download page
-- This is a temporary measure to troubleshoot upload issues as requested by the user.

-- Disable RLS for Products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Disable RLS for Categories
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Disable RLS for Brands
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;

-- Disable RLS for Banners (often used in catalogs)
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;

-- Disable RLS for Top Bar Messages
ALTER TABLE top_bar_messages DISABLE ROW LEVEL SECURITY;

-- Optional: If you want to allow public access instead of disabling RLS entirely, 
-- you could use these instead:
-- DROP POLICY IF EXISTS "Public access" ON products;
-- CREATE POLICY "Public access" ON products FOR ALL USING (true) WITH CHECK (true);
-- ... and so on for other tables.
