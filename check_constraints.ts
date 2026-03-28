import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  const { data, error } = await supabase.rpc('get_constraints', { table_name: 'customers' });
  if (error) {
    console.error('Error fetching constraints via RPC:', error);
    
    // Fallback: try to query information_schema if allowed (usually not via anon key)
    const { data: info, error: infoError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'customers');
    
    if (infoError) {
      console.error('Error fetching from information_schema:', infoError);
    } else {
      console.log('Constraints from info_schema:', info);
    }
  } else {
    console.log('Constraints:', data);
  }
}

checkConstraints();
