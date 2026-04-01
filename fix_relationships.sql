-- SQL Script to fix relationships between products, categories and brands
-- Run this in your Supabase SQL Editor

-- 1. Ensure the foreign key relationship between products and brands exists
DO $$ 
BEGIN 
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_brand_id_fkey' 
        AND table_name = 'products'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE products 
        ADD CONSTRAINT products_brand_id_fkey 
        FOREIGN KEY (brand_id) 
        REFERENCES brands(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key products_brand_id_fkey added successfully.';
    ELSE
        RAISE NOTICE 'Foreign key products_brand_id_fkey already exists.';
    END IF;
END $$;

-- 2. Ensure the foreign key relationship between categories and brands exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'categories_brand_id_fkey' 
        AND table_name = 'categories'
    ) THEN
        ALTER TABLE categories 
        ADD CONSTRAINT categories_brand_id_fkey 
        FOREIGN KEY (brand_id) 
        REFERENCES brands(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key categories_brand_id_fkey added successfully.';
    ELSE
        RAISE NOTICE 'Foreign key categories_brand_id_fkey already exists.';
    END IF;
END $$;

-- 3. Ensure the foreign key relationship between products and categories exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_category_id_fkey' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) 
        REFERENCES categories(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key products_category_id_fkey added successfully.';
    ELSE
        RAISE NOTICE 'Foreign key products_category_id_fkey already exists.';
    END IF;
END $$;
