import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function probeBrands() {
  const { data, error } = await supabase.from('brands').select('*').limit(1);
  if (error) {
    console.error('Error fetching brands:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in brands table:', Object.keys(data[0]));
  } else {
    console.log('No data in brands table. Attempting a minimal insert to see columns...');
    const { error: insertError } = await supabase.from('brands').insert({ nome: 'Probe Brand' }).select();
    if (insertError) {
        console.log('Insert error (expected if columns missing):', insertError.message);
    }
  }
}

probeBrands();
