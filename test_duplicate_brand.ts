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

async function testDuplicateBrandName() {
  const { data: sellers } = await supabase.from('sellers').select('id, company_id').limit(1);
  if (!sellers || sellers.length === 0) return;
  const companyId = sellers[0].company_id;
  
  const name = 'Marca Teste Duplicada';
  
  console.log('Inserting first brand...');
  await supabase.from('brands').insert([{
    name: name,
    company_id: companyId
  }]);
  
  console.log('Inserting second brand with same name...');
  const { error } = await supabase.from('brands').insert([{
    name: name,
    company_id: companyId
  }]);
  
  if (error) {
    console.log('Insert error:', error.message);
  } else {
    console.log('Insert success (Brand name is not unique)');
  }
  
  // Clean up
  await supabase.from('brands').delete().eq('name', name);
}

testDuplicateBrandName();
