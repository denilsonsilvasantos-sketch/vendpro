import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL ou Key não configurados.");
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Temporary debug to check columns
if (supabase) {
  supabase.from('companies').select('*').limit(1).then(res => {
    console.log('Companies columns:', res.data ? Object.keys(res.data[0] || {}) : res.error);
  });
}
