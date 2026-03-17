import { supabase } from "../integrations/supabaseClient";
import { Product } from "../types";

export async function getProducts(companyId: string): Promise<Product[]> {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return [];
  }

  // Busca produtos
  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId);

  if (productsError) {
    console.error("Erro ao buscar produtos:", productsError);
    return [];
  }

  // Busca marcas para pegar a margem
  const { data: brandsData, error: brandsError } = await supabase
    .from("brands")
    .select("id, name, margin_percentage")
    .eq("company_id", companyId);

  if (brandsError) {
    console.error("Erro ao buscar marcas:", brandsError);
  }

  const brandsMap = new Map();
  if (brandsData) {
    brandsData.forEach(b => {
      brandsMap.set(b.id, b);
    });
  }

  // Retorna os dados com a margem aplicada na UI
  return (productsData || []).map((item: any) => {
    const brand = brandsMap.get(item.brand_id);
    return {
      ...item,
      brand_nome: brand?.name,
      margin_percentage: brand?.margin_percentage || 0
    };
  });
}
