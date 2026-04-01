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
  const [zoomImages, setZoomImages] = useState<string[]>([]);
  const [zoomIndex, setZoomIndex] = useState(0);
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
    const varietySkus = (p.variacoes_flat || []).map(v => (v.sku || '').toLowerCase());
    const matchesSearch = p.nome.toLowerCase().includes(searchLower) || 
                         p.sku.toLowerCase().includes(searchLower) ||
                         varietySkus.some(vSku => vSku.includes(searchLower));
    const matchesBrand = filterBrand ? p.brand_id === filterBrand : true;
    return matchesSearch && matchesBrand;
  }).sort((a, b) => {
    const isEsgotadoA = a.status_estoque === 'esgotado';
    const isEsgotadoB = b.status_estoque === 'esgotado';

    // Se não houver filtro de marca (ou seja, "Todas"), esgotados vão para o final absoluto
    if (!filterBrand) {
      if (isEsgotadoA && !isEsgotadoB) return 1;
      if (!isEsgotadoA && isEsgotadoB) return -1;
    }

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

    // Se houver filtro de marca, esgotados ficam no final da sua categoria
    if (filterBrand) {
      if (isEsgotadoA && !isEsgotadoB) return 1;
      if (!isEsgotadoA && isEsgotadoB) return -1;
    }

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
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl xl:max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <Package size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight uppercase">Catálogo de Produtos</h1>
              <p className="text-xs text-slate-400 font-medium">Gerencie o inventário e preços de forma centralizada</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => { setEditingProduct(undefined); setIsModalOpen(true); }} 
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 transition-all w-full md:w-auto"
        >
          <Plus size={18} strokeWidth={3} /> Novo Produto
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-white rounded-[32px] border border-slate-100 shadow-sm neumorphic-shadow">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou SKU..."
            className="w-full pl-12 pr-6 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all font-bold text-slate-700 placeholder:text-slate-300 text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative min-w-[240px] group">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
          <select 
            className="w-full pl-12 pr-10 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all appearance-none font-black uppercase tracking-widest text-[10px] text-slate-600 cursor-pointer"
            value={filterBrand || ''}
            onChange={e => setFilterBrand(e.target.value || null)}
          >
            <option value="">Todas as Marcas</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
        </div>
      </div>
      
      <AnimatePresence mode="popLayout">
        {filteredProducts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-16 rounded-[40px] border-2 border-dashed border-slate-100 text-center space-y-6 neumorphic-shadow"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-slate-100">
              <Package className="text-slate-200" size={40} strokeWidth={1} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Nenhum produto encontrado</h2>
              <p className="text-slate-400 max-w-sm mx-auto font-medium text-sm">Refine sua busca ou adicione novos itens para popular seu catálogo.</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
            {filteredProducts.map(product => (
              <ProductItem 
                key={product.id}
                product={product}
                brands={brands}
                categories={categories}
                onEdit={(p) => { setEditingProduct(p); setIsModalOpen(true); }}
                onDelete={handleDelete}
                onZoom={(imgs, idx) => { setZoomImages(imgs); setZoomIndex(idx); }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <ProductFormModal 
            onClose={() => setIsModalOpen(false)} 
            onSave={() => { fetchData(); setIsModalOpen(false); if (onRefresh) onRefresh(); }} 
            product={editingProduct}
            companyId={companyId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zoomImages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl"
            onClick={() => setZoomImages([])}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={zoomImages[zoomIndex]} 
                className="max-w-full max-h-[90vh] rounded-[40px] shadow-2xl object-contain bg-white p-4 md:p-12"
                alt="Zoom"
                referrerPolicy="no-referrer"
              />
              
              {zoomImages.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomIndex(prev => (prev - 1 + zoomImages.length) % zoomImages.length);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-xl text-white rounded-full flex items-center justify-center transition-all active:scale-95 z-20 shadow-2xl border border-white/20"
                  >
                    <ChevronLeft size={48} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomIndex(prev => (prev + 1) % zoomImages.length);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-xl text-white rounded-full flex items-center justify-center transition-all active:scale-95 z-20 shadow-2xl border border-white/20"
                  >
                    <ChevronRight size={48} strokeWidth={3} />
                  </button>
                  
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {zoomImages.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`w-2 h-2 rounded-full transition-all ${idx === zoomIndex ? 'bg-primary w-4' : 'bg-slate-300'}`}
                      />
                    ))}
                  </div>
                </>
              )}
              
              <button 
                onClick={() => setZoomImages([])}
                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
              >
                <X size={32} strokeWidth={3} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductItem({ 
  product, 
  brands, 
  categories, 
  onEdit, 
  onDelete, 
  onZoom 
}: { 
  product: Product, 
  brands: Brand[], 
  categories: Category[], 
  onEdit: (p: Product) => void, 
  onDelete: (id: string) => void,
  onZoom: (imgs: string[], idx: number) => void
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const isEsgotado = product.status_estoque === 'esgotado';
  const brand = brands.find(b => b.id === product.brand_id);
  const category = categories.find(c => c.id === product.category_id);

  const images = product.imagens && product.imagens.length > 0 
    ? product.imagens 
    : [product.imagem || `https://picsum.photos/seed/${product.sku}/400/400`];

  useEffect(() => {
    let interval: any;
    if (isHovering && images.length > 1) {
      interval = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % images.length);
      }, 1500);
    } else {
      setCurrentImageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovering, images.length]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`bg-white rounded-[32px] overflow-hidden border transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 group border-slate-100 flex flex-col relative neumorphic-shadow ${isEsgotado ? 'opacity-75' : ''}`}
    >
      <div 
        className="aspect-square relative overflow-hidden bg-slate-50/30 cursor-zoom-in"
        onClick={() => onZoom(images, currentImageIndex)}
      >
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImageIndex}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.8 }}
            transition={{ duration: 0.5 }}
            src={images[currentImageIndex]} 
            alt={product.nome} 
            className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-1000 ease-out"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end z-10">
          {isEsgotado && <span className="bg-slate-900 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-xl uppercase tracking-wider border border-white/10">Esgotado</span>}
          {!isEsgotado && product.is_last_units && <span className="bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-xl uppercase tracking-wider border border-white/10">Últimas</span>}
          {product.venda_somente_box && <span className="bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-xl uppercase tracking-wider border border-white/10">Somente Box</span>}
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black text-primary uppercase tracking-wider bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{brand?.name}</span>
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider">{category?.nome}</span>
          </div>
          <h3 className="font-black text-slate-900 text-[11px] leading-tight group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-tight h-8 flex items-center">{product.nome}</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">SKU</span>
            <span className="text-[8px] font-mono font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{product.sku}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="space-y-0.5">
              <p className="text-[7px] font-black text-slate-300 uppercase tracking-wider">Preço Unitário</p>
              {!isEsgotado ? (
                <p className="text-lg font-black text-slate-900 tracking-tighter">R$ {product.preco_unitario.toFixed(2)}</p>
              ) : (
                <p className="text-lg font-black text-slate-200 tracking-tighter">--</p>
              )}
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => onEdit(product)} 
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all border border-slate-100"
              >
                <Edit size={14} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => onDelete(product.id)} 
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all border border-slate-100"
              >
                <Trash2 size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {(product.has_box_discount || product.venda_somente_box) && !isEsgotado && (
            <div className="p-2 bg-rose-50 rounded-xl border border-rose-100 text-[10px] font-black text-rose-600 text-center uppercase tracking-wider flex items-center justify-center gap-1">
              <Info size={11} />
              <span className="line-clamp-1">
                {!product.venda_somente_box ? (
                  `A partir de ${product.qtd_box} un: R$ ${product.preco_box.toFixed(2)}`
                ) : (
                  `Box com ${product.qtd_box} un: R$ ${product.preco_box.toFixed(2)}`
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

