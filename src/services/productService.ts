import { supabase } from "../integrations/supabaseClient";
import { Product } from "../types";

export async function getProducts(companyId: string): Promise<Product[]> {
  if (!supabase) {
    console.error("Supabase não inicializado.");
    return [];
  }

  const isMaster = companyId === '273c5bbc-631b-44dc-b286-1b07de720222';

  // Se for Master, busca direto do Catálogo Mestre para gestão
  if (isMaster) {
    const [masterRes, brandsRes, categoriesRes] = await Promise.all([
      supabase.from('master_products').select('*').order('created_at', { ascending: false }),
      supabase.from('brands').select('id, name').eq('company_id', companyId),
      supabase.from('categories').select('id, nome, brand_id').eq('company_id', companyId)
    ]);

    if (masterRes.error) {
      console.error("Erro ao buscar produtos mestre:", masterRes.error);
      return [];
    }

    const brandsMap = new Map(brandsRes.data?.map(b => [b.name, b.id]) || []);
    const categoriesMap = new Map(categoriesRes.data?.map(c => [`${c.brand_id}_${c.nome}`, c.id]) || []);

    return (masterRes.data || []).map(mp => {
      const brandId = brandsMap.get(mp.brand_name);
      const categoryId = brandId ? categoriesMap.get(`${brandId}_${mp.category_name}`) : null;

      return {
        ...mp,
        id: mp.id,
        company_id: companyId,
        brand_id: brandId,
        category_id: categoryId,
        brand_nome: mp.brand_name,
        categoria_nome: mp.category_name,
        preco_unitario: 0,
        preco_box: 0,
        qtd_box: 1,
        venda_somente_box: false,
        has_box_discount: false,
        is_last_units: false,
        status_estoque: 'normal',
        sync_to_master: true
      } as any;
    });
  }

  // Busca produtos, marcas e categorias separadamente para garantir a margem mesmo sem join configurado
  const [productsRes, brandsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*, master_product:master_products(*)").eq("company_id", companyId).order("nome").limit(5000),
    supabase.from("brands").select("id, name, margin_percentage").eq("company_id", companyId),
    supabase.from("categories").select("id, nome").eq("company_id", companyId)
  ]);

  if (productsRes.error) {
    console.error("Erro ao buscar produtos:", productsRes.error);
    return [];
  }

  const products = productsRes.data || [];
  const brands = brandsRes.data || [];
  const categories = categoriesRes.data || [];
  const brandsMap = new Map(brands.map(b => [b.id, b]));
  const categoriesMap = new Map(categories.map(c => [c.id, c]));

  // Aplica a margem de preço se existir
  return products.map((item: any) => {
    const brand = brandsMap.get(item.brand_id);
    const category = categoriesMap.get(item.category_id);
    const margin = brand?.margin_percentage || 0;
    
    // Prioriza dados do catálogo mestre se disponíveis
    const master = item.master_product;
    const nome = master?.nome || item.nome;
    const imagem = master?.imagem || item.imagem;
    const imagens = master?.imagens || item.imagens;
    const descricao = master?.descricao || item.descricao;
    const tipo_variacao = master?.tipo_variacao || item.tipo_variacao;
    const variacoes_disponiveis = master?.variacoes_disponiveis || item.variacoes_disponiveis;

    const finalPrice = margin > 0 
      ? item.preco_unitario * (1 + margin / 100) 
      : item.preco_unitario;
      
    const finalBoxPrice = margin > 0 && item.preco_box
      ? item.preco_box * (1 + margin / 100)
      : item.preco_box;

    return {
      ...item,
      nome,
      imagem,
      imagens,
      descricao,
      tipo_variacao,
      variacoes_disponiveis,
      base_price: item.preco_unitario,
      base_box_price: item.preco_box,
      preco_unitario: finalPrice,
      preco_box: finalBoxPrice,
      brand_nome: brand?.name,
      categoria_nome: category?.nome,
      margin_percentage: margin
    };
  });
}

export async function searchMasterProducts(query: string): Promise<any[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('master_products')
    .select('*')
    .or(`sku.ilike.%${query}%,nome.ilike.%${query}%`)
    .limit(20);
    
  if (error) {
    console.error("Erro ao buscar no mestre:", error);
    return [];
  }
  
  return data || [];
}
