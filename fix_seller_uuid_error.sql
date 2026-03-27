-- Ensure codigo_cliente is TEXT to avoid UUID syntax errors
DO $$
BEGIN
    -- Check if column exists and its type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sellers' 
        AND column_name = 'codigo_cliente'
        AND data_type = 'uuid'
    ) THEN
        -- If it's UUID, change it to TEXT
        ALTER TABLE sellers ALTER COLUMN codigo_cliente TYPE TEXT;
    END IF;
END $$;
