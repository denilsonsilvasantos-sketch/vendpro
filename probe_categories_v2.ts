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

async function probeCategories() {
  const { data, error } = await supabase.from('categories').select('*').limit(1);
  if (error) {
    console.error('Error probing categories table:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in categories table:', Object.keys(data[0]));
  } else {
    const { error: insertError } = await supabase.from('categories').insert([{}]).select();
    if (insertError) {
       console.log('Insert error (can reveal columns):', insertError.message);
    }
  }
}

probeCategories();
