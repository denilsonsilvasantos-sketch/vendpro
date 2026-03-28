import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSellersFKs() {
  const { data, error } = await supabase.from('sellers').select('*, companies(*)').limit(1);
  if (error) {
    console.log('Error with simple join:', error.message);
    if (error.message.includes('ambiguous')) {
      console.log('Ambiguous relationship detected.');
    }
  } else {
    console.log('Simple join worked!');
  }
}

checkSellersFKs();
