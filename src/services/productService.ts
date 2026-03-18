import { supabase } from "../integrations/supabaseClient";
import { Product } from "../types";

export async function getProducts(companyId: string): Promise<Product[]> {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return [];
  }

  // Busca produtos e marcas separadamente para garantir a margem mesmo sem join configurado
  const [productsRes, brandsRes] = await Promise.all([
    supabase.from("products").select("*").eq("company_id", companyId).order("nome"),
    supabase.from("brands").select("id, name, margin_percentage").eq("company_id", companyId)
  ]);

  if (productsRes.error) {
    console.error("Erro ao buscar produtos:", productsRes.error);
    return [];
  }

  const products = productsRes.data || [];
  const brands = brandsRes.data || [];
  const brandsMap = new Map(brands.map(b => [b.id, b]));

  // Aplica a margem de preço se existir
  return products.map((item: any) => {
    const brand = brandsMap.get(item.brand_id);
    const margin = brand?.margin_percentage || 0;
    
    const finalPrice = margin > 0 
      ? item.preco_unitario * (1 + margin / 100) 
      : item.preco_unitario;
      
    const finalBoxPrice = margin > 0 && item.preco_box
      ? item.preco_box * (1 + margin / 100)
      : item.preco_box;

    return {
      ...item,
      base_price: item.preco_unitario,
      base_box_price: item.preco_box,
      preco_unitario: finalPrice,
      preco_box: finalBoxPrice,
      brand_nome: brand?.name,
      brand_id: brand?.id,
      margin_percentage: margin
    };
  });
}
