import { supabase } from '../integrations/supabaseClient';
import { CartItem, ActiveCart } from '../types';

let syncTimeout: any = null;

export function broadcastCartUpdate(
  companyId: string | null,
  customer: {
    id: string;
    nome?: string;
    nome_empresa?: string;
    whatsapp?: string;
    seller_id?: string;
  },
  cart: CartItem[],
  total: number,
  brand?: { id?: string; name?: string }
) {
  if (!supabase || !companyId || !customer?.id) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      const channel = supabase.channel(`company-active-carts-${companyId}`);
      
      const payload: ActiveCart = {
        customer_id: customer.id,
        customer_name: customer.nome || customer.nome_empresa || 'Cliente',
        customer_empresa: customer.nome_empresa,
        customer_whatsapp: customer.whatsapp,
        seller_id: customer.seller_id,
        company_id: companyId,
        brand_id: brand?.id,
        brand_name: brand?.name,
        total: Number(total || 0),
        item_count: cart.length,
        product_count: cart.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0),
        items: cart,
        updated_at: new Date().toISOString()
      };

      // Send realtime broadcast
      await channel.send({
        type: 'broadcast',
        event: 'cart_activity',
        payload
      });

      // Save to local active carts storage as well
      const storageKey = `vendpro_active_carts_${companyId}`;
      const saved = localStorage.getItem(storageKey);
      let list: ActiveCart[] = saved ? JSON.parse(saved) : [];
      list = list.filter(c => c.customer_id !== customer.id);
      if (cart.length > 0) {
        list.unshift(payload);
      }
      localStorage.setItem(storageKey, JSON.stringify(list.slice(0, 30)));
    } catch (err) {
      console.warn('Erro ao sincronizar carrinho ativo:', err);
    }
  }, 400); // 400ms debounce
}

export function broadcastCartCleared(companyId: string | null, customerId: string) {
  if (!supabase || !companyId || !customerId) return;
  try {
    const channel = supabase.channel(`company-active-carts-${companyId}`);
    channel.send({
      type: 'broadcast',
      event: 'cart_cleared',
      payload: { customer_id: customerId }
    });

    // Remove from local storage
    const storageKey = `vendpro_active_carts_${companyId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      let list: ActiveCart[] = JSON.parse(saved);
      list = list.filter(c => c.customer_id !== customerId);
      localStorage.setItem(storageKey, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Erro ao notificar limpeza de carrinho:', err);
  }
}
