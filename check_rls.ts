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

async function checkRLS() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'master_products' });
  console.log('Policies for master_products:', data, error);
  
  // Alternative check
  const { data: sample, error: sampleError } = await supabase.from('master_products').select('*').limit(1);
  console.log('Sample data fetch:', sample, sampleError);
}

checkRLS();
