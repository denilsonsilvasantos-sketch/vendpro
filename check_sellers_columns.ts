import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function checkColumns() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Supabase URL or Key not configured in .env');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching sellers:', error.message);
  } else {
    console.log('Sellers data:', data);
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('No sellers found to check columns.');
    }
  }
}

checkColumns();
