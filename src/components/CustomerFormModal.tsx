import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Customer, Seller } from '../types';
import { X, Save, Loader2, Phone, User, FileText, Lock } from 'lucide-react';

export default function CustomerFormModal({ onClose, onSave, customer, companyId }: { onClose: () => void, onSave: () => void, customer?: Customer, companyId: string | null }) {
  const [formData, setFormData] = useState<any>(customer || { 
    nome: '', 
    whatsapp: '', 
    cnpj: '', 
    responsavel: '',
    senha: '',
    ativo: true, 
    seller_id: '' 
  });
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);

  useEffect(() => {
    async function fetchSellers() {
      if (!supabase || !companyId) return;
      const { data } = await supabase.from('sellers').select('id, nome').eq('company_id', companyId);
      setSellers(data || []);
    }
    fetchSellers();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !companyId) return;
    
    setLoading(true);
    try {
      const dataToSave = { 
        ...formData, 
        company_id: companyId,
        whatsapp: formData.whatsapp || '',
        responsavel: formData.responsavel || '',
        cnpj: formData.cnpj ? formData.cnpj.replace(/\D/g, '') : ''
      };

      if (customer) {
        const { id, created_at, seller_nome, ...updateData } = dataToSave;
        const { error } = await supabase.from('customers').update(updateData).eq('id', customer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert([dataToSave]);
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            {customer ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Empresa / Razão Social</label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary/50 transition-all" 
                placeholder="Ex: Soda com Limão LTDA" 
                value={formData.nome} 
                onChange={e => setFormData({...formData, nome: e.target.value})} 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ</label>
              <input 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary/50 transition-all" 
                placeholder="00.000.000/0000-00" 
                value={formData.cnpj} 
                onChange={e => setFormData({...formData, cnpj: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary/50 transition-all" 
                  placeholder="(00) 00000-0000" 
                  value={formData.whatsapp} 
                  onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Responsável</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary/50 transition-all" 
                placeholder="Nome de quem faz os pedidos" 
                value={formData.responsavel} 
                onChange={e => setFormData({...formData, responsavel: e.target.value})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendedor Responsável</label>
              <select 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary/50 transition-all appearance-none" 
                value={formData.seller_id || ''} 
                onChange={e => setFormData({...formData, seller_id: e.target.value})}
                required
              >
                <option value="">Selecione...</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Senha de Acesso</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="password"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary/50 transition-all" 
                  placeholder="Mín. 4 dígitos" 
                  value={formData.senha} 
                  onChange={e => setFormData({...formData, senha: e.target.value})} 
                  required={!customer}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
