import { supabase } from "../integrations/supabaseClient";

export async function getProducts(companyId: string) {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return [];
  }
  const { data, error } = await supabase
    .from("products")
    .select("id, nome, preco, imagem_url")
    .eq("company_id", companyId)
    .limit(20);

  if (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }

  return data;
}
