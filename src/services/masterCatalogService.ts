import { supabase } from "../integrations/supabaseClient";

export async function migrateProductsToMaster(companyId: string, onProgress?: (percent: number) => void) {
  if (!supabase) return { success: false, message: "Supabase não inicializado" };

  const MATRIZ_ID = '273c5bbc-631b-44dc-b286-1b07de720222';

  try {
    // 1. Buscar todos os produtos da empresa
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId);

    if (prodError) throw prodError;
    if (!products || products.length === 0) return { success: true, message: "Nenhum produto para migrar" };

    // 2. Buscar marcas e categorias da empresa de origem
    const [{ data: brands }, { data: categories }] = await Promise.all([
      supabase.from('brands').select('id, name').eq('company_id', companyId),
      supabase.from('categories').select('id, nome').eq('company_id', companyId)
    ]);
    
    const brandsMap = new Map(brands?.map(b => [b.id, b.name]) || []);
    const categoriesMap = new Map(categories?.map(c => [c.id, c.nome]) || []);

    let migratedCount = 0;
    const total = products.length;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const brandName = brandsMap.get(product.brand_id) || 'Sem Marca';
      const categoryName = categoriesMap.get(product.category_id) || 'Sem Categoria';
      
      if (onProgress) {
        onProgress(Math.round(((i + 1) / total) * 100));
      }

      // 3. Garantir que a Marca e Categoria existam na empresa MATRIZ
      // Isso permite que o usuário MASTER gerencie essas entidades
      let matrizBrandId: string | null = null;
      if (brandName !== 'Sem Marca') {
        const { data: existingBrand } = await supabase
          .from('brands')
          .select('id')
          .eq('company_id', MATRIZ_ID)
          .eq('name', brandName)
          .maybeSingle();
        
        if (!existingBrand) {
          const { data: newBrand } = await supabase
            .from('brands')
            .insert([{ company_id: MATRIZ_ID, name: brandName }])
            .select('id')
            .single();
          matrizBrandId = newBrand?.id || null;
        } else {
          matrizBrandId = existingBrand.id;
        }
      }

      if (categoryName !== 'Sem Categoria' && matrizBrandId) {
        const { data: existingCat } = await supabase
          .from('categories')
          .select('id')
          .eq('company_id', MATRIZ_ID)
          .eq('brand_id', matrizBrandId)
          .eq('nome', categoryName)
          .maybeSingle();
        
        if (!existingCat) {
          await supabase.from('categories').insert([{ 
            company_id: MATRIZ_ID, 
            brand_id: matrizBrandId,
            nome: categoryName,
            ativo: true
          }]);
        }
      }

      // 4. Verificar se já existe no mestre (pelo SKU + Marca)
      let { data: masterProduct } = await supabase
        .from('master_products')
        .select('id')
        .eq('sku', product.sku)
        .eq('brand_name', brandName)
        .maybeSingle();

      if (!masterProduct) {
        // 5. Criar no mestre se não existir
        const { data: newMaster, error: insertError } = await supabase
          .from('master_products')
          .insert([{
            sku: product.sku,
            brand_name: brandName,
            category_name: categoryName,
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

      // 6. Vincular o produto da empresa ao mestre
      if (masterProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ master_product_id: masterProduct.id })
          .eq('id', product.id);
        
        if (!updateError) migratedCount++;
      }
    }

    return { success: true, message: `${migratedCount} de ${total} produtos sincronizados com a Matriz.` };
  } catch (error: any) {
    console.error("Erro na migração:", error);
    return { success: false, message: error.message };
  }
}
