import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
  const { data: sellers } = await supabase.from('sellers').select('id, company_id').limit(1);
  const seller = sellers?.[0];
  
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    console.error('Error fetching customers:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in customers table:', Object.keys(data[0]));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No data in customers table. Attempting a full insert to see schema...');
    const dummyData = {
      nome: 'Test Customer',
      nome_empresa: 'Test Company',
      cnpj: '12345678901234',
      whatsapp: '11999999999',
      senha: 'testpassword',
      seller_id: seller?.id || 'some-uuid',
      company_id: seller?.company_id || 'some-uuid',
      codigo_acesso: 'TEST-123'
    };
    const { error: insertError } = await supabase.from('customers').insert(dummyData).select();
    console.log('Insert error:', insertError);
  }
}

probe();
