-- Grant permissions to anon for login
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.companies TO anon;
GRANT SELECT ON public.sellers TO anon;
GRANT SELECT ON public.customers TO anon;

-- Clean existing CNPJs in companies table
UPDATE public.companies 
SET cnpj = regexp_replace(cnpj, '\D', '', 'g')
WHERE cnpj ~ '\D';

-- Clean existing CNPJs in customers table
UPDATE public.customers 
SET cnpj = regexp_replace(cnpj, '\D', '', 'g')
WHERE cnpj ~ '\D';

-- Ensure profiles are viewable by authenticated users (already done but good to reinforce)
-- And maybe anon needs to see their own profile if they just signed up? 
-- Usually not needed for login flow as we use auth.uid() in RLS.

-- Fix any potential issues with the trigger
-- The trigger handle_new_user should be working, but let's ensure it's there.
-- (Assuming it was already created by fix_rls_and_auth.sql)

-- Add a policy for anon to see their own profile if needed (rarely)
-- CREATE POLICY "Profiles are viewable by owner" ON profiles FOR SELECT USING (auth.uid() = id);

-- Ensure the public schema is accessible
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
