import React, { useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Seller } from '../types';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function SellerFormModal({ onClose, onSave, seller, companyId }: { onClose: () => void, onSave: () => void, seller?: Seller, companyId: number | null }) {
  const [formData, setFormData] = useState<Partial<Seller>>(seller || { 
    nome: '', 
    codigo_vinculo: '', 
    whatsapp: '', 
    ativo: true 
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    if (!companyId) {
      alert("Erro: Empresa não identificada. Por favor, recarregue a página.");
      return;
    }

    setLoading(true);
    try {
      const dataToSave = { ...formData, company_id: companyId };
      
      if (seller?.id) {
        const { error } = await supabase.from('sellers').update(dataToSave).eq('id', seller.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sellers').insert([dataToSave]);
        if (error) throw error;
      }
      
      alert(seller?.id ? "Vendedor atualizado com sucesso!" : "Vendedor cadastrado com sucesso!");
      onSave();
    } catch (error: any) {
      console.error("Erro ao salvar vendedor:", error);
      alert("Erro ao salvar vendedor: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">{seller ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="seller-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome do Vendedor</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: João Silva" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Código de Acesso</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-mono uppercase" placeholder="Ex: JOAO123" value={formData.codigo_vinculo} onChange={e => setFormData({...formData, codigo_vinculo: e.target.value.toUpperCase()})} required />
                <p className="text-[10px] text-slate-400 mt-1">Este código será usado pelo vendedor para acessar o sistema.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="(00) 00000-0000" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input type="checkbox" id="ativo" className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} />
                <label htmlFor="ativo" className="font-medium text-slate-700 cursor-pointer select-none">Vendedor Ativo</label>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button type="submit" form="seller-form" disabled={loading} className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Salvando...' : 'Salvar Vendedor'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
