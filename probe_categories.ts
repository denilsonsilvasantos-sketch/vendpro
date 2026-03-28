import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function probeCategories() {
  const { data, error } = await supabase.from('categories').select('*').limit(1);
  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in categories table:', Object.keys(data[0]));
  } else {
    console.log('No data in categories table.');
  }
}

probeCategories();
