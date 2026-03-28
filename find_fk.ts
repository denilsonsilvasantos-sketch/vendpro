import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findFK() {
  const names = [
    'customers_seller_id_fkey',
    'customers_vendedor_id_fkey',
    'customers_seller_fkey',
    'fk_customers_sellers',
    'customers_seller_id_foreign'
  ];
  
  for (const name of names) {
    const { data, error } = await supabase.from('customers').select(`*, sellers!${name}(*)`).limit(1);
    if (!error) {
      console.log('Found correct FK name:', name);
      return;
    } else {
      console.log(`FK name ${name} failed:`, error.message);
    }
  }
}

findFK();
