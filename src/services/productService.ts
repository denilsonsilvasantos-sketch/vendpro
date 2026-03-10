import { supabase } from "../integrations/supabaseClient";
import { Product } from "../types";

export async function getProducts(companyId: string): Promise<Product[]> {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return [];
  }

  // Busca produtos com as informações da marca
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      brands (
        id,
        nome,
        margin_percentage
      )
    `)
    .eq("company_id", companyId);

  if (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }

  // Aplica a margem de preço se existir
  return data.map((item: any) => {
    const brand = item.brands;
    const margin = brand?.margin_percentage || 0;
    const finalPrice = margin > 0 
      ? item.preco_unitario * (1 + margin / 100) 
      : item.preco_unitario;

    return {
      ...item,
      preco_unitario: finalPrice,
      brand_nome: brand?.nome,
      brand_id: brand?.id
    };
  });
}
