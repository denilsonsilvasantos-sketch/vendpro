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

async function testCustomerInsert() {
  const { data, error } = await supabase.from('customers').insert([{
    nome: 'Teste AIS',
    company_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
    seller_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID
  }]).select();
  
  if (error) {
    console.log('Insert error:', error.message);
    if (error.details) console.log('Details:', error.details);
    if (error.hint) console.log('Hint:', error.hint);
  } else {
    console.log('Insert success:', data);
  }
}

testCustomerInsert();
