import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Save, Building2, Phone, Mail, MapPin, Loader2 } from 'lucide-react';

export default function Configuracoes({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    async function loadCompany() {
      if (!supabase) return;
      setLoading(true);
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
      if (data) setCompany(data);
      setLoading(false);
    }
    loadCompany();
  }, [companyId]);

  const handleSave = async () => {
    if (!supabase || !company) return;
    setSaving(true);
    const { error } = await supabase.from('companies').update({
      nome: company.nome,
      cnpj: company.cnpj,
      responsavel: company.responsavel,
      telefone: company.telefone,
      minimum_order_value: company.minimum_order_value,
      payment_policy: company.payment_policy,
      shipping_policy: company.shipping_policy,
    }).eq('id', companyId);
    
    setSaving(false);
    if (error) {
      alert('Erro ao salvar configurações');
    } else {
      alert('Configurações salvas com sucesso!');
    }
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!company) return null;

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Building2 size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dados da Empresa</h2>
          <p className="text-sm text-slate-500">Informações e políticas comerciais</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome da Empresa</label>
          <input 
            type="text" 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            value={company.nome || ''}
            onChange={e => setCompany({...company, nome: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CNPJ</label>
            <input 
              type="text" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium focus:ring-2 focus:ring-primary/20 outline-none"
              value={company.cnpj || ''}
              onChange={e => setCompany({...company, cnpj: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone</label>
            <input 
              type="text" 
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium focus:ring-2 focus:ring-primary/20 outline-none"
              value={company.telefone || ''}
              onChange={e => setCompany({...company, telefone: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Responsável</label>
          <input 
            type="text" 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            value={company.responsavel || ''}
            onChange={e => setCompany({...company, responsavel: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pedido Mínimo (R$)</label>
          <input 
            type="number" 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            value={company.minimum_order_value || 0}
            onChange={e => setCompany({...company, minimum_order_value: Number(e.target.value)})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Política de Pagamento</label>
          <textarea 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
            value={company.payment_policy || ''}
            onChange={e => setCompany({...company, payment_policy: e.target.value})}
            placeholder="Ex: Pagamento via PIX com 5% de desconto..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Política de Envio</label>
          <textarea 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
            value={company.shipping_policy || ''}
            onChange={e => setCompany({...company, shipping_policy: e.target.value})}
            placeholder="Ex: Frete grátis para compras acima de R$ 500,00..."
          />
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-50"
      >
        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
        Salvar Configurações
      </button>
    </div>
  );
}
