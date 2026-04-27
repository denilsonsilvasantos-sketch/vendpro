import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Package, Search, Filter, ChevronDown, TrendingUp, AlertCircle, ShoppingCart, DollarSign, Tag, Building2, X, ZoomIn } from 'lucide-react';
import { Product, Brand, Category, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function MaisVendidos({ companyId, role, user }: { companyId: string | null, role?: UserRole, user?: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterBrand, setFilterBrand] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Get blocked IDs from user object
  const blockedBrandIds = role === 'seller' ? (user?.marcas_bloqueadas || []) : (user?.vendedor_marcas_bloqueadas || []);
  const blockedSkus = role === 'seller' ? (user?.skus_bloqueados || []) : (user?.vendedor_skus_bloqueados || []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    async function loadFilters() {
      if (!supabase || !companyId) return;
      const [brandRes, catRes] = await Promise.all([
        supabase.from('brands').select('*').eq('company_id', companyId).order('name'),
        supabase.from('categories').select('*').eq('company_id', companyId).order('nome')
      ]);
      const brandData = brandRes.data || [];
      setBrands(brandData);
      setCategories(catRes.data || []);
      
      if (brandData.length > 0) {
        // Find "VM DISTRIBUIDORA DE BELEZA" or default to first
        const vmBrand = brandData.find(b => b.name?.toUpperCase().includes('VM DISTRIBUIDORA DE BELEZA'));
        setFilterBrand(vmBrand ? vmBrand.id : brandData[0].id);
      }
    }
    loadFilters();
  }, [companyId]);

  useEffect(() => {
    async function fetchData() {
      // Clear data immediately when filters change to avoid showing stale results while loading
      setData([]);
      
      if (!supabase || !companyId || (!filterBrand && !debouncedSearch)) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Step 1: Fetch brands and categories for the current company with correct order
        const { data: bData } = await supabase.from('brands')
          .select('*')
          .eq('company_id', companyId)
          .order('order_index', { ascending: true });
          
        const { data: cData } = await supabase.from('categories')
          .select('*')
          .eq('company_id', companyId)
          .order('order_index', { ascending: true });
        
        // Filter out blocked brands
        const availableBrands = (bData || []).filter(b => !blockedBrandIds.includes(b.id));
        setBrands(availableBrands);
        setCategories(cData || []);
        
        if (availableBrands.length > 0) {
          let query = supabase
            .from('products')
            .select('id, sku, nome, imagem, preco_unitario, status_estoque, category_id, brand_id')
            .eq('company_id', companyId);

          // If search term is present, search globally matching the name
          if (debouncedSearch && debouncedSearch.trim().length >= 3) {
            query = query.ilike('nome', `%${debouncedSearch.trim()}%`);
          } else {
            // Otherwise use the brand filter
            const currentFilterBrand = filterBrand || availableBrands[0].id;
            const selectedBrandObj = availableBrands.find(b => b.id === currentFilterBrand);
            if (selectedBrandObj) {
              const relatedBrandIds = availableBrands
                .filter(b => b.name === selectedBrandObj.name)
                .map(b => b.id);
              query = query.in('brand_id', relatedBrandIds);
            } else {
              // Fallback if brand not found
              setLoading(false);
              return;
            }
          }

          const { data: productsResult, error: productsError } = await query;
          if (productsError) throw productsError;

          // Filter out blocked SKUs and restricted brands (for global search)
          const filteredProducts = (productsResult || []).filter(p => 
            !blockedSkus.includes(p.sku) && 
            !blockedBrandIds.includes(p.brand_id)
          );

          if (filteredProducts.length === 0) {
            setData([]);
            setLoading(false);
            return;
          }

          const productSkus = filteredProducts.map(p => p.sku).filter(Boolean);

          // Step 2: Fetch order items for these products within this company using SKU
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              quantidade,
              subtotal,
              sku
            `)
            .in('sku', productSkus)
            .eq('company_id', companyId);

          if (itemsError) throw itemsError;

          const aggregation: Record<string, { total_qty: number, total_sales: number }> = {};
          
          (items || []).forEach((item: any) => {
            if (!item.sku) return;
            if (!aggregation[item.sku]) {
              aggregation[item.sku] = {
                total_qty: 0,
                total_sales: 0
              };
            }
            aggregation[item.sku].total_qty += Number(item.quantidade || 0);
            aggregation[item.sku].total_sales += Number(item.subtotal || 0);
          });

          const finalData = filteredProducts.map(prod => {
            const stats = aggregation[prod.sku] || { total_qty: 0, total_sales: 0 };
            return {
              product_id: prod.id,
              sku: prod.sku,
              nome: prod.nome,
              imagem: prod.imagem,
              preco: prod.preco_unitario,
              status_estoque: prod.status_estoque,
              category_id: prod.category_id,
              total_qty: stats.total_qty,
              total_sales: stats.total_sales
            };
          })
          // Filter by category BEFORE sorting and slicing if the user selected one
          .filter(item => filterCategory ? item.category_id === filterCategory : true)
          // Sort by quantity sold (Descending)
          .sort((a: any, b: any) => b.total_qty - a.total_qty);

          setData(finalData.slice(0, 50));
        }
      } catch (err) {
        console.error("Erro ao buscar curva ABC:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, filterBrand, filterCategory, debouncedSearch]);

  const filteredData = data.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                          item.sku.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    let matchesStock = true;
    if (filterStock === 'in_stock') matchesStock = item.status_estoque !== 'esgotado';
    if (filterStock === 'out_of_stock') matchesStock = item.status_estoque === 'esgotado';
    
    // For customers, always show in stock products as requested
    if (role === 'customer') {
      matchesStock = item.status_estoque !== 'esgotado';
    }

    return matchesSearch && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <TrendingUp size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Mais Vendidos</h1>
            <p className="text-xs text-slate-400">Relatório de curva ABC por marca</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Marca</label>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              value={filterBrand || ''}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setFilterCategory(null);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-primary/30 transition-all appearance-none"
            >
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Categoria</label>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              value={filterCategory || ''}
              onChange={(e) => setFilterCategory(e.target.value || null)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-primary/30 transition-all appearance-none"
            >
              <option value="">Todas Categorias</option>
              {categories.filter(c => c.brand_id === filterBrand).map(c => (
                <option key={c.id} value={c.id}>{c.nome.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Estoque</label>
          <div className="relative">
            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value as any)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-primary/30 transition-all appearance-none"
            >
              <option value="all">Todos itens</option>
              <option value="in_stock">Em Estoque</option>
              <option value="out_of_stock">Esgotados</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Pesquisar</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:border-primary/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <TrendingUp className="animate-spin text-primary" size={32} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculando tendências...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-300">
            <AlertCircle size={48} />
            <p className="text-sm font-bold uppercase tracking-widest">Nenhuma venda encontrada para esta marca</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SKU</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Preço</th>
                  {role !== 'customer' && (
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd Vendida</th>
                  )}
                  {role !== 'customer' && (
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Volume em Vendas</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => (
                  <tr key={item.product_id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm cursor-zoom-in group/img relative"
                          onClick={() => item.imagem && setZoomImage(item.imagem)}
                        >
                          {item.imagem ? (
                            <>
                              <img src={item.imagem} alt={item.nome} className="w-full h-full object-contain p-1" />
                              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn size={14} className="text-white drop-shadow-md" />
                              </div>
                            </>
                          ) : (
                            <Package size={20} className="text-slate-200" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-700 uppercase tracking-tight line-clamp-1">{item.nome}</p>
                          <div className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${item.status_estoque === 'esgotado' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                            {item.status_estoque === 'esgotado' ? 'Esgotado' : 'Em Estoque'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.sku}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-slate-600">R$ {item.preco?.toFixed(2)}</span>
                    </td>
                    {role !== 'customer' && (
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full text-blue-600">
                          <ShoppingCart size={12} />
                          <span className="text-xs font-black">{item.total_qty}</span>
                        </div>
                      </td>
                    )}
                    {role !== 'customer' && (
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full text-amber-600">
                          <DollarSign size={12} />
                          <span className="text-xs font-black">R$ {item.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl"
            onClick={() => setZoomImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full aspect-square bg-white rounded-[40px] overflow-hidden shadow-2xl p-4"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setZoomImage(null)}
                className="absolute top-6 right-6 w-10 h-10 bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl flex items-center justify-center text-slate-900 shadow-xl z-10 hover:bg-white transition-all active:scale-95"
              >
                <X size={20} />
              </button>
              <img src={zoomImage} className="w-full h-full object-contain" alt="Zoom" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
