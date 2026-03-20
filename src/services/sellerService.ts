import { supabase } from "../integrations/supabaseClient";

export async function validateSellerCode(code: string, type: 'seller' | 'customer' = 'seller') {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const field = type === 'seller' ? 'codigo_vinculo' : 'codigo_cliente';

  const { data: seller, error } = await supabase
    .from("sellers")
    .select("*, companies(*)")
    .eq(field, code)
    .maybeSingle();

  if (error) {
    console.error("Erro ao validar vendedor:", error);
    return { success: false };
  }

  if (!seller) {
    return { success: false, message: "Vendedor não encontrado" };
  }

  return {
    success: true,
    seller,
    companies: seller.companies ? [seller.companies] : []
  };
}
