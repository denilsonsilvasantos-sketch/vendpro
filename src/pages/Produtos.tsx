import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product, Brand, Category } from '../types';
import { getProducts } from '../services/productService';
import { Package, Edit, Trash2, Plus, Search, Filter, Tag, AlertCircle, CheckCircle2, Loader2, ChevronDown, X, ZoomIn, Info } from 'lucide-react';
import ProductFormModal from '../components/ProductFormModal';
import { motion, AnimatePresence } from 'motion/react';

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
    const searchLower = searchTerm.trim().toLowerCase();
    const matchesSearch = p.nome.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower);
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

    const isEsgotadoA = a.status_estoque === 'esgotado';
    const isEsgotadoB = b.status_estoque === 'esgotado';
    
    if (isEsgotadoA && !isEsgotadoB) return 1;
    if (!isEsgotadoA && isEsgotadoB) return -1;

    return a.nome.localeCompare(b.nome);
  });

  if (loading && products.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-6 animate-pulse">
        <div className="w-16 h-16 bg-primary/10 rounded-[24px] flex items-center justify-center text-primary border border-primary/20">
          <Loader2 className="animate-spin" size={32} />
        </div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Sincronizando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <Package size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Catálogo de Produtos</h1>
              <p className="text-slate-500 font-medium">Gerencie o inventário e preços de forma centralizada</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => { setEditingProduct(undefined); setIsModalOpen(true); }} 
          className="bg-primary text-white px-8 py-4 rounded-[24px] font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-2xl shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all w-full md:w-auto justify-center"
        >
          <Plus size={20} strokeWidth={3} /> Novo Produto
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-6 bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou SKU..."
            className="w-full pl-16 pr-8 py-5 bg-slate-50/50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative min-w-[280px] group">
          <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
          <select 
            className="w-full pl-16 pr-12 py-5 bg-slate-50/50 border border-slate-100 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all appearance-none font-black uppercase tracking-widest text-[10px] text-slate-600 cursor-pointer"
            value={filterBrand || ''}
            onChange={e => setFilterBrand(e.target.value || null)}
          >
            <option value="">Todas as Marcas</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
        </div>
      </div>
      
      <AnimatePresence mode="popLayout">
        {filteredProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-32 rounded-[40px] border-2 border-dashed border-slate-100 text-center space-y-8"
          >
            <div className="w-32 h-32 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto shadow-inner border border-slate-100">
              <Package className="text-slate-200" size={64} strokeWidth={1} />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Nenhum produto encontrado</h2>
              <p className="text-slate-400 max-w-sm mx-auto font-medium">Refine sua busca ou adicione novos itens para popular seu catálogo.</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(product => {
              const isEsgotado = product.status_estoque === 'esgotado';
              const brand = brands.find(b => b.id === product.brand_id);
              const category = categories.find(c => c.id === product.category_id);
              
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={product.id} 
                  className={`bg-white rounded-[40px] overflow-hidden border transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50 group border-slate-100 flex flex-col relative ${isEsgotado ? 'opacity-75' : ''}`}
                >
                  <div 
                    className="aspect-square relative overflow-hidden bg-slate-50/30 cursor-zoom-in"
                    onClick={() => setZoomImage(product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`)}
                  >
                    <img 
                      src={product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`} 
                      alt={product.nome} 
                      className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-1000 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-6 right-6 flex flex-col gap-3 items-end z-10">
                      {isEsgotado && <span className="bg-slate-900 text-white text-[9px] font-black px-4 py-2 rounded-xl shadow-2xl uppercase tracking-[0.2em] border border-white/10">Esgotado</span>}
                      {!isEsgotado && product.is_last_units && <span className="bg-rose-500 text-white text-[9px] font-black px-4 py-2 rounded-xl shadow-2xl uppercase tracking-[0.2em] border border-white/10">Últimas Unidades</span>}
                      {product.venda_somente_box && <span className="bg-amber-500 text-white text-[9px] font-black px-4 py-2 rounded-xl shadow-2xl uppercase tracking-[0.2em] border border-white/10">Somente Box</span>}
                    </div>
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-primary transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                        <ZoomIn size={24} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-1 flex flex-col justify-between space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">{brand?.name}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{category?.nome}</span>
                      </div>
                      <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-tight">{product.nome}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">SKU</span>
                        <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{product.sku}</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Preço Unitário</p>
                          {!isEsgotado ? (
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">R$ {product.preco_unitario.toFixed(2)}</p>
                          ) : (
                            <p className="text-3xl font-black text-slate-200 tracking-tighter">--</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} 
                            className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all border border-transparent hover:border-primary/10"
                          >
                            <Edit size={22} strokeWidth={2.5} />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)} 
                            className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                          >
                            <Trash2 size={22} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>

                      {(product.has_box_discount || product.venda_somente_box) && !isEsgotado && (
                        <div className="p-4 bg-emerald-50 rounded-[20px] border border-emerald-100 text-[10px] font-black text-emerald-600 text-center uppercase tracking-[0.15em] flex items-center justify-center gap-2">
                          <Info size={14} />
                          {!product.venda_somente_box ? (
                            `A partir de ${product.qtd_box} un: R$ ${product.preco_box.toFixed(2)}`
                          ) : (
                            `Box com ${product.qtd_box} un: R$ ${product.preco_box.toFixed(2)}`
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {isModalOpen && (
        <ProductFormModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={() => { fetchData(); setIsModalOpen(false); if (onRefresh) onRefresh(); }} 
          product={editingProduct}
          companyId={companyId}
        />
      )}

      <AnimatePresence>
        {zoomImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-8 md:p-20 bg-slate-900/95 backdrop-blur-xl cursor-zoom-out"
            onClick={() => setZoomImage(null)}
          >
            <button className="absolute top-8 right-8 w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all">
              <X size={32} strokeWidth={2.5} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              src={zoomImage} 
              className="max-w-full max-h-full rounded-[40px] shadow-2xl object-contain bg-white p-12"
              alt="Zoom"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

