import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Building2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Info,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../integrations/supabaseClient';
import { migrateProductsToMaster } from '../services/masterCatalogService';

export default function AdminMasterCatalog() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [masterStats, setMasterStats] = useState({ total: 0 });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!supabase) return;
    setLoading(true);
    
    const [compRes, statsRes] = await Promise.all([
      supabase.from('companies').select('*').order('nome'),
      supabase.from('master_products').select('id', { count: 'exact', head: true })
    ]);

    if (compRes.data) setCompanies(compRes.data);
    if (statsRes.count !== null) setMasterStats({ total: statsRes.count });
    
    setLoading(false);
  }

  async function handleMigrate(companyId: string) {
    setProcessingId(companyId);
    setStatus(null);
    
    const result = await migrateProductsToMaster(companyId);
    
    setStatus({
      type: result.success ? 'success' : 'error',
      message: result.message
    });
    
    setProcessingId(null);
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 pink-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Database size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight uppercase">Gestão VendPro Matriz</h1>
            <p className="text-xs text-slate-400 font-medium">Centralize produtos e economize espaço no banco de dados</p>
          </div>
        </div>
        
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <Package size={16} className="text-primary" />
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase leading-none">Total Matriz</div>
            <div className="text-sm font-black text-slate-900">{masterStats.total}</div>
          </div>
        </div>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 border ${
            status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <p className="text-xs font-bold">{status.message}</p>
        </motion.div>
      )}

      <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresas para Sincronização Matriz</h2>
        </div>
        
        <div className="divide-y divide-slate-50">
          {companies.map((company) => (
            <div key={company.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{company.nome}</h3>
                  <p className="text-[10px] text-slate-400 font-medium font-mono">{company.id}</p>
                </div>
              </div>
              
              <button
                onClick={() => handleMigrate(company.id)}
                disabled={processingId !== null}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  processingId === company.id 
                    ? 'bg-slate-100 text-slate-400' 
                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                }`}
              >
                {processingId === company.id ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Sincronizar com Matriz
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-6 rounded-[32px] space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <Info size={18} />
          <h3 className="text-xs font-black uppercase tracking-widest">Aviso de Sincronização</h3>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          A sincronização vincula os produtos das empresas ao catálogo oficial da <strong>VendPro Matriz</strong>. 
          Isso economiza espaço e garante que as fotos e nomes sejam padronizados. 
          Os preços e estoques de cada empresa permanecem privados e inalterados.
        </p>
      </div>
    </div>
  );
}
