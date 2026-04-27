import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Package, Search, Filter, ChevronDown, TrendingUp, AlertCircle, ShoppingCart, DollarSign, Tag, Building2 } from 'lucide-react';
import { Product, Brand, Category, UserRole } from '../types';

export default function MaisVendidos({ companyId, role }: { companyId: string | null, role?: UserRole }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterBrand, setFilterBrand] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  useEffect(() => {
    async function loadFilters() {
      if (!supabase || !companyId) return;
      const [brandRes, catRes] = await Promise.all([
        supabase.from('brands').select('*').eq('company_id', companyId).order('name'),
        supabase.from('categories').select('*').eq('company_id', companyId).order('nome')
      ]);
      setBrands(brandRes.data || []);
      setCategories(catRes.data || []);
      if (brandRes.data && brandRes.data.length > 0) {
        setFilterBrand(brandRes.data[0].id);
      }
    }
    loadFilters();
  }, [companyId]);

  useEffect(() => {
    async function fetchData() {
      if (!supabase || !companyId || !filterBrand) return;
      setLoading(true);
      try {
        // Fetch orders and items for the selected brand
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id')
          .eq('company_id', companyId)
          .eq('brand_id', filterBrand);

        if (ordersError) throw ordersError;

        const orderIds = orders?.map(o => o.id) || [];
        
        // Sum quantities and totals from order_items
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, sku, nome, quantidade, subtotal')
          .in('order_id', orderIds);

        if (itemsError) throw itemsError;

        const aggregation: Record<string, any> = {};
        items?.forEach(item => {
          if (!aggregation[item.product_id]) {
            aggregation[item.product_id] = {
              product_id: item.product_id,
              sku: item.sku,
              nome: item.nome,
              total_qty: 0,
              total_sales: 0
            };
          }
          aggregation[item.product_id].total_qty += item.quantidade || 0;
          aggregation[item.product_id].total_sales += item.subtotal || 0;
        });

        // Get product details (photos, prices, stock status)
        const productIds = Object.keys(aggregation);
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, brand_id, category_id, imagem, preco_unitario, status_estoque')
          .in('id', productIds);

        if (productsError) throw productsError;

        const finalData = productIds.map(id => {
          const product = products?.find(p => p.id === id);
          return {
            ...aggregation[id],
            imagem: product?.imagem,
            preco: product?.preco_unitario,
            status_estoque: product?.status_estoque,
            category_id: product?.category_id
          };
        }).sort((a, b) => b.total_qty - a.total_qty);

        setData(finalData);
      } catch (err) {
        console.error("Erro ao buscar curva ABC:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId, filterBrand]);

  const filteredData = data.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory ? item.category_id === filterCategory : true;
    
    let matchesStock = true;
    if (filterStock === 'in_stock') matchesStock = item.status_estoque !== 'esgotado';
    if (filterStock === 'out_of_stock') matchesStock = item.status_estoque === 'esgotado';
    
    // For customers, always show in stock products as requested
    if (role === 'customer') {
      matchesStock = item.status_estoque !== 'esgotado';
    }

    return matchesSearch && matchesCategory && matchesStock;
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
                  {role !== 'customer' && (
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Preço</th>
                  )}
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd Vendida</th>
                  {role !== 'customer' && (
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => (
                  <tr key={item.product_id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          {item.imagem ? (
                            <img src={item.imagem} alt={item.nome} className="w-full h-full object-contain p-1" />
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
                    {role !== 'customer' && (
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-black text-slate-600">R$ {item.preco?.toFixed(2)}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full text-amber-600">
                        <ShoppingCart size={12} />
                        <span className="text-xs font-black">{item.total_qty}</span>
                      </div>
                    </td>
                    {role !== 'customer' && (
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-black text-slate-900 tracking-tight">R$ {item.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
