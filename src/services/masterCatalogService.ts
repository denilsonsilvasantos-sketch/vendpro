import { supabase } from "../integrations/supabaseClient";

export async function migrateProductsToMaster(companyId: string) {
  if (!supabase) return { success: false, message: "Supabase não inicializado" };

  try {
    // 1. Buscar produtos e marcas da empresa
    const { data: products, error: pError } = await supabase
      .from("products")
      .select("*, brand:brands(name)")
      .eq("company_id", companyId);

    if (pError) throw pError;
    if (!products || products.length === 0) return { success: true, message: "Nenhum produto para migrar" };

    let migratedCount = 0;
    let linkedCount = 0;

    for (const product of products) {
      const brandName = product.brand?.name || "Sem Marca";
      const sku = product.sku?.trim().toUpperCase();

      if (!sku) continue;

      // 2. Verificar se já existe no Mestre
      const { data: existingMaster } = await supabase
        .from("master_products")
        .select("id")
        .eq("sku", sku)
        .eq("brand_name", brandName)
        .maybeSingle();

      let masterId = existingMaster?.id;

      if (!masterId) {
        // 3. Criar no Mestre se não existir
        const { data: newMaster, error: mError } = await supabase
          .from("master_products")
          .insert([{
            sku,
            brand_name: brandName,
            nome: product.nome,
            descricao: product.descricao,
            imagem: product.imagem,
            imagens: product.imagens,
            tipo_variacao: product.tipo_variacao,
            variacoes_disponiveis: product.variacoes_disponiveis
          }])
          .select("id")
          .single();

        if (mError) {
          console.error(`Erro ao criar mestre para SKU ${sku}:`, mError);
          continue;
        }
        masterId = newMaster.id;
        migratedCount++;
      }

      // 4. Vincular o produto da empresa ao Mestre
      if (product.master_product_id !== masterId) {
        const { error: uError } = await supabase
          .from("products")
          .update({ master_product_id: masterId })
          .eq("id", product.id);

        if (uError) {
          console.error(`Erro ao vincular produto ${product.id} ao mestre:`, uError);
        } else {
          linkedCount++;
        }
      }
    }

    return { 
      success: true, 
      message: `Migração concluída: ${migratedCount} novos mestres criados, ${linkedCount} produtos vinculados.` 
    };
  } catch (error: any) {
    console.error("Erro na migração:", error);
    return { success: false, message: error.message };
  }
}
