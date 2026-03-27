-- SQL Script to clear test data from VendPro
-- This will delete all orders, items, customers, and sellers
-- Run this in your Supabase SQL Editor

-- 1. Clear order items first (due to foreign key constraints)
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE order_removed_items CASCADE;

-- 2. Clear orders
TRUNCATE TABLE orders CASCADE;

-- 3. Clear customers
TRUNCATE TABLE customers CASCADE;

-- 4. Clear sellers
-- Note: This will NOT delete companies, brands, or products
TRUNCATE TABLE sellers CASCADE;

-- 5. Clear push subscriptions (related to sellers)
TRUNCATE TABLE push_subscriptions CASCADE;

-- Optional: Reset sequences if needed (PostgreSQL handles this with TRUNCATE)
-- All data is now cleared. You can start fresh!
