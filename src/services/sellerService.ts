import { supabase } from "../integrations/supabaseClient";

export async function validateSellerCode(code: string) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return { success: false };
  }

  const { data: seller, error } = await supabase
    .from("sellers")
    .select("*, companies(*)")
    .eq("codigo_vinculo", code)
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
