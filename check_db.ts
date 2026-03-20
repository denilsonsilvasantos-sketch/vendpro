
import { supabase } from './src/integrations/supabaseClient';

async function checkColumn() {
  const { data, error } = await supabase.from('sellers').select('marcas_liberadas').limit(1);
  if (error) {
    console.log('Column marcas_liberadas does not exist or error:', error.message);
  } else {
    console.log('Column marcas_liberadas exists!');
  }
}

checkColumn();
