import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Building2, 
  Package, 
  Users, 
  Tag, 
  LayoutGrid,
  RefreshCw,
  Search
} from 'lucide-react';
import { supabase } from '../integrations/supabaseClient';

export default function AdminUsage() {
  const [usageData, setUsageData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalCompanies: 0,
    uniqueProducts: 0,
    sharedProducts: 0,
    grandTotal: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsageData();
  }, []);

  async function loadUsageData() {
    if (!supabase) return;
    setLoading(true);

    try {
      // 1. Buscar todas as empresas (exceto Matriz)
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .neq('id', '273c5bbc-631b-44dc-b286-1b07de720222')
        .order('nome');

      if (!companies) return;

      // 2. Buscar contagens para cada empresa
      const dataWithCounts = await Promise.all(companies.map(async (company) => {
        const client = supabase!;
        const [prodRes, custRes, brandRes, catRes] = await Promise.all([
          client.from('products').select('id, master_product_id').eq('company_id', company.id),
          client.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
          client.from('brands').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
          client.from('categories').select('id', { count: 'exact', head: true }).eq('company_id', company.id)
        ]);

        const products = prodRes.data || [];
        const sharedCount = products.filter(p => p.master_product_id).length;
        const uniqueCount = products.length - sharedCount;

        return {
          ...company,
          counts: {
            products: products.length,
            shared: sharedCount,
            unique: uniqueCount,
            customers: custRes.count || 0,
            brands: brandRes.count || 0,
            categories: catRes.count || 0
          }
        };
      }));

      // 3. Calcular Totais Gerais
      const totalUnique = dataWithCounts.reduce((acc, curr) => acc + curr.counts.unique, 0);
      const { count: masterCount } = await supabase.from('master_products').select('id', { count: 'exact', head: true });
      
      setSummary({
        totalCompanies: dataWithCounts.length,
        uniqueProducts: totalUnique,
        sharedProducts: masterCount || 0,
        grandTotal: (masterCount || 0) + totalUnique
      });

      setUsageData(dataWithCounts);
    } catch (error) {
      console.error("Erro ao carregar dados de uso:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredData = usageData.filter(item => 
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cnpj?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <BarChart3 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight uppercase">Monitoramento de Consumo</h1>
            <p className="text-xs text-slate-400 font-medium">Acompanhe o volume de dados de cada empresa cadastrada</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Buscar empresa ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 pr-6 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all w-full md:w-80 shadow-sm"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresas Ativas</div>
          <div className="text-2xl font-black text-slate-900">{summary.totalCompanies}</div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Produtos Matriz</div>
          <div className="text-2xl font-black text-primary">{summary.sharedProducts}</div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Produtos Únicos</div>
          <div className="text-2xl font-black text-slate-900">{summary.uniqueProducts}</div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ecossistema</div>
          <div className="text-2xl font-black text-slate-900">{summary.grandTotal}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((item) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-200/30 space-y-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100">
                {item.logo_url ? (
                  <img src={item.logo_url} alt={item.nome} className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={20} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{item.nome}</h3>
                <p className="text-[10px] text-slate-400 font-mono">{item.cnpj || 'CNPJ não informado'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Package size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Produtos Totais</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{item.counts.products}</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white rounded-lg p-2 border border-slate-100">
                    <div className="text-[8px] font-bold text-slate-400 uppercase">Matriz</div>
                    <div className="text-xs font-black text-primary">{item.counts.shared}</div>
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-2 border border-slate-100">
                    <div className="text-[8px] font-bold text-slate-400 uppercase">Próprios</div>
                    <div className="text-xs font-black text-slate-700">{item.counts.unique}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Users size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Clientes</span>
                </div>
                <div className="text-lg font-black text-slate-800">{item.counts.customers}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Tag size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Marcas</span>
                </div>
                <div className="text-lg font-black text-slate-800">{item.counts.brands}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold">Nenhuma empresa encontrada com esses termos.</p>
        </div>
      )}
    </div>
  );
}
