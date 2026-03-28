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

async function testDuplicateCnpj() {
  const { data: sellers } = await supabase.from('sellers').select('id, company_id').limit(1);
  if (!sellers || sellers.length === 0) return;
  const sellerId = sellers[0].id;
  const companyId = sellers[0].company_id;
  
  const cnpj = '12345678901234';
  
  console.log('Inserting first customer...');
  await supabase.from('customers').insert([{
    nome: 'Teste 1',
    company_id: companyId,
    seller_id: sellerId,
    cnpj: cnpj,
    senha: '1234'
  }]);
  
  console.log('Inserting second customer with same CNPJ...');
  const { error } = await supabase.from('customers').insert([{
    nome: 'Teste 2',
    company_id: companyId,
    seller_id: sellerId,
    cnpj: cnpj,
    senha: '1234'
  }]);
  
  if (error) {
    console.log('Insert error:', error.message);
  } else {
    console.log('Insert success (CNPJ is not unique)');
  }
  
  // Clean up
  await supabase.from('customers').delete().eq('cnpj', cnpj);
}

testDuplicateCnpj();
