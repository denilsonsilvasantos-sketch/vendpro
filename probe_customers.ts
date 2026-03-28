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

async function probeCustomers() {
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    console.error('Error probing customers table:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in customers table:', Object.keys(data[0]));
  } else {
    // Try to insert a dummy record and rollback or just check error
    const { error: insertError } = await supabase.from('customers').insert([{}]).select();
    if (insertError) {
       console.log('Insert error (can reveal columns):', insertError.message);
    }
  }
}

probeCustomers();
