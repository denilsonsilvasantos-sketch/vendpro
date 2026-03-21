import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

router.get('/products', async (req, res) => {
  const { company_id } = req.query;

  if (!company_id) {
    return res.status(400).json({ error: 'company_id obrigatório' });
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('company_id', company_id)
    .order('nome')
    .limit(5000);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

export default router;
