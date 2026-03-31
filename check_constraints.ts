import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkConstraints() {
  const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'products' });
  
  if (error) {
    // If RPC doesn't exist, try a direct query if possible, but usually we can't do raw SQL via client
    // Let's try to query information_schema if RLS allows or if we have service role
    const { data: constraints, error: constError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'products');
      
    if (constError) {
      console.error('Error fetching constraints:', constError);
      
      // Fallback: try to just insert a duplicate and see the error message
      console.log('Attempting to check constraints via information_schema.key_column_usage...');
      const { data: usage, error: usageError } = await supabase
        .from('information_schema.key_column_usage')
        .select('*')
        .eq('table_name', 'products');
        
      if (usageError) {
         console.error('Usage error:', usageError);
      } else {
         console.log('Key Column Usage:', usage);
      }
    } else {
      console.log('Constraints:', constraints);
    }
  } else {
    console.log('Table Constraints:', data);
  }
}

checkConstraints();
