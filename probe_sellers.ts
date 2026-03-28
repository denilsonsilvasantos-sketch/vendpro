import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function probeSellers() {
  const { data, error } = await supabase.from('sellers').select('*').limit(1);
  if (error) {
    console.error('Error fetching sellers:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in sellers table:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No data in sellers table.');
  }
}

probeSellers();
