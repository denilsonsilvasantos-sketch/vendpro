import { supabase } from "../integrations/supabaseClient";

export async function getOrders(companyId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("id, company_id, customer_id, seller_id, brand_id, total, status, whatsapp_sent, created_at, client_name, payment_method, customers!customer_id(nome)")
    .eq("company_id", companyId);

  if (error) {
    console.error("Erro ao buscar pedidos:", error);
    return [];
  }
  return data;
}

export async function createOrder(companyId: string, orderData: any, items: any[]) {
  if (!supabase) return null;
  
  // 1. Create Order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([{ ...orderData, company_id: companyId }])
    .select('id')
    .single();

  if (orderError) {
    console.error("Erro ao criar pedido:", orderError);
    return null;
  }

  // 2. Create Order Items
  const orderItems = items.map(item => ({
    ...item,
    order_id: order.id
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error("Erro ao criar itens do pedido:", itemsError);
    return null;
  }

  return order;
}
