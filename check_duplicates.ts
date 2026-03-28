import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  const { data, error } = await supabase.from('customers').select('cnpj');
  if (error) {
    console.error('Error fetching CNPJs:', error);
    return;
  }
  const cnpjs = data.map(c => c.cnpj);
  const duplicates = cnpjs.filter((item, index) => cnpjs.indexOf(item) !== index);
  console.log('Duplicate CNPJs:', duplicates);
}

checkDuplicates();
