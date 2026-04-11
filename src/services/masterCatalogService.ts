import { supabase } from "../integrations/supabaseClient";

export async function migrateProductsToMaster(companyId: string) {
  if (!supabase) return { success: false, message: "Supabase não inicializado" };

  try {
    // 1. Buscar todos os produtos da empresa
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId);

    if (prodError) throw prodError;
    if (!products || products.length === 0) return { success: true, message: "Nenhum produto para migrar" };

    // 2. Buscar marcas para ter o nome da marca
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name')
      .eq('company_id', companyId);
    
    const brandsMap = new Map(brands?.map(b => [b.id, b.name]) || []);

    let migratedCount = 0;

    for (const product of products) {
      const brandName = brandsMap.get(product.brand_id) || 'Sem Marca';
      
      // 3. Verificar se já existe no mestre (pelo SKU + Marca)
      let { data: masterProduct } = await supabase
        .from('master_products')
        .select('id')
        .eq('sku', product.sku)
        .eq('brand_name', brandName)
        .maybeSingle();

      if (!masterProduct) {
        // 4. Criar no mestre se não existir
        const { data: newMaster, error: insertError } = await supabase
          .from('master_products')
          .insert([{
            sku: product.sku,
            brand_name: brandName,
            nome: product.nome,
            descricao: product.descricao,
            imagem: product.imagem,
            imagens: product.imagens,
            tipo_variacao: product.tipo_variacao,
            variacoes_disponiveis: product.variacoes_disponiveis
          }])
          .select('id')
          .single();
        
        if (insertError) {
          console.error(`Erro ao criar mestre para SKU ${product.sku}:`, insertError);
          continue;
        }
        masterProduct = newMaster;
      }

      // 5. Vincular o produto da empresa ao mestre
      if (masterProduct) {
        await supabase
          .from('products')
          .update({ master_product_id: masterProduct.id })
          .eq('id', product.id);
        migratedCount++;
      }
    }

    return { success: true, message: `${migratedCount} produtos sincronizados com a Matriz.` };
  } catch (error: any) {
    console.error("Erro na migração:", error);
    return { success: false, message: error.message };
  }
}
