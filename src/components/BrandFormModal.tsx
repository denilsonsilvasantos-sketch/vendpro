import React, { useState, useRef } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand } from '../types';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

export default function BrandFormModal({ onClose, onSave, brand, companyId }: { onClose: () => void, onSave: () => void, brand?: Brand, companyId: string | null }) {
  const [formData, setFormData] = useState<Partial<Brand>>(brand || { 
    name: '', 
    margin_percentage: 0, 
    minimum_order_value: 0, 
    shipping_policy: '', 
    payment_policy: '',
    stock_policy: ''
  });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!companyId) {
      alert('Erro: Empresa não identificada. Por favor, recarregue a página.');
      return;
    }
    setLoading(true);
    
    const dataToSave = { ...formData, company_id: companyId };
    delete dataToSave.logo_url;
    
    try {
      let error;
      if (brand) {
        const { id, created_at, ...updateData } = dataToSave as any;
        const { error: updateError } = await supabase.from('brands').update(updateData).eq('id', brand.id);
        error = updateError;
      } else {
        // Get max order_index
        const { data: existingBrands } = await supabase.from('brands').select('order_index').eq('company_id', companyId);
        const nextIndex = existingBrands && existingBrands.length > 0 
          ? Math.max(...existingBrands.map(b => b.order_index || 0)) + 1 
          : 0;
          
        const insertData: any = { ...dataToSave, order_index: nextIndex };
        const { error: insertError } = await supabase.from('brands').insert([insertData]);
        
        if (insertError && insertError.message?.includes('order_index does not exist')) {
          delete insertData.order_index;
          const retry = await supabase.from('brands').insert([insertData]);
          error = retry.error;
        } else {
          error = insertError;
        }
      }

      if (error) {
        console.error('Erro ao salvar marca:', error);
        alert('Erro ao salvar marca: ' + error.message);
      } else {
        alert('Marca salva com sucesso!');
        onSave();
        onClose();
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao salvar marca.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">{brand ? 'Editar Marca' : 'Nova Marca'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome da Marca</label>
              <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Nike, Adidas..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Margem de Venda (%)</label>
                <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0.00" value={formData.margin_percentage} onChange={e => setFormData({...formData, margin_percentage: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Pedido Mínimo (R$)</label>
                <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="0.00" value={formData.minimum_order_value} onChange={e => setFormData({...formData, minimum_order_value: parseFloat(e.target.value)})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Política de Frete</label>
              <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]" placeholder="Descreva as condições de frete..." value={formData.shipping_policy} onChange={e => setFormData({...formData, shipping_policy: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Política de Pagamento</label>
              <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]" placeholder="Ex: 30/60/90 dias, à vista 5% desconto..." value={formData.payment_policy} onChange={e => setFormData({...formData, payment_policy: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Política de Estoque</label>
              <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]" placeholder="Ex: Pronta entrega, sob encomenda..." value={formData.stock_policy} onChange={e => setFormData({...formData, stock_policy: e.target.value})} />
            </div>
          </div>

          <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mx-auto" /> : (brand ? 'Atualizar Marca' : 'Cadastrar Marca')}
          </button>
        </form>
      </div>
    </div>
  );
}
