import { supabase } from "../integrations/supabaseClient";

export async function validateSellerCode(code: string, type: 'seller' | 'customer' = 'seller') {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const field = type === 'seller' ? 'codigo_vinculo' : 'codigo_cliente';

  const { data: sellers, error } = await supabase
    .from("sellers")
    .select("*, companies(*)")
    .eq(field, code);

  if (error) {
    console.error("Erro ao validar vendedor:", error);
    return { success: false };
  }

  if (!sellers || sellers.length === 0) {
    return { success: false, message: "Vendedor não encontrado" };
  }

  return {
    success: true,
    sellers,
    companies: sellers.map(s => s.companies).filter(Boolean)
  };
}
