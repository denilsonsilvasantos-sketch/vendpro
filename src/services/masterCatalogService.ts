import { supabase } from "../integrations/supabaseClient";

export async function migrateProductsToMaster(companyId: string, onProgress?: (percent: number) => void) {
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
    const total = products.length;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const brandName = brandsMap.get(product.brand_id) || 'Sem Marca';
      
      // Reportar progresso
      if (onProgress) {
        onProgress(Math.round(((i + 1) / total) * 100));
      }

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
          // Não paramos o loop, mas o erro será logado
          continue;
        }
        masterProduct = newMaster;
      }

      // 5. Vincular o produto da empresa ao mestre
      if (masterProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ master_product_id: masterProduct.id })
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`Erro ao vincular produto ${product.id} ao mestre:`, updateError);
        } else {
          migratedCount++;
        }
      }
    }

    return { success: true, message: `${migratedCount} de ${total} produtos sincronizados com a Matriz.` };
  } catch (error: any) {
    console.error("Erro na migração:", error);
    return { success: false, message: error.message };
  }
}
