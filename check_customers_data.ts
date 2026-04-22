import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomersAndSellers() {
  console.log('--- Sellers ---');
  const { data: sellers } = await supabase.from('sellers').select('id, nome');
  console.log(sellers);

  console.log('\n--- Customers (first 10) ---');
  const { data: customers } = await supabase.from('customers').select('id, nome, nome_empresa, seller_id').limit(10);
  console.log(customers);
}

checkCustomersAndSellers();
