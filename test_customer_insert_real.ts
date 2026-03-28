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

async function testCustomerInsertWithRealData() {
  const { data: sellers } = await supabase.from('sellers').select('id, company_id').limit(1);
  if (!sellers || sellers.length === 0) {
    console.error('No sellers found');
    return;
  }
  const sellerId = sellers[0].id;
  const companyId = sellers[0].company_id;
  
  const { data, error } = await supabase.from('customers').insert([{
    nome: 'Teste AIS Real',
    company_id: companyId,
    seller_id: sellerId,
    cnpj: '00000000000000',
    senha: '1234'
  }]).select();
  
  if (error) {
    console.log('Insert error:', error.message);
    if (error.details) console.log('Details:', error.details);
    if (error.hint) console.log('Hint:', error.hint);
  } else {
    console.log('Insert success:', data);
  }
}

testCustomerInsertWithRealData();
