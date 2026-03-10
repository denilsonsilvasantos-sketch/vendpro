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
    .single();

  if (error) {
    console.error("Erro ao validar vendedor:", error);
    return { success: false };
  }

  return {
    success: true,
    seller,
    companies: seller.companies ? [seller.companies] : []
  };
}
