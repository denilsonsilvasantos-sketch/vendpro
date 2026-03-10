import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Settings, Building2, Phone, Mail, FileText, Save, Loader2 } from 'lucide-react';

export default function Configuracoes({ companyId }: { companyId: string | null }) {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: ''
  });

  useEffect(() => {
    async function fetchCompany() {
      if (!supabase || companyId === null) return;
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
      if (data) {
        setCompany(data);
        setFormData({
          nome: data.nome || ''
        });
      }
      setLoading(false);
    }
    fetchCompany();
  }, [companyId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !companyId) return;
    setSaving(true);
    const { error } = await supabase.from('companies').update(formData).eq('id', companyId);
    if (error) {
      alert('Erro ao salvar configurações: ' + error.message);
    } else {
      alert('Configurações salvas com sucesso!');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Settings size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-slate-500 text-sm">Gerencie as informações da sua empresa e políticas de venda.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center gap-3">
            <Building2 className="text-primary" size={20} />
            <h2 className="font-bold text-slate-900">Informações da Empresa</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome da Empresa</label>
              <input 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" 
                value={formData.nome} 
                onChange={e => setFormData({...formData, nome: e.target.value})} 
                required 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="bg-primary text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
