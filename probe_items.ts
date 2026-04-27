
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
  console.log("Probing order_items columns...");
  const { data: item, error } = await supabase.from('order_items').select('*').limit(1).maybeSingle();
  if (error) {
    console.error("Error probing order_items:", error);
  } else {
    console.log("order_items columns:", Object.keys(item || {}));
  }

  console.log("\nProbing orders columns...");
  const { data: order, error: orderError } = await supabase.from('orders').select('*').limit(1).maybeSingle();
  if (orderError) {
    console.error("Error probing orders:", orderError);
  } else {
    console.log("orders columns:", Object.keys(order || {}));
  }

  console.log("\nProbing brands with company_id...");
  const { data: brands, error: brandError } = await supabase.from('brands').select('id, name, company_id').limit(20);
  if (brandError) {
    console.error("Error probing brands:", brandError.message);
  } else {
    console.log("Brands found:", brands);
  }
}

probe();
