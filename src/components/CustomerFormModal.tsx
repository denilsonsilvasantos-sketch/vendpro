import React, { useState } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Customer } from '../types';
import { X } from 'lucide-react';

export default function CustomerFormModal({ onClose, onSave, customer }: { onClose: () => void, onSave: () => void, customer?: Customer }) {
  const [formData, setFormData] = useState(customer || { empresa: '', telefone: '', cnpj: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!supabase) return;
    if (customer) {
      await supabase.from('customers').update(formData).eq('id', customer.id);
    } else {
      await supabase.from('customers').insert([formData]);
    }
    setLoading(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{customer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full p-2 border rounded" placeholder="Nome da Empresa" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} required />
          <input className="w-full p-2 border rounded" placeholder="Telefone" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
          <input className="w-full p-2 border rounded" placeholder="CNPJ" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
          <button type="submit" className="w-full bg-primary text-white p-2 rounded" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </form>
      </div>
    </div>
  );
}
