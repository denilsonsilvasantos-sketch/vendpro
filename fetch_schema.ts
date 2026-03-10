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

async function checkSchema() {
  const { data: companies, error: err1 } = await supabase.from('companies').select('*').limit(1);
  console.log('Companies:', companies, err1);
  
  const { data: sellers, error: err2 } = await supabase.from('sellers').select('*').limit(1);
  console.log('Sellers:', sellers, err2);

  const { data: brands, error: err3 } = await supabase.from('brands').select('*').limit(1);
  console.log('Brands:', brands, err3);
}

checkSchema();
