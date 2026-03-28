import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  // We can use a RPC or just try to select a non-existent column to see the error message which might list columns
  // Or better, use the REST API to get the schema if possible, but anon key might not allow it.
  // Let's try to insert a record with all possible columns and see which ones fail.
  const allPossibleColumns = [
    'nome', 'nome_empresa', 'cnpj', 'whatsapp', 'email', 'telefone', 
    'endereco', 'cidade', 'estado', 'cep', 'responsavel', 'ativo', 
    'seller_id', 'company_id', 'senha', 'codigo_acesso'
  ];
  
  const dummyData: any = {};
  allPossibleColumns.forEach(col => dummyData[col] = 'test');
  
  const { error } = await supabase.from('customers').insert([dummyData]);
  if (error) {
    console.log('Error message:', error.message);
    // The error message often says "has no column named 'xxx'"
  }
}

checkColumns();
