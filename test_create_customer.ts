import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Mock import.meta.env for test
if (typeof global !== 'undefined') {
  (global as any).import = {
    meta: {
      env: {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY
      }
    }
  };
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateCustomer() {
  // Find a company and seller first
  const { data: sellers } = await supabase.from('sellers').select('*').limit(1);
  if (!sellers || sellers.length === 0) {
    console.error('No sellers found');
    return;
  }
  const seller = sellers[0];

  console.log('Testing createCustomer with seller:', seller.nome);

  const testData = {
    nome: 'Test Customer ' + Date.now(),
    nome_empresa: 'Test Company ' + Date.now(),
    cnpj: '12345678901234',
    whatsapp: '11999999999',
    senha: 'testpassword',
    seller_id: seller.id,
    ativo: true
  };

  // Import the service dynamically
  const { createCustomer } = await import('./src/services/customerService');
  
  const result = await createCustomer(seller.company_id, testData);
  console.log('Result:', JSON.stringify(result, null, 2));
}

testCreateCustomer();
