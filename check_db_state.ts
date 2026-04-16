import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabaseState() {
  console.log('Checking database state...');
  
  // Check tables
  const tables = ['companies', 'sellers', 'customers', 'products', 'profiles', 'orders'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    console.log(`Table ${table}:`, error ? `Error: ${error.message}` : `${data?.length || 0} rows (count: ${data})`);
  }

  // Check if RLS is enabled (by trying to select without auth)
  // If it returns data, RLS might be disabled or there's a public policy.
  const { data: products, error: productsError } = await supabase.from('products').select('id').limit(1);
  console.log('Products fetch (anon):', productsError ? `Error: ${productsError.message}` : 'Success (RLS might be disabled or public)');

  // Check profiles table structure
  const { data: profileCols, error: profileError } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles sample:', profileCols, profileError);
}

checkDatabaseState();
