import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFKs() {
  const { data, error } = await supabase
    .from('customers')
    .select('*, sellers(*)');
  
  if (error) {
    console.error('Error with simple join:', error.message);
  } else {
    console.log('Simple join worked!');
  }

  const { data: data2, error: error2 } = await supabase
    .from('customers')
    .select('*, sellers!customers_seller_id_fkey(*)');
  
  if (error2) {
    console.error('Error with explicit FK:', error2.message);
  } else {
    console.log('Explicit FK worked!');
  }
}

checkFKs();
