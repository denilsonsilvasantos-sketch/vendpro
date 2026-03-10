import { supabase } from "../integrations/supabaseClient";
import { Product } from "../types";

export async function getProducts(companyId: string): Promise<Product[]> {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return [];
  }

  // Busca produtos. Tentamos buscar com a marca, se falhar buscamos sem.
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      brand:brand_id (
        id,
        nome,
        margin_percentage
      )
    `)
    .eq("company_id", companyId);

  if (error) {
    console.error("Erro ao buscar produtos com marca:", error);
    // Fallback: busca sem o join
    const { data: simpleData, error: simpleError } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", companyId);
    
    if (simpleError) {
      console.error("Erro ao buscar produtos (fallback):", simpleError);
      return [];
    }
    return simpleData;
  }

  // Aplica a margem de preço se existir
  return data.map((item: any) => {
    const brand = item.brand;
    const margin = brand?.margin_percentage || 0;
    const finalPrice = margin > 0 
      ? item.preco_unitario * (1 + margin / 100) 
      : item.preco_unitario;

    return {
      ...item,
      preco_unitario: finalPrice,
      brand_nome: brand?.name,
      brand_id: brand?.id
    };
  });
}
