import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Brand, Category } from '../types';
import { getProducts } from '../services/productService';
import { Package, Edit, Trash2, Plus, Search, Filter, Tag, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import ProductFormModal from '../components/ProductFormModal';

export default function Produtos({ companyId, onRefresh }: { companyId: string | null, onRefresh?: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState<string | null>(null);

  async function fetchData() {
    if (!supabase || !companyId) return;
    setLoading(true);
    
    const pData = await getProducts(companyId);
    const { data: bData } = await supabase.from('brands').select('*').eq('company_id', companyId).order('name');
    const { data: cData } = await supabase.from('categories').select('*').eq('company_id', companyId).order('nome');
    
    setProducts(pData || []);
    setBrands((bData || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    setCategories((cData || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este produto permanentemente?')) return;
    if (!supabase) return;
    await supabase.from('products').delete().eq('id', id);
    fetchData();
    if (onRefresh) onRefresh();
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = filterBrand ? p.brand_id === filterBrand : true;
    return matchesSearch && matchesBrand;
  }).sort((a, b) => {
    const brandA = brands.find(br => br.id === a.brand_id);
    const brandB = brands.find(br => br.id === b.brand_id);
    const brandOrderA = brandA?.order_index ?? 999999;
    const brandOrderB = brandB?.order_index ?? 999999;

    if (brandOrderA !== brandOrderB) {
      return brandOrderA - brandOrderB;
    }

    const catA = categories.find(c => c.id === a.category_id);
    const catB = categories.find(c => c.id === b.category_id);
    const orderA = catA?.order_index ?? 999999;
    const orderB = catB?.order_index ?? 999999;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Sort out of stock items to the end of the category
    const isEsgotadoA = a.status_estoque === 'esgotado';
    const isEsgotadoB = b.status_estoque === 'esgotado';
    
    if (isEsgotadoA && !isEsgotadoB) return 1;
    if (!isEsgotadoA && isEsgotadoB) return -1;

    return a.nome.localeCompare(b.nome);
  });

  if (loading && products.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-slate-500 font-medium">Carregando catálogo de produtos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Produtos</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie seu catálogo completo de itens.</p>
        </div>
        <button 
          onClick={() => { setEditingProduct(undefined); setIsModalOpen(true); }} 
          className="bg-primary text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus size={20} /> Novo Produto
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou SKU..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-slate-600"
            value={filterBrand || ''}
            onChange={e => setFilterBrand(e.target.value || null)}
          >
            <option value="">Todas as Marcas</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      
      {filteredProducts.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <Package className="text-slate-300" size={40} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Nenhum produto encontrado</h2>
            <p className="text-slate-500 max-w-xs mx-auto">Tente ajustar seus filtros ou cadastre um novo produto.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const isEsgotado = product.status_estoque === 'esgotado';
            return (
            <div key={product.id} className={`bg-white rounded-3xl overflow-hidden border transition-all hover:shadow-xl hover:shadow-slate-200/50 group border-slate-100 ${isEsgotado ? 'opacity-75 grayscale-[0.5]' : ''}`}>
              <div 
                className="aspect-square relative overflow-hidden bg-slate-50 cursor-zoom-in"
                onClick={() => setZoomImage(product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`)}
              >
                <img 
                  src={product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`} 
                  alt={product.nome} 
                  className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                  {isEsgotado && <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg uppercase tracking-wider">Esgotado</span>}
                  {!isEsgotado && product.is_last_units && <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg uppercase tracking-wider">Últimas Unidades</span>}
                  {product.venda_somente_box && <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg uppercase tracking-wider">Somente Box</span>}
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{brands.find(b => b.id === product.brand_id)?.name}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{categories.find(c => c.id === product.category_id)?.nome}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{product.nome}</h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {product.sku}</p>
                </div>

                <div className="flex items-end justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Preço Unitário</p>
                    {!isEsgotado ? (
                      <p className="text-xl font-bold text-slate-900">R$ {product.preco_unitario.toFixed(2)}</p>
                    ) : (
                      <p className="text-xl font-bold text-slate-400">--</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} 
                      className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)} 
                      className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {(product.has_box_discount || product.venda_somente_box) && !isEsgotado && (
                  <div className="pt-3 border-t border-slate-50 text-[11px] font-bold text-emerald-600">
                    {!product.venda_somente_box ? (
                      `A partir de ${product.qtd_box} un: R$ ${product.preco_box.toFixed(2)}`
                    ) : (
                      `Box com ${product.qtd_box} un: R$ ${product.preco_box.toFixed(2)}`
                    )}
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}

      {isModalOpen && (
        <ProductFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { fetchData(); setIsModalOpen(false); if (onRefresh) onRefresh(); }} 
          product={editingProduct}
          companyId={companyId}
        />
      )}

      {zoomImage && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <img 
            src={zoomImage} 
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
            alt="Zoom"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
