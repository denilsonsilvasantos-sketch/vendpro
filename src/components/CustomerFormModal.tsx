import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabaseClient';
import { Customer, Seller } from '../types';
import { X } from 'lucide-react';

export default function CustomerFormModal({ onClose, onSave, customer, companyId }: { onClose: () => void, onSave: () => void, customer?: Customer, companyId: string | null }) {
  const [formData, setFormData] = useState<any>(customer || { empresa: '', telefone: '', cnpj: '', ativo: true, seller_id: '' });
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);

  useEffect(() => {
    async function fetchSellers() {
      if (!supabase || !companyId) return;
      const { data } = await supabase.from('sellers').select('*').eq('company_id', companyId);
      setSellers(data || []);
    }
    fetchSellers();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!companyId) {
      alert('Erro: Empresa não identificada. Por favor, recarregue a página.');
      return;
    }
    setLoading(true);

    try {
      let error;
      const dataToSave = { ...formData };
      if (dataToSave.seller_id === '') {
        delete dataToSave.seller_id;
      }

      if (customer) {
        const { id, created_at, seller_nome, ...updateData } = dataToSave as any;
        const { error: updateError } = await supabase.from('customers').update(updateData).eq('id', customer.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('customers').insert([dataToSave]);
        error = insertError;
      }

      if (error) {
        console.error('Erro ao salvar cliente:', error);
        alert('Erro ao salvar cliente: ' + error.message);
      } else {
        alert('Cliente salvo com sucesso!');
        onSave();
        onClose();
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao salvar cliente.');
    } finally {
      setLoading(false);
    }
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
          
          <select 
            className="w-full p-2 border rounded" 
            value={formData.seller_id || ''} 
            onChange={e => setFormData({...formData, seller_id: e.target.value ? parseInt(e.target.value) : ''})}
            required
          >
            <option value="">Selecione um Vendedor</option>
            {sellers.map(s => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>

          <button type="submit" className="w-full bg-primary text-white p-2 rounded" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </form>
      </div>
    </div>
  );
}
