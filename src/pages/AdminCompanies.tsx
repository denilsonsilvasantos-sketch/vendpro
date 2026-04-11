import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Building2, Users, Tag, Package, Loader2, Search, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface CompanyStats {
  id: string;
  nome: string;
  cnpj: string;
  customerCount: number;
  brandCount: number;
  productCount: number;
  masterLinkedCount: number;
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  async function fetchCompaniesStats() {
    if (!supabase) return;
    setLoading(true);
    
    try {
      // 1. Buscar todas as empresas
      const { data: companiesData, error: cError } = await supabase
        .from('companies')
        .select('id, nome, cnpj')
        .order('nome');

      if (cError) throw cError;

      // 2. Para cada empresa, buscar contagens (LGPD Friendly - Sem dados financeiros)
      const statsPromises = (companiesData || []).map(async (company) => {
        if (!supabase) return null;
        const [customers, brands, products, masterLinked] = await Promise.all([
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
          supabase.from('brands').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('company_id', company.id).not('master_product_id', 'is', null)
        ]);

        return {
          ...company,
          customerCount: customers.count || 0,
          brandCount: brands.count || 0,
          productCount: products.count || 0,
          masterLinkedCount: masterLinked.count || 0
        };
      });

      const results = (await Promise.all(statsPromises)).filter((r): r is CompanyStats => r !== null);
      setCompanies(results);
    } catch (error) {
      console.error("Erro ao buscar estatísticas das empresas:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCompaniesStats();
  }, []);

  const filteredCompanies = companies.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Analisando ecossistema...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight uppercase">Empresas Cadastradas</h1>
            <p className="text-xs text-slate-400 font-medium">Visão geral de volume e conformidade LGPD</p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Buscar empresa ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((company) => (
          <motion.div 
            key={company.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all space-y-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{company.nome}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{company.cnpj || 'Sem CNPJ'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-50 text-center">
                <Users size={14} className="mx-auto text-blue-500 mb-1" />
                <div className="text-xs font-black text-slate-900">{company.customerCount}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase">Clientes</div>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-50 text-center">
                <Tag size={14} className="mx-auto text-amber-500 mb-1" />
                <div className="text-xs font-black text-slate-900">{company.brandCount}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase">Marcas</div>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-50 text-center">
                <Package size={14} className="mx-auto text-primary mb-1" />
                <div className="text-xs font-black text-slate-900">{company.productCount}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase">Produtos</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronização Matriz</span>
                <span className="text-[9px] font-black text-primary uppercase">{Math.round((company.masterLinkedCount / (company.productCount || 1)) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000" 
                  style={{ width: `${(company.masterLinkedCount / (company.productCount || 1)) * 100}%` }}
                />
              </div>
              <p className="text-[8px] text-slate-400 mt-2 font-medium">
                {company.masterLinkedCount} de {company.productCount} produtos vinculados à Matriz
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
          <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold text-sm">Nenhuma empresa encontrada.</p>
        </div>
      )}
    </div>
  );
}
