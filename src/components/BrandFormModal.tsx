import React, { useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Brand } from '../types';
import { X } from 'lucide-react';

export default function BrandFormModal({ onClose, onSave, brand }: { onClose: () => void, onSave: () => void, brand?: Brand }) {
  const [formData, setFormData] = useState<Partial<Brand>>(brand || { nome: '', margin_percentage: 0, minimum_order_value: 0, shipping_policy: '', free_shipping_threshold: 0, payment_methods: [] });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (brand) {
      await supabase.from('brands').update(formData).eq('id', brand.id);
    } else {
      await supabase.from('brands').insert([formData]);
    }
    setLoading(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{brand ? 'Editar Marca' : 'Nova Marca'}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full p-2 border rounded" placeholder="Nome da Marca" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
          <input type="number" className="w-full p-2 border rounded" placeholder="Margem (%)" value={formData.margin_percentage} onChange={e => setFormData({...formData, margin_percentage: parseFloat(e.target.value)})} />
          <input type="number" className="w-full p-2 border rounded" placeholder="Pedido Mínimo (R$)" value={formData.minimum_order_value} onChange={e => setFormData({...formData, minimum_order_value: parseFloat(e.target.value)})} />
          <textarea className="w-full p-2 border rounded" placeholder="Política de Frete" value={formData.shipping_policy} onChange={e => setFormData({...formData, shipping_policy: e.target.value})} />
          <input type="number" className="w-full p-2 border rounded" placeholder="Frete Grátis (R$)" value={formData.free_shipping_threshold} onChange={e => setFormData({...formData, free_shipping_threshold: parseFloat(e.target.value)})} />
          <button type="submit" className="w-full bg-primary text-white p-2 rounded" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </form>
      </div>
    </div>
  );
}
