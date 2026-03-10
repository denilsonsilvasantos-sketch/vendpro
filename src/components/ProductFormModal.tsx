import React, { useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Product } from '../types';
import { X, Upload } from 'lucide-react';

export default function ProductFormModal({ onClose, onSave, product }: { onClose: () => void, onSave: () => void, product?: Product }) {
  const [formData, setFormData] = useState(product || { nome: '', sku: '', preco_unitario: 0, imagem: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (product) {
      await supabase.from('products').update(formData).eq('id', product.id);
    } else {
      await supabase.from('products').insert([formData]);
    }
    setLoading(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full p-2 border rounded" placeholder="Nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
          <input className="w-full p-2 border rounded" placeholder="SKU" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required />
          <input type="number" className="w-full p-2 border rounded" placeholder="Preço" value={formData.preco_unitario} onChange={e => setFormData({...formData, preco_unitario: parseFloat(e.target.value)})} required />
          <button type="submit" className="w-full bg-primary text-white p-2 rounded" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </form>
      </div>
    </div>
  );
}
